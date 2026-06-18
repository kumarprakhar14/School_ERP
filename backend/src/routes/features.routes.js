import { Router } from 'express';
import {
  getFeatures,
  createFeature,
  updateFeature,
  deleteFeature
} from '../controllers/features.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole(['SUPER_ADMIN']));

router.get('/', getFeatures);
router.post('/', createFeature);
router.put('/:id', updateFeature);
router.delete('/:id', deleteFeature);

export default router;
