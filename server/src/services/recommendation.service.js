import { searchListings } from './listing.service.js';
import { mysqlPool } from '../config/mysql.js';

/**
 * Multi-factor recommendation scoring weights.
 * Total weights sum to 1.0 (100%).
 *
 * Factors:
 * - BUDGET_FIT: Proximity to customer's target budget range (30%)
 * - LOCALITY_MATCH: Proximity to customer's preferred localities (25%)
 * - SAFETY_SCORE: Civic and physical safety assessment score (20%)
 * - CREDIBILITY_SCORE: Title integrity & registrar credibility heuristic (15%)
 * - RATING_AVERAGE: Customer move-in review average (10%)
 */
export const RECOMMENDATION_WEIGHTS = {
  BUDGET_FIT: 0.30,
  LOCALITY_MATCH: 0.25,
  SAFETY_SCORE: 0.20,
  CREDIBILITY_SCORE: 0.15,
  RATING_AVERAGE: 0.10,
};

/**
 * Generates personalized recommendations for a logged-in customer.
 * Evaluates verified listings against customer budget, preferred localities,
 * neighborhood safety scores, platform credibility, and tenant ratings.
 *
 * @param {object} customer - The authenticated customer user
 * @param {object} [preferences={}] - Filter and preference overrides
 * @param {string} [preferences.city] - Optional target city
 * @param {number} [preferences.minRent] - Minimum budget
 * @param {number} [preferences.maxRent] - Maximum budget
 * @param {string[]} [preferences.localities] - Preferred locality names
 * @returns {Promise<Array<object>>} Top 10 scored listings with plain-English reasons
 */
export async function getRecommendationsForCustomer(customer, preferences = {}) {
  // 1. Infer preferences from saved listings if not explicitly supplied
  let preferredLocalities = preferences.localities || [];
  let minBudget = preferences.minRent;
  let maxBudget = preferences.maxRent;
  let targetCity = preferences.city;

  if (preferredLocalities.length === 0 || maxBudget == null) {
    const [savedRows] = await mysqlPool.query(
      `SELECT l.locality, l.rent_inr, c.name AS city_name
       FROM saved_listings sl
       JOIN listings l ON sl.listing_id = l.id
       JOIN cities c ON c.id = l.city_id
       WHERE sl.user_id = ?`,
      [customer.id]
    );

    if (savedRows.length > 0) {
      if (preferredLocalities.length === 0) {
        preferredLocalities = Array.from(new Set(savedRows.map((r) => r.locality).filter(Boolean)));
      }
      if (maxBudget == null) {
        const rents = savedRows.map((r) => Number(r.rent_inr));
        maxBudget = Math.max(...rents) * 1.1; // 10% headroom
      }
      if (!targetCity && savedRows[0]?.city_name) {
        targetCity = savedRows[0].city_name;
      }
    }
  }

  // Fallback defaults if no saved listings or params exist
  minBudget = minBudget ?? 0;
  maxBudget = maxBudget ?? 45000;

  // 2. Fetch verified listings (up to 100 candidates)
  const searchFilter = {
    verifiedOnly: true,
    limit: 100,
  };
  if (targetCity && targetCity.toLowerCase() !== 'all') {
    searchFilter.city = targetCity;
  }

  const { listings } = await searchListings(searchFilter);

  // Normalize preferred localities for case-insensitive comparison
  const normalizedPreferred = preferredLocalities.map((loc) => loc.toLowerCase().trim());

  // 3. Score each verified listing
  const scoredListings = [];

  for (const listing of listings) {
    // We only recommend verified properties
    if (listing.status !== 'verified') continue;

    const reasons = [];

    // --- Factor 1: Budget Fit (30%) ---
    let budgetScore = 0;
    const rent = Number(listing.rent);

    if (rent >= minBudget && rent <= maxBudget) {
      budgetScore = 1.0;
      reasons.push('Within your budget');
    } else if (rent > maxBudget && rent <= maxBudget * 1.15) {
      budgetScore = 0.5;
      reasons.push(`Near your budget (₹${rent.toLocaleString()}/mo)`);
    } else if (rent < minBudget && rent >= minBudget * 0.85) {
      budgetScore = 0.8;
      reasons.push(`High value: below your target budget (₹${rent.toLocaleString()}/mo)`);
    } else {
      budgetScore = 0.1;
    }

    // --- Factor 2: Locality Match (25%) ---
    let localityScore = 0;
    const listingLocality = (listing.locality || '').toLowerCase().trim();

    if (normalizedPreferred.length > 0) {
      const matchedPref = normalizedPreferred.find(
        (pref) => listingLocality.includes(pref) || pref.includes(listingLocality)
      );
      if (matchedPref) {
        localityScore = 1.0;
        reasons.push(`In your preferred locality: ${listing.locality}`);
      } else {
        localityScore = 0.2;
      }
    } else {
      // Neutral score when customer has not indicated locality preferences
      localityScore = 0.7;
      if (listing.locality) {
        reasons.push(`Central location in ${listing.locality}`);
      }
    }

    // --- Factor 3: Safety Score (20%) ---
    const safetyScore = Number(listing.safetyScore ?? 7.0);
    const safetyNorm = Math.min(Math.max(safetyScore / 10, 0), 1);
    if (safetyScore >= 8.5) {
      reasons.push(`Safety score ${safetyScore}/10`);
    } else if (safetyScore >= 7.5) {
      reasons.push(`Safety score ${safetyScore}/10`);
    }

    // --- Factor 4: Credibility Score (15%) ---
    const credibility = Number(listing.credibilityScore ?? 75);
    const credibilityNorm = Math.min(Math.max(credibility / 100, 0), 1);
    if (credibility >= 85) {
      reasons.push(`High credibility score (${credibility}/100)`);
    } else if (credibility >= 70) {
      reasons.push(`Deed-verified credibility score (${credibility}/100)`);
    }

    // --- Factor 5: Rating Average (10%) ---
    const ratingAvg = Number(listing.ratingAvg || 0);
    const ratingCount = Number(listing.ratingCount || 0);
    let ratingNorm = 0.7; // Neutral baseline for newly verified unreviewed homes

    if (ratingAvg > 0 && ratingCount > 0) {
      ratingNorm = Math.min(Math.max(ratingAvg / 5, 0), 1);
      if (ratingAvg >= 4.0) {
        reasons.push(`${ratingAvg.toFixed(1)}★ verified tenant rating (${ratingCount} review${ratingCount > 1 ? 's' : ''})`);
      }
    } else {
      reasons.push('Verified title deed & physical audit');
    }

    // Calculate weighted aggregate score
    const totalScore =
      budgetScore * RECOMMENDATION_WEIGHTS.BUDGET_FIT +
      localityScore * RECOMMENDATION_WEIGHTS.LOCALITY_MATCH +
      safetyNorm * RECOMMENDATION_WEIGHTS.SAFETY_SCORE +
      credibilityNorm * RECOMMENDATION_WEIGHTS.CREDIBILITY_SCORE +
      ratingNorm * RECOMMENDATION_WEIGHTS.RATING_AVERAGE;

    scoredListings.push({
      ...listing,
      matchScore: Math.round(totalScore * 100),
      rawScore: totalScore,
      reasons,
    });
  }

  // 4. Sort descending by score, take top 10
  scoredListings.sort((a, b) => b.rawScore - a.rawScore);

  return scoredListings.slice(0, 10);
}
