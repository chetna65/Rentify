import { mysqlPool, withTransaction } from '../config/mysql.js';
import { getPropertyDetails } from '../config/mongo.js';
import { generateUniqueSeal } from './seal.service.js';
import { calculateCredibilityScore } from './credibility.service.js';
import { serializeListing } from '../serializers/listing.serializer.js';
import { HttpError } from '../utils/httpError.js';

/**
 * Fetch listings queue for admin filtered by status.
 *
 * @param {Object} options
 * @param {'pending'|'in-review'|'verified'|'flagged'} [options.status='pending']
 * @param {number} [options.limit=50]
 * @param {number} [options.offset=0]
 * @returns {Promise<{ total: number, listings: Array<object> }>}
 */
export async function getAdminQueue({ status = 'pending', limit = 50, offset = 0 }) {
  // Count total matching
  const [countRows] = await mysqlPool.query(
    'SELECT COUNT(*) as total FROM listings WHERE status = ?',
    [status]
  );
  const total = Number(countRows[0]?.total || 0);

  if (total === 0) {
    return { total: 0, listings: [] };
  }

  // Pending listings are ordered oldest first; others newest first
  const orderClause = status === 'pending' ? 'ORDER BY l.submitted_at ASC' : 'ORDER BY l.submitted_at DESC';

  const [rows] = await mysqlPool.query(
    `SELECT 
      l.id, l.legacy_ref, l.owner_id, l.owner_role, l.city_id, l.locality, l.title,
      l.property_type, l.rent_inr, l.deposit_inr, l.furnishing, l.carpet_area_sqft,
      l.floor_label, l.owner_capacity, l.status, l.seal_id, l.submitted_at,
      l.verified_at, l.verified_by, l.flagged_at, l.flagged_by, l.flag_category,
      l.flag_reason, l.credibility_score, l.rating_avg, l.rating_count, l.version,
      c.name AS city_name, c.state AS city_state, c.code AS city_code,
      u.full_name AS owner_name, u.phone AS owner_phone, u.designation AS owner_designation,
      pa.id AS assigned_partner_assignment_id,
      pa.partner_id AS assigned_partner_id,
      pu.full_name AS assigned_partner_name,
      pp.badge_number AS assigned_partner_badge,
      pp.zone AS assigned_partner_zone,
      pa.scheduled_for AS assigned_partner_scheduled_for,
      pa.admin_notes AS assigned_partner_notes,
      vu.full_name AS verified_by_name,
      vp.badge_number AS verified_by_badge
    FROM listings l
    JOIN cities c ON c.id = l.city_id
    JOIN users u ON u.id = l.owner_id
    LEFT JOIN partner_assignments pa ON pa.listing_id = l.id AND pa.status = 'active'
    LEFT JOIN users pu ON pu.id = pa.partner_id
    LEFT JOIN partner_profiles pp ON pp.user_id = pu.id
    LEFT JOIN users vu ON vu.id = l.verified_by
    LEFT JOIN partner_profiles vp ON vp.user_id = vu.id
    WHERE l.status = ?
    ${orderClause}
    LIMIT ? OFFSET ?`,
    [status, Number(limit), Number(offset)]
  );

  const listingIds = rows.map((r) => r.id);

  // 1. Fetch child documents
  let documentsByListing = new Map();
  if (listingIds.length > 0) {
    const placeholders = listingIds.map(() => '?').join(',');
    const [docRows] = await mysqlPool.query(
      `SELECT id, listing_id, doc_type, doc_number_last4, review_status, review_note,
              reviewed_by, reviewed_at, storage_key, mime_type, size_bytes, uploaded_at
       FROM listing_documents
       WHERE listing_id IN (${placeholders})
       ORDER BY uploaded_at ASC`,
      listingIds
    );
    for (const doc of docRows) {
      if (!documentsByListing.has(doc.listing_id)) {
        documentsByListing.set(doc.listing_id, []);
      }
      documentsByListing.get(doc.listing_id).push(doc);
    }
  }

  // 2. Fetch field audits
  let fieldAuditsByListing = new Map();
  if (listingIds.length > 0) {
    const placeholders = listingIds.map(() => '?').join(',');
    const [auditRows] = await mysqlPool.query(
      `SELECT fa.*, u.full_name AS partner_name, pp.badge_number
       FROM field_audits fa
       JOIN users u ON u.id = fa.partner_id
       LEFT JOIN partner_profiles pp ON pp.user_id = u.id
       WHERE fa.listing_id IN (${placeholders})
       ORDER BY fa.created_at DESC`,
      listingIds
    );
    for (const fa of auditRows) {
      if (!fieldAuditsByListing.has(fa.listing_id)) {
        fieldAuditsByListing.set(fa.listing_id, fa);
      }
    }
  }

  // 3. Fetch MongoDB documents in one batch ($in)
  const propDetailsCol = getPropertyDetails();
  const mongoDocs = await propDetailsCol.find({ _id: { $in: listingIds } }).toArray();
  const mongoDocsMap = new Map(mongoDocs.map((doc) => [doc._id, doc]));

  // 4. Serialize
  const serialized = rows.map((row) => {
    const mongoDoc = mongoDocsMap.get(row.id) || null;
    const docs = documentsByListing.get(row.id) || [];
    const audit = fieldAuditsByListing.get(row.id) || null;
    const item = serializeListing(row, mongoDoc, docs, audit, []);

    // Include queue-specific management metadata
    return {
      ...item,
      activeAssignment: row.assigned_partner_assignment_id
        ? {
            id: row.assigned_partner_assignment_id,
            partnerId: row.assigned_partner_id,
            partnerName: row.assigned_partner_name,
            badgeNumber: row.assigned_partner_badge,
            zone: row.assigned_partner_zone,
            scheduledFor: row.assigned_partner_scheduled_for,
            notes: row.assigned_partner_notes,
          }
        : null,
    };
  });

  return { total, listings: serialized };
}

