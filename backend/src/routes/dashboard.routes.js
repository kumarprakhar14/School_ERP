import express from 'express';
const router = express.Router();
import { getDashboardStats } from '../controllers/dashboardController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { schoolValidityMiddleware } from '../middlewares/schoolMiddleware.js';

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

router.get('/stats', getDashboardStats);

export default router;
