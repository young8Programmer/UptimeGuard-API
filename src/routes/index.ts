import { Router } from 'express';
import authRoutes from './authRoutes';
import monitorRoutes from './monitorRoutes';
import statusPageRoutes from './statusPageRoutes';
import notificationRoutes from './notificationRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/monitors', monitorRoutes);
router.use('/status-pages', statusPageRoutes);
router.use('/notifications', notificationRoutes);

export default router;
