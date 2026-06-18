import { Router } from 'express';
import { getSchoolFeatureDiagnostics } from '../controllers/diagnostics.controller.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// Diagnostics should be heavily protected, typically SUPER_ADMIN only
router.use(authMiddleware, roleMiddleware(['SUPER_ADMIN']));

router.get('/features/:schoolId', getSchoolFeatureDiagnostics);

export default router;
