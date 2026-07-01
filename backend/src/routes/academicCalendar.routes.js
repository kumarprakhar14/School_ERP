import express from 'express';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';
import academicCalendarController from '../controllers/academicCalendarController.js';
import {validate} from '../validators/validate.js';
import { createOverrideSchema, updateOverrideSchema } from '../validators/academicCalendarSchemas.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get effective status for a specific date (Query param: date)
router.get('/status', academicCalendarController.getStatusForDate);

// Get effective status for today
router.get('/today', academicCalendarController.getTodayStatus);

// List overrides (with optional query filters: startDate, endDate)
router.get('/', academicCalendarController.listOverrides);

// Super Admin / Admin only routes
router.use(roleMiddleware(['SUPER_ADMIN', 'ADMIN']));

// Create new override
router.post('/', validate({ body: createOverrideSchema }), academicCalendarController.createOverride);

// Update existing override
router.put('/:id', validate({ body: updateOverrideSchema }), academicCalendarController.updateOverride);

// Delete override
router.delete('/:id', academicCalendarController.deleteOverride);

export default router;
