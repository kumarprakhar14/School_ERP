import { Router } from 'express';
import {
  getFeatures,
  createFeature,
  updateFeature,
  deleteFeature
} from '../controllers/features.controller.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware, roleMiddleware(['SUPER_ADMIN']));

router.get('/', getFeatures);
router.post('/', createFeature);
router.put('/:id', updateFeature);
router.delete('/:id', deleteFeature);

export default router;
