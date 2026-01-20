import { Router } from 'express';
import {
  createStatusPage,
  getStatusPages,
  getPublicStatusPage,
} from '../controllers/statusPageController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public route (no auth)
router.get('/public/:subdomain', getPublicStatusPage);

// Protected routes
router.use(authenticate);
router.post('/', createStatusPage);
router.get('/', getStatusPages);

export default router;
