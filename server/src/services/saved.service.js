import { mysqlPool } from '../config/mysql.js';
import { getPropertyDetails } from '../config/mongo.js';
import { serializeListing } from '../serializers/listing.serializer.js';
import { HttpError } from '../utils/httpError.js';

/**
 * Get all listings saved by the logged-in customer.
 *
 * @param {string} userId
 * @returns {Promise<Array<object>>}
 */
export async function getSavedListings(userId) {
  const [rows] = await mysqlPool.query(
    `SELECT 
      l.*,
      c.name AS city_name, c.state AS city_state, c.code AS city_code,
      u.full_name AS owner_name, u.phone AS owner_phone, u.designation AS owner_designation,
      pu.full_name AS assigned_partner_name,
      pp.badge_number AS assigned_partner_badge,
      pp.zone AS assigned_partner_zone,
      vu.full_name AS verified_by_name,
      vp.badge_number AS verified_by_badge,
      sl.created_at AS saved_at
    FROM saved_listings sl
    JOIN listings l ON l.id = sl.listing_id
    JOIN cities c ON c.id = l.city_id
    JOIN users u ON u.id = l.owner_id
    LEFT JOIN partner_assignments pa ON pa.listing_id = l.id AND pa.status = 'active'
    LEFT JOIN users pu ON pu.id = pa.partner_id
    LEFT JOIN partner_profiles pp ON pp.user_id = pu.id
    LEFT JOIN users vu ON vu.id = l.verified_by
    LEFT JOIN partner_profiles vp ON vp.user_id = vu.id
    WHERE sl.user_id = ?
    ORDER BY sl.created_at DESC`,
    [userId]
  );

  if (rows.length === 0) {
    return [];
  }

  const listingIds = rows.map((r) => r.id);

  // Documents
  const placeholders = listingIds.map(() => '?').join(',');
  const [docRows] = await mysqlPool.query(
    `SELECT id, listing_id, doc_type, doc_number_last4, review_status, review_note,
            reviewed_by, reviewed_at, storage_key, mime_type, size_bytes, uploaded_at
     FROM listing_documents
     WHERE listing_id IN (${placeholders})
     ORDER BY uploaded_at ASC`,
    listingIds
  );
  const docsMap = new Map();
  for (const doc of docRows) {
    if (!docsMap.has(doc.listing_id)) docsMap.set(doc.listing_id, []);
    docsMap.get(doc.listing_id).push(doc);
  }

  // MongoDB details
  const propDetailsCol = getPropertyDetails();
  const mongoDocs = await propDetailsCol.find({ _id: { $in: listingIds } }).toArray();
  const mongoDocsMap = new Map(mongoDocs.map((doc) => [doc._id, doc]));

  return rows.map((row) => {
    const mongoDoc = mongoDocsMap.get(row.id) || null;
    const docs = docsMap.get(row.id) || [];
    const item = serializeListing(row, mongoDoc, docs, null, []);
    return {
      ...item,
      savedAt: row.saved_at ? new Date(row.saved_at).toISOString() : null,
    };
  });
}

/**
 * Save a listing for the customer (idempotent).
 *
 * @param {string} userId
 * @param {string} listingId
 * @returns {Promise<{ success: boolean, saved: boolean, listingId: string }>}
 */
export async function saveListing(userId, listingId) {
  // Check that the listing exists
  const [listings] = await mysqlPool.query(
    'SELECT id FROM listings WHERE id = ?',
    [listingId]
  );

  if (listings.length === 0) {
    throw new HttpError(404, 'Listing not found');
  }

  // Idempotent insert
  await mysqlPool.query(
    `INSERT IGNORE INTO saved_listings
      (user_id, user_role, listing_id, is_synthetic, data_source)
     VALUES
      (?, 'customer', ?, 0, 'app')`,
    [userId, listingId]
  );

  return {
    success: true,
    saved: true,
    listingId,
  };
}

/**
 * Remove a saved listing for the customer (idempotent).
 *
 * @param {string} userId
 * @param {string} listingId
 * @returns {Promise<{ success: boolean, saved: boolean, listingId: string }>}
 */
export async function unsaveListing(userId, listingId) {
  await mysqlPool.query(
    'DELETE FROM saved_listings WHERE user_id = ? AND listing_id = ?',
    [userId, listingId]
  );

  return {
    success: true,
    saved: false,
    listingId,
  };
}
