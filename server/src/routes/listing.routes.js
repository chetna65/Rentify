import { Router } from 'express';
import * as listingController from '../controllers/listing.controller.js';
import * as feedbackController from '../controllers/feedback.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

export const listingRouter = Router();

listingRouter.get('/listings', listingController.getListings);
listingRouter.get(
  '/listings/recommended',
  authenticate,
  requireRole('customer'),
  listingController.getRecommendedListings
);
listingRouter.get('/listings/:id', listingController.getListingById);
listingRouter.post(
  '/listings/:id/feedback',
  authenticate,
  requireRole('customer'),
  feedbackController.postFeedback
);
