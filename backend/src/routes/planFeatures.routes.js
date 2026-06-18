import { Router } from 'express';
import {
  getPlanFeatures,
  createPlanFeature,
  updatePlanFeature,
  deletePlanFeature
} from '../controllers/planFeatures.controller.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware, roleMiddleware(['SUPER_ADMIN']));

router.get('/:planId', getPlanFeatures);
router.post('/', createPlanFeature);
router.put('/:id', updatePlanFeature);
router.delete('/:id', deletePlanFeature);

export default router;
