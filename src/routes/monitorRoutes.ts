import { Router } from 'express';
import {
  createMonitor,
  getMonitors,
  getMonitor,
  updateMonitor,
  deleteMonitor,
} from '../controllers/monitorController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createMonitor);
router.get('/', getMonitors);
router.get('/:id', getMonitor);
router.put('/:id', updateMonitor);
router.delete('/:id', deleteMonitor);

export default router;