/**
 * Assign a field partner to inspect a listing.
 *
 * Rules:
 * - listing must be pending
 * - partner must be active, role = partner, and partner's city must match listing's city
 * - inserts partner_assignments row (status active)
 * - updates listing status pending -> in-review
 * - updates document review_status to admin_checked with reviewed_by/at
 * - audits ADMIN_ASSIGNED_PARTNER
 *
 * @param {Object} params
 * @param {string} params.listingId
 * @param {string} params.partnerId
 * @param {string|null} [params.scheduledFor]
 * @param {string|null} [params.notes]
 * @param {Object} params.adminUser
 * @param {string} [params.idempotencyKey]
 * @returns {Promise<object>} Result
 */
export async function assignPartner({
  listingId,
  partnerId,
  scheduledFor = null,
  notes = null,
  adminUser,
  idempotencyKey,
}) {
  return await withTransaction(async (conn) => {
    // 1. Lock and load the listing
    const [listings] = await conn.query(
      `SELECT l.*, c.name AS city_name, c.code AS city_code
       FROM listings l
       JOIN cities c ON c.id = l.city_id
       WHERE l.id = ? FOR UPDATE`,
      [listingId]
    );

    if (listings.length === 0) {
      throw new HttpError(404, 'Listing not found');
    }
    const listing = listings[0];

    // Status check in code for clear, friendly error
    if (listing.status !== 'pending') {
      throw new HttpError(
        409,
        `Cannot assign partner: listing status is '${listing.status}' (expected 'pending')`
      );
    }

    // 2. Validate partner
    const [partners] = await conn.query(
      `SELECT u.id, u.full_name, u.role, u.is_active, pp.city_id, pp.badge_number, pp.zone, c.name AS city_name
       FROM users u
       JOIN partner_profiles pp ON pp.user_id = u.id
       JOIN cities c ON c.id = pp.city_id
       WHERE u.id = ? AND u.role = 'partner'`,
      [partnerId]
    );

    if (partners.length === 0 || !partners[0].is_active) {
      throw new HttpError(400, 'Selected partner is invalid or inactive');
    }
    const partner = partners[0];

    // City match check
    if (partner.city_id !== listing.city_id) {
      throw new HttpError(
        400,
        `City mismatch: Partner belongs to ${partner.city_name} (ID: ${partner.city_id}), but listing is in ${listing.city_name} (ID: ${listing.city_id})`
      );
    }

    // Check for existing active assignment
    const [existingActive] = await conn.query(
      'SELECT id FROM partner_assignments WHERE listing_id = ? AND status = ? LIMIT 1',
      [listingId, 'active']
    );
    if (existingActive.length > 0) {
      throw new HttpError(409, 'Listing already has an active partner assignment');
    }

    // 3. Insert partner_assignments row
    const [assignResult] = await conn.query(
      `INSERT INTO partner_assignments
        (listing_id, partner_id, partner_role, assigned_by, assigner_role, status, scheduled_for, admin_notes, is_synthetic, data_source)
       VALUES
        (?, ?, 'partner', ?, 'admin', 'active', ?, ?, 0, 'app')`,
      [listingId, partnerId, adminUser.id, scheduledFor || null, notes || null]
    );
    const assignmentId = assignResult.insertId;

    // 4. Update documents review_status to admin_checked
    await conn.query(
      `UPDATE listing_documents
       SET review_status = 'admin_checked',
           reviewed_by = ?,
           reviewed_at = CURRENT_TIMESTAMP(3)
       WHERE listing_id = ?`,
      [adminUser.id, listingId]
    );

    // 5. Update listing to in-review and increment version
    const newCredibility = calculateCredibilityScore({
      status: 'in-review',
      ratingAvg: listing.rating_avg,
      ratingCount: listing.rating_count,
    });

    await conn.query(
      `UPDATE listings
       SET status = 'in-review',
           credibility_score = ?,
           version = version + 1
       WHERE id = ?`,
      [newCredibility, listingId]
    );

    // 6. Record mandatory audit log
    const auditKey =
      idempotencyKey || `assign-${listingId}-${partnerId}-${assignmentId}`;
    const adminName = adminUser.name || adminUser.full_name || 'Admin';
    const actorLabel = `${adminName} (${adminUser.designation || 'Admin'})`;

    await conn.query(
      `INSERT INTO audit_logs
        (listing_id, actor_user_id, actor_label, action, detail, metadata, idempotency_key, is_synthetic, data_source)
       VALUES
        (?, ?, ?, 'ADMIN_ASSIGNED_PARTNER', ?, ?, ?, 0, 'app')`,
      [
        listingId,
        adminUser.id,
        actorLabel,
        `Assigned inspection to Partner ${partner.full_name} (Badge: ${partner.badge_number})`,
        JSON.stringify({
          assignmentId,
          partnerId,
          badgeNumber: partner.badge_number,
          scheduledFor,
          notes,
        }),
        auditKey,
      ]
    );

    return {
      success: true,
      assignmentId,
      listingId,
      status: 'in-review',
      partner: {
        id: partner.id,
        name: partner.full_name,
        badgeNumber: partner.badge_number,
      },
    };
  });
}

