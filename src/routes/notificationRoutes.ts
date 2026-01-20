import { Router } from 'express';
import {
  getNotificationSettings,
  updateNotificationSettings,
} from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', getNotificationSettings);
router.put('/', updateNotificationSettings);

export default router;
