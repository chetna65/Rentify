import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import * as savedController from '../controllers/saved.controller.js';

const router = Router();

// Saved listings endpoints are restricted to authenticated customers
router.use(authenticate, requireRole('customer'));

router.get('/saved', savedController.getSaved);
router.post('/saved/:listingId', savedController.addSaved);
router.delete('/saved/:listingId', savedController.removeSaved);

export default router;
