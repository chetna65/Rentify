import { mysqlPool } from '../config/mysql.js';

/**
 * Calculates the mathematical median of an array of numbers.
 *
 * @param {number[]} numbers
 * @returns {number|null}
 */
export function calculateMedian(numbers) {
  if (!numbers || numbers.length === 0) return null;
  const sorted = [...numbers].filter((n) => typeof n === 'number' && !isNaN(n)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Computes rule-based fraud detection signals for a listing.
 * Evaluates:
 * 1. Rent > 50% below median rent for the same city, locality, and property type.
 * 2. Same owner phone or document (doc_type + last4) reused across multiple active listings.
 * 3. Same file SHA-256 reused across listings.
 * 4. Deposit exceeds 3 months of rent.
 * 5. Owner-name vs document mismatch advisory flag for manual review.
 *
 * @param {string} listingId - UUID of the listing
 * @param {object} [connection] - Optional MySQL connection (e.g. within an active transaction)
 * @returns {Promise<Array<{ code: string, severity: 'high'|'medium'|'low', message: string }>>}
 */
export async function computeFraudSignals(listingId, connection = null) {
  const db = connection || mysqlPool;
  const signals = [];

  // 1. Fetch listing details along with city and owner metadata
  const [listingRows] = await db.query(
    `SELECT l.*, c.name AS city_name, u.phone AS owner_phone, u.full_name AS owner_name
     FROM listings l
     JOIN cities c ON c.id = l.city_id
     JOIN users u ON u.id = l.owner_id
     WHERE l.id = ?
     LIMIT 1`,
    [listingId]
  );

  if (!listingRows || listingRows.length === 0) {
    return signals;
  }

  const listing = listingRows[0];

  // 2. Fetch associated documents for this listing
  const [docRows] = await db.query(
    `SELECT id, doc_type, doc_number_last4, file_sha256, storage_key
     FROM listing_documents
     WHERE listing_id = ?`,
    [listingId]
  );

  // -------------------------------------------------------------------------
  // RULE 1: Rent more than 50% below median rent for same city, locality & property type
  // -------------------------------------------------------------------------
  let [comparables] = await db.query(
    `SELECT rent_inr 
     FROM listings 
     WHERE city_id = ? 
       AND LOWER(TRIM(locality)) = LOWER(TRIM(?)) 
       AND property_type = ? 
       AND status <> 'flagged'`,
    [listing.city_id, listing.locality, listing.property_type]
  );

  // If fewer than 2 listings in the immediate locality, fall back to city-wide median for the property type
  if (comparables.length < 2) {
    const [cityComparables] = await db.query(
      `SELECT rent_inr 
       FROM listings 
       WHERE city_id = ? 
         AND property_type = ? 
         AND status <> 'flagged'`,
      [listing.city_id, listing.property_type]
    );
    if (cityComparables.length >= 2) {
      comparables = cityComparables;
    }
  }

  const rents = comparables.map((r) => Number(r.rent_inr)).filter((r) => r > 0);
  const medianRent = calculateMedian(rents);

  if (medianRent != null && listing.rent_inr < 0.5 * medianRent) {
    const pctBelow = Math.round(((medianRent - listing.rent_inr) / medianRent) * 100);
    signals.push({
      code: 'RENT_BELOW_MEDIAN',
      severity: 'high',
      message: `Rent of ₹${listing.rent_inr.toLocaleString()} is ${pctBelow}% below the median rent (₹${Math.round(medianRent).toLocaleString()}) for ${listing.property_type} in ${listing.locality}, ${listing.city_name}.`,
    });
  }

  // -------------------------------------------------------------------------
  // RULE 2: Same owner phone OR document last4 + type reused across multiple active listings
  // Active listing statuses: 'pending', 'in-review', 'verified'
  // -------------------------------------------------------------------------
  // 2A: Owner phone reused across multiple active listings
  if (listing.owner_phone) {
    const [phoneMatches] = await db.query(
      `SELECT COUNT(DISTINCT l.id) AS active_count
       FROM listings l
       JOIN users u ON l.owner_id = u.id
       WHERE u.phone = ?
         AND l.id != ?
         AND l.status IN ('pending', 'in-review', 'verified')`,
      [listing.owner_phone, listingId]
    );

    const otherPhoneActiveCount = Number(phoneMatches[0]?.active_count || 0);
    if (otherPhoneActiveCount > 0) {
      signals.push({
        code: 'OWNER_PHONE_REUSED',
        severity: 'medium',
        message: `Owner phone ${listing.owner_phone} is associated with ${otherPhoneActiveCount} other active listing(s).`,
      });
    }
  }

  // 2B: Document last4 + doc_type reused across multiple active listings
  for (const doc of docRows) {
    if (doc.doc_number_last4 && doc.doc_type) {
      const [docMatches] = await db.query(
        `SELECT COUNT(DISTINCT l.id) AS reuse_count
         FROM listing_documents ld
         JOIN listings l ON ld.listing_id = l.id
         WHERE ld.doc_type = ?
           AND ld.doc_number_last4 = ?
           AND l.id != ?
           AND l.status IN ('pending', 'in-review', 'verified')`,
        [doc.doc_type, doc.doc_number_last4, listingId]
      );

      const docReuseCount = Number(docMatches[0]?.reuse_count || 0);
      if (docReuseCount > 0) {
        signals.push({
          code: 'DOC_LAST4_REUSED',
          severity: 'high',
          message: `Document "${doc.doc_type}" with number ending in "${doc.doc_number_last4}" is reused across ${docReuseCount} other active listing(s).`,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // RULE 3: Same file SHA-256 reused across listings
  // -------------------------------------------------------------------------
  const shaHashes = docRows
    .map((d) => d.file_sha256)
    .filter(Boolean);

  if (shaHashes.length > 0) {
    const placeholders = shaHashes.map(() => '?').join(', ');
    const [shaMatches] = await db.query(
      `SELECT ld.file_sha256, ld.doc_type, COUNT(DISTINCT ld.listing_id) AS matched_count
       FROM listing_documents ld
       WHERE ld.file_sha256 IN (${placeholders})
         AND ld.listing_id != ?
       GROUP BY ld.file_sha256, ld.doc_type`,
      [...shaHashes, listingId]
    );

    for (const match of shaMatches) {
      const matchCount = Number(match.matched_count || 0);
      if (matchCount > 0) {
        signals.push({
          code: 'FILE_SHA256_REUSED',
          severity: 'high',
          message: `File SHA-256 hash (${match.file_sha256.slice(0, 12)}...) for "${match.doc_type}" is reused across ${matchCount} other listing(s).`,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // RULE 4: Deposit above 3 months of rent
  // -------------------------------------------------------------------------
  if (listing.deposit_inr && listing.rent_inr && listing.deposit_inr > 3 * listing.rent_inr) {
    const ratio = (listing.deposit_inr / listing.rent_inr).toFixed(1);
    signals.push({
      code: 'EXCESSIVE_DEPOSIT',
      severity: 'medium',
      message: `Security deposit of ₹${listing.deposit_inr.toLocaleString()} is ${ratio}x monthly rent (₹${listing.rent_inr.toLocaleString()}), exceeding the 3-month threshold.`,
    });
  }

  // -------------------------------------------------------------------------
  // RULE 5: Owner-name vs document mismatch left as a manual-review flag
  // -------------------------------------------------------------------------
  signals.push({
    code: 'OWNER_NAME_DOC_MANUAL_REVIEW',
    severity: 'low',
    message: `Owner name "${listing.owner_name}" vs. deed titleholder requires manual registrar verification.`,
  });

  return signals;
}
