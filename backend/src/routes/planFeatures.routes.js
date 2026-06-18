import { Router } from 'express';
import {
  getPlanFeatures,
  createPlanFeature,
  updatePlanFeature,
  deletePlanFeature
} from '../controllers/planFeatures.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole(['SUPER_ADMIN']));

router.get('/:planId', getPlanFeatures);
router.post('/', createPlanFeature);
router.put('/:id', updatePlanFeature);
router.delete('/:id', deletePlanFeature);

export default router;
