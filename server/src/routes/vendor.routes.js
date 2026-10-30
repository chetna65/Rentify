import { Router } from 'express';
import * as vendorController from '../controllers/vendor.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { handleUpload } from '../middleware/upload.js';

export const vendorRouter = Router();

// All vendor routes mandate authentication and the 'vendor' role
vendorRouter.use('/vendor', authenticate, requireRole('vendor'));

vendorRouter.post('/vendor/listings', handleUpload, vendorController.createListing);
vendorRouter.get('/vendor/listings', vendorController.getMyListings);
vendorRouter.post('/vendor/listings/:id/resubmit', vendorController.resubmitListing);