/**
 * Admin directly decides on a listing ('verified' or 'flagged').
 *
 * Rules:
 * - 'flagged' requires a reason; sets flag_reason, flagged_at, flagged_by, flag_category,
 *   credibility score, rejects/suspends documents.
 * - 'verified' generates seal via seal.service, sets verified_at, verified_by, seal_id, accepts documents.
 * - If an active assignment exists, cancel it.
 * - Audit: ADMIN_DIRECT_VERIFIED / ADMIN_DIRECT_FLAGGED.
 *
 * @param {Object} params
 * @param {string} params.listingId
 * @param {'verified'|'flagged'} params.decision
 * @param {string|null} [params.reason]
 * @param {string|null} [params.flagCategory]
 * @param {Object} params.adminUser
 * @param {string} [params.idempotencyKey]
 * @returns {Promise<object>} Result
 */
export async function adminDecision({
  listingId,
  decision,
  reason = null,
  flagCategory = null,
  adminUser,
  idempotencyKey,
}) {
  return await withTransaction(async (conn) => {
    // 1. Lock and load listing
    const [listings] = await conn.query(
      `SELECT l.*, c.name AS city_name, c.code AS city_code
       FROM listings l
       JOIN cities c ON c.id = l.city_id
       WHERE l.id = ? FOR UPDATE`,
      [listingId]
    );

    if (listings.length === 0) {
      throw new HttpError(404, 'Listing not found');
    }
    const listing = listings[0];

    // Status transition checks in code
    if (decision === 'verified') {
      if (listing.status === 'verified') {
        throw new HttpError(409, 'Listing is already verified');
      }
      if (listing.status === 'flagged') {
        throw new HttpError(
          409,
          'Cannot directly verify a flagged listing; vendor must resubmit first'
        );
      }
    } else if (decision === 'flagged') {
      if (!reason || reason.trim().length === 0) {
        throw new HttpError(400, 'Flag reason is required when decision is flagged');
      }
      if (listing.status === 'flagged') {
        throw new HttpError(409, 'Listing is already flagged');
      }
    }

    // 2. If an active partner assignment exists, cancel it
    await conn.query(
      `UPDATE partner_assignments
       SET status = 'cancelled'
       WHERE listing_id = ? AND status = 'active'`,
      [listingId]
    );

    let sealId = null;
    let newStatus = decision;
    let newCredibility = 70;
    let auditAction = '';
    let auditDetail = '';

    const adminName = adminUser.name || adminUser.full_name || 'Admin';
    const actorLabel = `${adminName} (${adminUser.designation || 'Admin'})`;

    if (decision === 'verified') {
      // Generate unique seal: MH-<city code>-<year>-<4 digits>
      sealId = await generateUniqueSeal(conn, listing.city_code);

      newCredibility = calculateCredibilityScore({
        status: 'verified',
        verifiedByRole: 'admin',
        ratingAvg: listing.rating_avg,
        ratingCount: listing.rating_count,
      });

      // Update documents to accepted
      await conn.query(
        `UPDATE listing_documents
         SET review_status = 'accepted',
             reviewed_by = ?,
             reviewed_at = CURRENT_TIMESTAMP(3)
         WHERE listing_id = ?`,
        [adminUser.id, listingId]
      );

      // Update listing
      await conn.query(
        `UPDATE listings
         SET status = 'verified',
             seal_id = ?,
             verified_at = CURRENT_TIMESTAMP(3),
             verified_by = ?,
             flag_reason = NULL,
             flagged_at = NULL,
             flagged_by = NULL,
             flag_category = NULL,
             credibility_score = ?,
             version = version + 1
         WHERE id = ?`,
        [sealId, adminUser.id, newCredibility, listingId]
      );

      auditAction = 'ADMIN_DIRECT_VERIFIED';
      auditDetail = `Listing verified directly by registrar. Verification seal issued: ${sealId}`;
    } else {
      // Flagged
      newCredibility = calculateCredibilityScore({
        status: 'flagged',
        ratingAvg: listing.rating_avg,
        ratingCount: listing.rating_count,
      });

      // Update documents to rejected
      await conn.query(
        `UPDATE listing_documents
         SET review_status = 'rejected',
             review_note = ?,
             reviewed_by = ?,
             reviewed_at = CURRENT_TIMESTAMP(3)
         WHERE listing_id = ?`,
        [reason, adminUser.id, listingId]
      );

      // Update listing
      await conn.query(
        `UPDATE listings
         SET status = 'flagged',
             flag_reason = ?,
             flag_category = ?,
             flagged_at = CURRENT_TIMESTAMP(3),
             flagged_by = ?,
             credibility_score = ?,
             version = version + 1
         WHERE id = ?`,
        [reason, flagCategory || 'Administrative Review', adminUser.id, newCredibility, listingId]
      );

      auditAction = 'ADMIN_DIRECT_FLAGGED';
      auditDetail = `Listing flagged directly by admin. Category: ${flagCategory || 'General'}. Reason: ${reason}`;
    }

    // 3. Record audit log
    const auditKey =
      idempotencyKey || `admin-decision-${listingId}-${decision}-${Date.now()}`;

    await conn.query(
      `INSERT INTO audit_logs
        (listing_id, actor_user_id, actor_label, action, detail, metadata, idempotency_key, is_synthetic, data_source)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, 0, 'app')`,
      [
        listingId,
        adminUser.id,
        actorLabel,
        auditAction,
        auditDetail,
        JSON.stringify({
          decision,
          reason,
          flagCategory,
          sealId,
          credibilityScore: newCredibility,
        }),
        auditKey,
      ]
    );

    return {
      success: true,
      listingId,
      status: newStatus,
      sealId,
      credibilityScore: newCredibility,
    };
  });
}

