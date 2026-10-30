import { mysqlPool } from '../config/mysql.js';
import { getPropertyDetails } from '../config/mongo.js';
import { serializeListing } from '../serializers/listing.serializer.js';

const BASE_LISTING_SELECT = `
  SELECT 
    l.*,
    c.name AS city_name,
    c.state AS city_state,
    o.full_name AS owner_name,
    o.phone AS owner_phone,
    pa.partner_id AS assigned_partner_id,
    pa_u.full_name AS assigned_partner_name,
    pa_pp.zone AS assigned_partner_zone,
    pa_pp.badge_number AS assigned_partner_badge,
    pa.assigned_at AS assigned_at,
    vb_u.full_name AS verified_by_name,
    vb_pp.badge_number AS verified_by_badge,
    fb_u.full_name AS flagged_by_name
  FROM listings l
  JOIN cities c ON c.id = l.city_id
  JOIN users o ON o.id = l.owner_id
  LEFT JOIN partner_assignments pa ON pa.id = (
    SELECT pa2.id FROM partner_assignments pa2 
    WHERE pa2.listing_id = l.id 
    ORDER BY (pa2.status = 'active') DESC, pa2.assigned_at DESC 
    LIMIT 1
  )
  LEFT JOIN users pa_u ON pa_u.id = pa.partner_id
  LEFT JOIN partner_profiles pa_pp ON pa_pp.user_id = pa.partner_id
  LEFT JOIN users vb_u ON vb_u.id = l.verified_by
  LEFT JOIN partner_profiles vb_pp ON vb_pp.user_id = l.verified_by
  LEFT JOIN users fb_u ON fb_u.id = l.flagged_by
`;

/**
 * Fetch child rows (documents, field audits, feedback) in bulk from MySQL
 * and matching MongoDB property_details documents in ONE query ($in).
 *
 * @param {Array<string>} ids - Array of listing UUIDs
 * @returns {Promise<{
 *   docsMap: Map<string, Array<object>>,
 *   auditsMap: Map<string, object>,
 *   feedbackMap: Map<string, Array<object>>,
 *   mongoMap: Map<string, object>
 * }>}
 */
async function fetchEnrichedDataForIds(ids) {
  if (!ids || ids.length === 0) {
    return {
      docsMap: new Map(),
      auditsMap: new Map(),
      feedbackMap: new Map(),
      mongoMap: new Map(),
    };
  }

  const placeholders = ids.map(() => '?').join(', ');

  // 1. Fetch documents in bulk
  const [docRows] = await mysqlPool.query(
    `SELECT * FROM listing_documents WHERE listing_id IN (${placeholders}) ORDER BY id ASC`,
    ids
  );
  const docsMap = new Map();
  for (const doc of docRows) {
    if (!docsMap.has(doc.listing_id)) docsMap.set(doc.listing_id, []);
    docsMap.get(doc.listing_id).push(doc);
  }

  // 2. Fetch latest field audits in bulk
  const [auditRows] = await mysqlPool.query(
    `SELECT 
       fa.*, 
       u.full_name AS partner_name, 
       pp.badge_number 
     FROM field_audits fa 
     JOIN users u ON u.id = fa.partner_id 
     LEFT JOIN partner_profiles pp ON pp.user_id = fa.partner_id 
     WHERE fa.listing_id IN (${placeholders}) 
     ORDER BY fa.id DESC`,
    ids
  );
  const auditsMap = new Map();
  for (const audit of auditRows) {
    // Keep latest audit per listing
    if (!auditsMap.has(audit.listing_id)) {
      auditsMap.set(audit.listing_id, audit);
    }
  }

  // 3. Fetch feedback in bulk
  const [feedbackRows] = await mysqlPool.query(
    `SELECT 
       fb.*, 
       u.full_name AS user_name 
     FROM feedback fb 
     JOIN users u ON u.id = fb.user_id 
     WHERE fb.listing_id IN (${placeholders}) 
     ORDER BY fb.created_at DESC`,
    ids
  );
  const feedbackMap = new Map();
  for (const fb of feedbackRows) {
    if (!feedbackMap.has(fb.listing_id)) feedbackMap.set(fb.listing_id, []);
    feedbackMap.get(fb.listing_id).push(fb);
  }

  // 4. Fetch MongoDB property_details documents in ONE query ($in)
  const mongoDocs = await getPropertyDetails()
    .find({ _id: { $in: ids } })
    .toArray();
  const mongoMap = new Map(mongoDocs.map((doc) => [doc._id, doc]));

  return { docsMap, auditsMap, feedbackMap, mongoMap };
}

/**
 * Search and list listings with filtering, sorting, and pagination.
 *
 * @param {object} filters
 * @returns {Promise<{ total: number, limit: number, offset: number, listings: Array<object> }>}
 */
