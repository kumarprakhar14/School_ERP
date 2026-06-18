import { Router } from 'express';
import billingController from '../controllers/billing.controller.js';
import { authMiddleware as protect, roleMiddleware as authorize } from '../middlewares/authMiddleware.js';

const router = Router();

// Super Admin & Admin routes
router.use(protect);

// Get all orders (Super Admin only)
router.get('/orders', authorize(['SUPER_ADMIN']), billingController.getAllOrders);

// Get orders for a specific school (Super Admin or that School's Admin)
router.get('/orders/school/:schoolId', authorize(['SUPER_ADMIN', 'ADMIN']), billingController.getSchoolOrders);

// Create an order
router.post('/orders', authorize(['SUPER_ADMIN', 'ADMIN']), billingController.createOrder);

// Cancel an order
router.post('/orders/:id/cancel', authorize(['SUPER_ADMIN', 'ADMIN']), billingController.cancelOrder);

// Simulate a provider verification (This replaces /dummy-webhook)
router.post('/orders/:id/simulate', authorize(['SUPER_ADMIN']), billingController.simulatePayment);

export default router;