/**
 * Field partner submits on-site inspection for an assignment.
 *
 * Rules:
 * - assignment must belong to partner and be active
 * - listing must be in-review
 * - insert field_audits (respect CHECKs: flagged => discrepancy_found 1, verified => 0; GPS bounds)
 * - mark assignment completed with completed_at
 * - update listing to verified (seal, verified_by = partner) or flagged
 * - update credibility score
 * - write audit FIELD_VERIFICATION_APPROVED / FIELD_INSPECTION_FLAGGED
 *
 * @param {Object} params
 * @param {number|string} params.assignmentId
 * @param {Object} params.partnerUser
 * @param {Object} params.inspectionData
 * @param {string} [params.idempotencyKey]
 * @returns {Promise<object>} Result
 */
export async function partnerInspection({
  assignmentId,
  partnerUser,
  inspectionData,
  idempotencyKey,
}) {
  return await withTransaction(async (conn) => {
    // 1. Lock and load assignment
    const [assignments] = await conn.query(
      `SELECT pa.*, pp.badge_number, pp.zone
       FROM partner_assignments pa
       LEFT JOIN partner_profiles pp ON pp.user_id = pa.partner_id
       WHERE pa.id = ? FOR UPDATE`,
      [assignmentId]
    );

    if (assignments.length === 0) {
      throw new HttpError(404, 'Assignment not found');
    }
    const assignment = assignments[0];

    // Ownership check: partner must be the assignee
    if (assignment.partner_id !== partnerUser.id) {
      throw new HttpError(403, 'You are not authorized to inspect this assignment');
    }

    // Active state check
    if (assignment.status !== 'active') {
      throw new HttpError(
        409,
        `Cannot inspect assignment: status is '${assignment.status}' (expected 'active')`
      );
    }

    // 2. Lock and load listing
    const [listings] = await conn.query(
      `SELECT l.*, c.name AS city_name, c.code AS city_code
       FROM listings l
       JOIN cities c ON c.id = l.city_id
       WHERE l.id = ? FOR UPDATE`,
      [assignment.listing_id]
    );

    if (listings.length === 0) {
      throw new HttpError(404, 'Associated listing not found');
    }
    const listing = listings[0];

    if (listing.status !== 'in-review') {
      throw new HttpError(
        409,
        `Cannot inspect listing: current status is '${listing.status}' (expected 'in-review')`
      );
    }

    const {
      outcome,
      gpsLat = null,
      gpsLng = null,
      physicalKeysVerified = null,
      ownerMetInPerson = null,
      unitVacantAvailable = null,
      notes,
      flagReason = null,
      flagCategory = null,
    } = inspectionData;

    if (!notes || notes.trim().length === 0) {
      throw new HttpError(400, 'Inspection notes are required');
    }

    // Prepare fields according to CHECK constraints
    // chk_audit_outcome CHECK ((outcome = 'flagged' AND discrepancy_found = 1) OR (outcome = 'verified' AND discrepancy_found = 0))
    const discrepancyFound = outcome === 'flagged' ? 1 : 0;

    const hasGps = gpsLat != null && gpsLng != null;
    const gpsVerified = hasGps ? 1 : 0;
    const inspectedOn = new Date().toISOString().slice(0, 10);

    const keysCheck = physicalKeysVerified != null ? (physicalKeysVerified ? 1 : 0) : null;
    const ownerCheck = ownerMetInPerson != null ? (ownerMetInPerson ? 1 : 0) : null;
    const vacantCheck = unitVacantAvailable != null ? (unitVacantAvailable ? 1 : 0) : null;

    // 3. Insert field_audits row
    await conn.query(
      `INSERT INTO field_audits
        (assignment_id, listing_id, partner_id, outcome, inspected_on,
         gps_lat, gps_lng, gps_verified, physical_keys_verified, owner_met_in_person,
         unit_vacant_available, discrepancy_found, notes, is_synthetic, data_source)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'app')`,
      [
        assignment.id,
        listing.id,
        partnerUser.id,
        outcome,
        inspectedOn,
        hasGps ? gpsLat : null,
        hasGps ? gpsLng : null,
        gpsVerified,
        keysCheck,
        ownerCheck,
        vacantCheck,
        discrepancyFound,
        notes,
      ]
    );

    // 4. Mark assignment completed
    await conn.query(
      `UPDATE partner_assignments
       SET status = 'completed',
           completed_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?`,
      [assignment.id]
    );

    let sealId = null;
    let newCredibility = 70;
    let auditAction = '';
    let auditDetail = '';

    const partnerName = partnerUser.name || partnerUser.full_name || 'Field Partner';
    const badgeStr = partnerUser.badgeNumber || assignment.badge_number ? ` ${partnerUser.badgeNumber || assignment.badge_number}` : '';
    const actorLabel = `${partnerName} (Field Partner${badgeStr})`;

    if (outcome === 'verified') {
      // Generate seal
      sealId = await generateUniqueSeal(conn, listing.city_code);

      newCredibility = calculateCredibilityScore({
        status: 'verified',
        verifiedByRole: 'partner',
        ratingAvg: listing.rating_avg,
        ratingCount: listing.rating_count,
      });

      // Documents accepted
      await conn.query(
        `UPDATE listing_documents
         SET review_status = 'accepted',
             reviewed_by = ?,
             reviewed_at = CURRENT_TIMESTAMP(3)
         WHERE listing_id = ?`,
        [partnerUser.id, listing.id]
      );

      // Listing verified
      await conn.query(
        `UPDATE listings
         SET status = 'verified',
             seal_id = ?,
             verified_at = CURRENT_TIMESTAMP(3),
             verified_by = ?,
             flag_reason = NULL,
             flagged_at = NULL,
             flagged_by = NULL,
             flag_category = NULL,
             credibility_score = ?,
             version = version + 1
         WHERE id = ?`,
        [sealId, partnerUser.id, newCredibility, listing.id]
      );

      auditAction = 'FIELD_VERIFICATION_APPROVED';
      auditDetail = `Physical inspection passed. Verification seal ${sealId} issued. Notes: ${notes}`;
    } else {
      // Flagged
      const actualReason = flagReason || notes;
      newCredibility = calculateCredibilityScore({
        status: 'flagged',
        ratingAvg: listing.rating_avg,
        ratingCount: listing.rating_count,
      });

      // Documents rejected
      await conn.query(
        `UPDATE listing_documents
         SET review_status = 'rejected',
             review_note = ?,
             reviewed_by = ?,
             reviewed_at = CURRENT_TIMESTAMP(3)
         WHERE listing_id = ?`,
        [actualReason, partnerUser.id, listing.id]
      );

      // Listing flagged
      await conn.query(
        `UPDATE listings
         SET status = 'flagged',
             flag_reason = ?,
             flag_category = ?,
             flagged_at = CURRENT_TIMESTAMP(3),
             flagged_by = ?,
             credibility_score = ?,
             version = version + 1
         WHERE id = ?`,
        [
          actualReason,
          flagCategory || 'Field Discrepancy',
          partnerUser.id,
          newCredibility,
          listing.id,
        ]
      );

      auditAction = 'FIELD_INSPECTION_FLAGGED';
      auditDetail = `Physical inspection discrepancy flagged: ${actualReason}`;
    }

    // 5. Mandatory audit log
    const auditKey =
      idempotencyKey || `partner-inspect-${assignment.id}-${outcome}-${Date.now()}`;

    await conn.query(
      `INSERT INTO audit_logs
        (listing_id, actor_user_id, actor_label, action, detail, metadata, idempotency_key, is_synthetic, data_source)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, 0, 'app')`,
      [
        listing.id,
        partnerUser.id,
        actorLabel,
        auditAction,
        auditDetail,
        JSON.stringify({
          assignmentId: assignment.id,
          outcome,
          notes,
          gpsVerified,
          gpsLat,
          gpsLng,
          sealId,
          credibilityScore: newCredibility,
        }),
        auditKey,
      ]
    );

    return {
      success: true,
      assignmentId: assignment.id,
      listingId: listing.id,
      status: outcome,
      sealId,
      credibilityScore: newCredibility,
    };
  });
}

