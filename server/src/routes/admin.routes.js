import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, requireRole('admin'));

router.get('/queue', adminController.getQueue);
router.get('/listings/:id', adminController.getListingDetails);
router.patch('/listings/:id/assign', adminController.assign);
router.patch('/listings/:id/decision', adminController.decision);
router.get('/partners', adminController.getPartners);
router.get('/audit', adminController.getAudit);

export default router;
