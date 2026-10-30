import { withTransaction } from '../config/mysql.js';
import { calculateCredibilityScore } from './credibility.service.js';
import { HttpError } from '../utils/httpError.js';

/**
 * Submit feedback / rating for a verified listing.
 *
 * Rules:
 * - Customer only (enforced by route middleware)
 * - Only verified listings can be reviewed
 * - Exactly one review per user per listing (enforced in code & by DB unique key)
 * - In one transaction:
 *   - lock listing with FOR UPDATE
 *   - insert into feedback
 *   - recompute rating_avg and rating_count on listing (rating_avg NULL when count = 0 per CHECK)
 *   - recalculate credibility score
 *   - write audit FEEDBACK_SUBMITTED
 *
 * @param {Object} params
 * @param {string} params.listingId
 * @param {Object} params.customerUser
 * @param {number} params.rating
 * @param {string|null} [params.comment]
 * @returns {Promise<object>}
 */
export async function submitFeedback({ listingId, customerUser, rating, comment = null }) {
  return await withTransaction(async (conn) => {
    // 1. Lock and load the listing
    const [listings] = await conn.query(
      'SELECT * FROM listings WHERE id = ? FOR UPDATE',
      [listingId]
    );

    if (listings.length === 0) {
      throw new HttpError(404, 'Listing not found');
    }
    const listing = listings[0];

    // Status check: only verified listings can be reviewed
    if (listing.status !== 'verified') {
      throw new HttpError(
        400,
        `Only verified listings can be reviewed (current status: '${listing.status}')`
      );
    }

    // Check if customer already submitted feedback
    const [existing] = await conn.query(
      'SELECT id FROM feedback WHERE listing_id = ? AND user_id = ? LIMIT 1',
      [listingId, customerUser.id]
    );

    if (existing.length > 0) {
      throw new HttpError(
        409,
        'You have already submitted a review for this listing'
      );
    }

    // 2. Insert into feedback table
    await conn.query(
      `INSERT INTO feedback
        (listing_id, user_id, user_role, rating, comment, is_synthetic, data_source)
       VALUES
        (?, ?, 'customer', ?, ?, 0, 'app')`,
      [listingId, customerUser.id, rating, comment || null]
    );

    // 3. Recompute rating_avg and rating_count
    const [stats] = await conn.query(
      `SELECT COUNT(*) AS total_count, AVG(rating) AS avg_rating
       FROM feedback
       WHERE listing_id = ?`,
      [listingId]
    );

    const count = Number(stats[0]?.total_count || 0);
    // rating_avg NULL when count is 0, per the CHECK constraint
    const avg = count > 0 ? Math.round(Number(stats[0]?.avg_rating) * 100) / 100 : null;

    // 4. Update credibility score
    const newCredibility = calculateCredibilityScore({
      status: 'verified',
      verifiedByRole: listing.verified_by ? 'partner' : 'admin',
      ratingAvg: avg,
      ratingCount: count,
    });

    // 5. Update listing row
    await conn.query(
      `UPDATE listings
       SET rating_avg = ?,
           rating_count = ?,
           credibility_score = ?,
           version = version + 1
       WHERE id = ?`,
      [avg, count, newCredibility, listingId]
    );

    // 6. Record audit log row
    const auditKey = `feedback-${listingId}-${customerUser.id}`;
    const customerName = customerUser.name || customerUser.full_name || 'Customer';
    const actorLabel = `${customerName} (customer)`;

    await conn.query(
      `INSERT INTO audit_logs
        (listing_id, actor_user_id, actor_label, action, detail, metadata, idempotency_key, is_synthetic, data_source)
       VALUES
        (?, ?, ?, 'FEEDBACK_SUBMITTED', ?, ?, ?, 0, 'app')`,
      [
        listingId,
        customerUser.id,
        actorLabel,
        `Customer review submitted: rating ${rating}/5`,
        JSON.stringify({
          rating,
          comment,
          ratingAvg: avg,
          ratingCount: count,
          credibilityScore: newCredibility,
        }),
        auditKey,
      ]
    );

    return {
      success: true,
      listingId,
      rating,
      comment,
      ratingAvg: avg,
      ratingCount: count,
      credibilityScore: newCredibility,
    };
  });
}