/**
 * Partner views their assigned active listings.
 *
 * @param {string} partnerId
 * @returns {Promise<Array<object>>}
 */
export async function getPartnerAssignments(partnerId) {
  const [rows] = await mysqlPool.query(
    `SELECT 
      pa.id AS assignment_id, pa.status AS assignment_status, pa.scheduled_for,
      pa.admin_notes, pa.assigned_at, pa.completed_at,
      l.*,
      c.name AS city_name, c.state AS city_state, c.code AS city_code,
      u.full_name AS owner_name, u.phone AS owner_phone, u.designation AS owner_designation,
      pu.full_name AS assigned_partner_name,
      pp.badge_number AS assigned_partner_badge,
      pp.zone AS assigned_partner_zone
    FROM partner_assignments pa
    JOIN listings l ON l.id = pa.listing_id
    JOIN cities c ON c.id = l.city_id
    JOIN users u ON u.id = l.owner_id
    JOIN users pu ON pu.id = pa.partner_id
    LEFT JOIN partner_profiles pp ON pp.user_id = pu.id
    WHERE pa.partner_id = ? AND pa.status = 'active'
    ORDER BY pa.assigned_at DESC`,
    [partnerId]
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

  // Mongo details
  const propDetailsCol = getPropertyDetails();
  const mongoDocs = await propDetailsCol.find({ _id: { $in: listingIds } }).toArray();
  const mongoDocsMap = new Map(mongoDocs.map((doc) => [doc._id, doc]));

  return rows.map((row) => {
    const mongoDoc = mongoDocsMap.get(row.id) || null;
    const docs = docsMap.get(row.id) || [];
    const item = serializeListing(row, mongoDoc, docs, null, []);
    return {
      ...item,
      assignment: {
        id: row.assignment_id,
        status: row.assignment_status,
        scheduledFor: row.scheduled_for,
        adminNotes: row.admin_notes,
        assignedAt: row.assigned_at,
      },
    };
  });
}

/**
 * List active partners with assigned and completed counts.
 *
 * @returns {Promise<Array<object>>}
 */
export async function getAdminPartners() {
  const [rows] = await mysqlPool.query(
    `SELECT 
      u.id, u.full_name, u.phone, u.email, u.is_active,
      pp.badge_number, pp.zone, pp.city_id,
      c.name AS city_name,
      COUNT(CASE WHEN pa.status = 'active' THEN 1 END) AS active_assignments_count,
      COUNT(CASE WHEN pa.status = 'completed' THEN 1 END) AS completed_assignments_count
    FROM users u
    JOIN partner_profiles pp ON pp.user_id = u.id
    JOIN cities c ON c.id = pp.city_id
    LEFT JOIN partner_assignments pa ON pa.partner_id = u.id
    WHERE u.role = 'partner' AND u.is_active = 1
    GROUP BY u.id, u.full_name, u.phone, u.email, u.is_active, pp.badge_number, pp.zone, pp.city_id, c.name
    ORDER BY c.name, u.full_name`
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.full_name,
    phone: r.phone,
    email: r.email,
    isActive: Boolean(r.is_active),
    badgeNumber: r.badge_number,
    zone: r.zone,
    cityId: r.city_id,
    cityName: r.city_name,
    activeAssignmentsCount: Number(r.active_assignments_count || 0),
    completedAssignmentsCount: Number(r.completed_assignments_count || 0),
  }));
}

