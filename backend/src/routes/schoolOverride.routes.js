import { Router } from 'express';
import {
  getSchoolOverrides,
  createSchoolOverride,
  archiveSchoolOverride
} from '../controllers/schoolOverride.controller.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware, roleMiddleware(['SUPER_ADMIN']));

router.get('/:schoolId', getSchoolOverrides);
router.post('/:schoolId', createSchoolOverride);
router.put('/:id/archive', archiveSchoolOverride);

export default router;
