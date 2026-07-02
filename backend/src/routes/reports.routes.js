import express from 'express';
import {
  getAttendanceSummary,
  getAttendanceRanking,
  getLowAttendance,
  getChronicAbsentees,
  getComparativeAttendance,
  getFeeCollectionSummary,
  getFeePaymentMethods,
  getFeeDefaulters
} from '../controllers/reportsController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';
import { schoolValidityMiddleware } from '../middlewares/schoolMiddleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

// --- ATTENDANCE REPORTS ---
// Accessible by ADMIN only
const attendanceRoles = ['ADMIN'];

router.get('/attendance/summary', roleMiddleware(attendanceRoles), getAttendanceSummary);
router.get('/attendance/ranking', roleMiddleware(attendanceRoles), getAttendanceRanking);
router.get('/attendance/low-attendance', roleMiddleware(attendanceRoles), getLowAttendance);
router.get('/attendance/chronic-absentees', roleMiddleware(attendanceRoles), getChronicAbsentees);
router.get('/attendance/comparative', roleMiddleware(attendanceRoles), getComparativeAttendance);

// --- FEE REPORTS ---
// Accessible by ADMIN, and ACCOUNTS
const feeRoles = ['ADMIN', 'ACCOUNTS'];

router.get('/fees/collection-summary', roleMiddleware(feeRoles), getFeeCollectionSummary);
router.get('/fees/payment-methods', roleMiddleware(feeRoles), getFeePaymentMethods);
router.get('/fees/defaulters', roleMiddleware(feeRoles), getFeeDefaulters);

export default router;
