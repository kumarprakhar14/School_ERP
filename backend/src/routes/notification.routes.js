import express from 'express';
const router = express.Router();
import { getNotifications, markAsRead } from '../controllers/notificationController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

router.use(authMiddleware);

router.get('/', getNotifications);
router.put('/read', markAsRead);

export default router;
