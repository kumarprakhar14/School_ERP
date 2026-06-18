import { Router } from 'express';
import {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  addPricing,
  updatePricing,
  deletePricing
} from '../controllers/plans.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Only SUPER_ADMIN can manage plans in Phase I
router.use(requireAuth, requireRole(['SUPER_ADMIN']));

router.get('/', getPlans);
router.post('/', createPlan);
router.put('/:id', updatePlan);
router.delete('/:id', deletePlan);

// Pricing routes for a plan
router.post('/:id/pricing', addPricing);
router.put('/:id/pricing/:pricingId', updatePricing);
router.delete('/:id/pricing/:pricingId', deletePricing);

export default router;
