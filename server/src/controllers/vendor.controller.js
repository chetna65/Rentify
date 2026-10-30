import { vendorCreateListingSchema, listingIdParamSchema } from '../schemas/listing.schema.js';
import * as submissionService from '../services/submission.service.js';
import * as listingService from '../services/listing.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * POST /api/vendor/listings
 * Create a new property listing with optional multipart documents/images.
 */
export const createListing = asyncHandler(async (req, res) => {
  const payload = vendorCreateListingSchema.parse(req.body);
  const listing = await submissionService.createVendorListing({
    payload,
    files: req.files || [],
    user: req.user,
  });

  return res.status(201).json(listing);
});

/**
 * GET /api/vendor/listings
 * Retrieve all listings owned by the authenticated vendor.
 */
export const getMyListings = asyncHandler(async (req, res) => {
  const listings = await listingService.getVendorListings(req.user.id);
  return res.status(200).json({ listings });
});

/**
 * POST /api/vendor/listings/:id/resubmit
 * Resubmit a flagged listing owned by the vendor after correcting discrepancies.
 */
export const resubmitListing = asyncHandler(async (req, res) => {
  const { id } = listingIdParamSchema.parse(req.params);
  const updatedListing = await submissionService.resubmitFlaggedListing(id, req.user);
  return res.status(200).json(updatedListing);
});
