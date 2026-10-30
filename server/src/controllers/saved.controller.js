import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import {
  getSavedListings,
  saveListing,
  unsaveListing,
} from '../services/saved.service.js';

const idParamSchema = z.string().uuid('Invalid listing UUID');

export const getSaved = asyncHandler(async (req, res) => {
  const listings = await getSavedListings(req.user.id);
  res.json({
    status: 'success',
    data: listings,
  });
});

export const addSaved = asyncHandler(async (req, res) => {
  const parsed = idParamSchema.safeParse(req.params.listingId);
  if (!parsed.success) {
    throw new HttpError(400, 'Invalid listing UUID format');
  }

  const result = await saveListing(req.user.id, parsed.data);
  res.json({
    status: 'success',
    message: 'Listing saved successfully',
    data: result,
  });
});

export const removeSaved = asyncHandler(async (req, res) => {
  const parsed = idParamSchema.safeParse(req.params.listingId);
  if (!parsed.success) {
    throw new HttpError(400, 'Invalid listing UUID format');
  }

  const result = await unsaveListing(req.user.id, parsed.data);
  res.json({
    status: 'success',
    message: 'Listing removed from saved listings',
    data: result,
  });
});
