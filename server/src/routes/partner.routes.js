import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import * as partnerController from '../controllers/partner.controller.js';

const router = Router();

// All partner routes require authentication and partner role
router.use(authenticate, requireRole('partner'));

router.get('/assignments', partnerController.getAssignments);
router.post('/assignments/:assignmentId/inspection', partnerController.submitInspection);

export default router;
