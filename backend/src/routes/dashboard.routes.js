import express from 'express';
const router = express.Router();
import { getDashboardStats, getAccountsDashboardStats } from '../controllers/dashboardController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';
import { schoolValidityMiddleware } from '../middlewares/schoolMiddleware.js';

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

router.get('/stats', getDashboardStats);
router.get('/accounts', roleMiddleware(['ACCOUNTS']), getAccountsDashboardStats);

export default router;
