/**
 * Rentify Credibility Score Calculation Service
 *
 * Deterministic formula:
 * 1. Base Score determined by verification status:
 *    - Verified by field partner: 95
 *    - Verified by direct admin: 90
 *    - In-review: 80
 *    - Pending: 70
 *    - Flagged: 15
 *
 * 2. Community Rating Adjustment (-5 to +5):
 *    - If rating_count > 0 and rating_avg != null:
 *      rawAdjustment = (rating_avg - 3.0) * 2.0 + Math.min(rating_count, 5) * 0.5
 *      clamped to [-5, +5]
 *    - If no ratings: 0
 *
 * 3. Final Score:
 *    - clamped to [0, 100]
 */

/**
 * Calculate the deterministic credibility score for a listing.
 *
 * @param {Object} params
 * @param {'pending'|'in-review'|'verified'|'flagged'} params.status - Current or target listing status
 * @param {'partner'|'admin'} [params.verifiedByRole='partner'] - Who verified ('partner' or 'admin')
 * @param {number|null} [params.ratingAvg=null] - Average customer rating (1-5)
 * @param {number} [params.ratingCount=0] - Total customer reviews
 * @returns {number} Integer between 0 and 100
 */
export function calculateCredibilityScore({
  status,
  verifiedByRole = 'partner',
  ratingAvg = null,
  ratingCount = 0,
}) {
  let baseScore = 70;

  switch (status) {
    case 'verified':
      baseScore = verifiedByRole === 'partner' ? 95 : 90;
      break;
    case 'in-review':
      baseScore = 80;
      break;
    case 'pending':
      baseScore = 70;
      break;
    case 'flagged':
      baseScore = 15;
      break;
    default:
      baseScore = 70;
  }

  let ratingAdjustment = 0;
  if (ratingCount > 0 && ratingAvg !== null && ratingAvg !== undefined) {
    const avg = Number(ratingAvg);
    const count = Number(ratingCount);
    // (avg - 3.0) * 2 + min(count, 5) * 0.5
    const rawAdjustment = Math.round((avg - 3.0) * 2.0 + Math.min(count, 5) * 0.5);
    ratingAdjustment = Math.max(-5, Math.min(5, rawAdjustment));
  }

  const finalScore = Math.max(0, Math.min(100, baseScore + ratingAdjustment));
  return Math.round(finalScore);
}
