import {
  listingQuerySchema,
  listingIdParamSchema,
  recommendationQuerySchema,
} from '../schemas/listing.schema.js';
import * as listingService from '../services/listing.service.js';
import {
  getRecommendationsForCustomer,
  RECOMMENDATION_WEIGHTS,
} from '../services/recommendation.service.js';
import { HttpError } from '../utils/httpError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/listings
 * Search and filter public listings
 */
export const getListings = asyncHandler(async (req, res) => {
  const query = listingQuerySchema.parse(req.query);
  const result = await listingService.searchListings(query);
  return res.status(200).json(result);
});

/**
 * GET /api/listings/recommended
 * Retrieve personalized recommendations for the logged-in customer.
 */
export const getRecommendedListings = asyncHandler(async (req, res) => {
  const query = recommendationQuerySchema.parse(req.query);
  const recommendations = await getRecommendationsForCustomer(req.user, query);

  return res.status(200).json({
    status: 'success',
    count: recommendations.length,
    weights: RECOMMENDATION_WEIGHTS,
    recommendations,
  });
});

/**
 * GET /api/listings/:id
 * Retrieve a specific listing by its UUID
 */
export const getListingById = asyncHandler(async (req, res) => {
  const { id } = listingIdParamSchema.parse(req.params);
  const listing = await listingService.getListingById(id);

  if (!listing) {
    throw HttpError.notFound(`Listing not found with ID ${id}`);
  }

  return res.status(200).json(listing);
});