/**
 * Retrieve audit log rows, newest first.
 *
 * @param {Object} options
 * @param {string} [options.listingId]
 * @param {number} [options.limit=50]
 * @param {number} [options.offset=0]
 * @returns {Promise<{ total: number, logs: Array<object> }>}
 */
export async function getAuditLogs({ listingId = null, limit = 50, offset = 0 }) {
  const whereClauses = [];
  const params = [];

  if (listingId) {
    whereClauses.push('a.listing_id = ?');
    params.push(listingId);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const [countRows] = await mysqlPool.query(
    `SELECT COUNT(*) AS total FROM audit_logs a ${whereSql}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await mysqlPool.query(
    `SELECT 
      a.id, a.occurred_at, a.listing_id, a.actor_user_id, a.actor_label,
      a.action, a.detail, a.metadata, a.idempotency_key
    FROM audit_logs a
    ${whereSql}
    ORDER BY a.occurred_at DESC, a.id DESC
    LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  return {
    total,
    logs: rows.map((r) => ({
      id: r.id,
      occurredAt: r.occurred_at,
      listingId: r.listing_id,
      actorUserId: r.actor_user_id,
      actorLabel: r.actor_label,
      action: r.action,
      detail: r.detail,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
      idempotencyKey: r.idempotency_key,
    })),
  };
}
