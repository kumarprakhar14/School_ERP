import { Router } from 'express';
import {
  getSchoolSubscriptions,
  assignPlan,
  suspendSubscription,
  reactivateSubscription,
  cancelSubscription,
  extendSubscription
} from '../controllers/schoolSubscription.controller.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware, roleMiddleware(['SUPER_ADMIN']));

router.get('/:schoolId', getSchoolSubscriptions);
router.post('/:schoolId/assign', assignPlan);
router.post('/:schoolId/suspend', suspendSubscription);
router.post('/:schoolId/reactivate', reactivateSubscription);
router.post('/:schoolId/cancel', cancelSubscription);
router.post('/:schoolId/extend', extendSubscription);

export default router;