export async function searchListings(filters = {}) {
  const conditions = [];
  const params = [];

  // 5. Exclude flagged listings from the public list
  // TODO: Allow admins to view flagged listings when auth middleware is integrated
  conditions.push("l.status <> 'flagged'");

  // City filter
  if (filters.city && filters.city.toLowerCase() !== 'all') {
    conditions.push('c.name = ?');
    params.push(filters.city);
  }

  // Property types filter (comma-delimited string, e.g. "1RK,2BHK")
  if (filters.types) {
    const rawTypes = filters.types
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (rawTypes.length > 0) {
      const typePlaceholders = rawTypes.map(() => '?').join(', ');
      conditions.push(`l.property_type IN (${typePlaceholders})`);
      params.push(...rawTypes);
    }
  }

  // Max rent filter
  if (filters.maxRent != null && filters.maxRent > 0) {
    conditions.push('l.rent_inr <= ?');
    params.push(filters.maxRent);
  }

  // Verified only filter
  if (filters.verifiedOnly) {
    conditions.push("l.status = 'verified'");
  }

  // Locality filter
  if (filters.locality) {
    conditions.push('l.locality = ?');
    params.push(filters.locality);
  }

  // Text search (title, locality)
  if (filters.q && filters.q.trim()) {
    const term = `%${filters.q.trim()}%`;
    conditions.push('(l.title LIKE ? OR l.locality LIKE ?)');
    params.push(term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Determine SQL ORDER BY
  let orderByClause = '';
  switch (filters.sort) {
    case 'price-asc':
      orderByClause = 'ORDER BY l.rent_inr ASC';
      break;
    case 'price-desc':
      orderByClause = 'ORDER BY l.rent_inr DESC';
      break;
    case 'safety':
      // Safety score resides in MongoDB; we fetch candidates and apply final sort in-memory
      orderByClause = 'ORDER BY (l.status = \'verified\') DESC, l.credibility_score DESC, l.rent_inr ASC';
      break;
    case 'recommender':
    default:
      // Recommender sort matching CustomerHome.jsx: verified first, then credibilityScore DESC, then rent ASC
      orderByClause = `
        ORDER BY 
          (l.status = 'verified') DESC, 
          COALESCE(l.credibility_score, 50) DESC, 
          l.rent_inr ASC
      `;
      break;
  }

  // 1. Get total count
  const countSql = `
    SELECT COUNT(*) AS total 
    FROM listings l 
    JOIN cities c ON c.id = l.city_id 
    ${whereClause}
  `;
  const [countResult] = await mysqlPool.query(countSql, params);
  const total = Number(countResult[0]?.total || 0);

  // 2. Fetch paginated listing rows from MySQL
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const dataSql = `
    ${BASE_LISTING_SELECT}
    ${whereClause}
    ${orderByClause}
    LIMIT ? OFFSET ?
  `;
  const [listingRows] = await mysqlPool.query(dataSql, [...params, limit, offset]);

  if (listingRows.length === 0) {
    return { total, limit, offset, listings: [] };
  }

  const ids = listingRows.map((r) => r.id);

  // 3. Fetch MongoDB documents & child MySQL records in bulk
  const { docsMap, auditsMap, feedbackMap, mongoMap } = await fetchEnrichedDataForIds(ids);

  // 4. Merge in memory
  const listings = listingRows.map((row) =>
    serializeListing(
      row,
      mongoMap.get(row.id) || null,
      docsMap.get(row.id) || [],
      auditsMap.get(row.id) || null,
      feedbackMap.get(row.id) || []
    )
  );

  // 5. If safety sort was requested, sort by safetyScore descending in memory
  if (filters.sort === 'safety') {
    listings.sort((a, b) => (b.safetyScore ?? 0) - (a.safetyScore ?? 0));
  }

  return {
    total,
    limit,
    offset,
    listings,
  };
}

/**
 * Retrieve a single listing by its primary UUID.
 *
 * @param {string} id - Lowercase UUID of the listing
 * @returns {Promise<object|null>} Serialized listing JSON or null if not found
 */
export async function getListingById(id) {
  const sql = `
    ${BASE_LISTING_SELECT}
    WHERE l.id = ?
    LIMIT 1
  `;
  const [rows] = await mysqlPool.query(sql, [id]);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  const { docsMap, auditsMap, feedbackMap, mongoMap } = await fetchEnrichedDataForIds([id]);

  return serializeListing(
    row,
    mongoMap.get(id) || null,
    docsMap.get(id) || [],
    auditsMap.get(id) || null,
    feedbackMap.get(id) || []
  );
}

/**
 * Retrieve all listings owned by a specific vendor.
 * Includes all statuses (pending, in-review, verified, flagged).
 *
 * @param {string} vendorId - UUID of the vendor user
 * @returns {Promise<Array<object>>}
 */
export async function getVendorListings(vendorId) {
  const sql = `
    ${BASE_LISTING_SELECT}
    WHERE l.owner_id = ?
    ORDER BY l.submitted_at DESC
  `;
  const [rows] = await mysqlPool.query(sql, [vendorId]);

  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((r) => r.id);
  const { docsMap, auditsMap, feedbackMap, mongoMap } = await fetchEnrichedDataForIds(ids);

  return rows.map((row) =>
    serializeListing(
      row,
      mongoMap.get(row.id) || null,
      docsMap.get(row.id) || [],
      auditsMap.get(row.id) || null,
      feedbackMap.get(row.id) || []
    )
  );
}

/**
 * Retrieve a specific listing owned by the vendor.
 * Returns null if not found or if owned by someone else.
 *
 * @param {string} id - Listing UUID
 * @param {string} vendorId - Vendor user UUID
 * @returns {Promise<object|null>}
 */
export async function getVendorListingById(id, vendorId) {
  const sql = `
    ${BASE_LISTING_SELECT}
    WHERE l.id = ? AND l.owner_id = ?
    LIMIT 1
  `;
  const [rows] = await mysqlPool.query(sql, [id, vendorId]);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  const { docsMap, auditsMap, feedbackMap, mongoMap } = await fetchEnrichedDataForIds([id]);

  return serializeListing(
    row,
    mongoMap.get(id) || null,
    docsMap.get(id) || [],
    auditsMap.get(id) || null,
    feedbackMap.get(id) || []
  );
}
