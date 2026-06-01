import express from 'express';
const router = express.Router();
import { markAttendance, getAttendance, lockAttendance, unlockAttendance, saveAttendance } from '../controllers/attendanceController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';
import { schoolValidityMiddleware } from '../middlewares/schoolMiddleware.js';
import { validate } from '../validators/validate.js';
import { markAttendanceSchema, attendanceStateSchema } from '../validators/attendanceSchemas.js';

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

router.get('/', getAttendance);
router.post('/', roleMiddleware(['ADMIN', 'TEACHER']), validate({ body: markAttendanceSchema }), markAttendance);
router.put('/lock', roleMiddleware(['ADMIN', 'TEACHER']), validate({ body: attendanceStateSchema }), lockAttendance);
router.put('/unlock', roleMiddleware(['ADMIN', 'TEACHER']), validate({ body: attendanceStateSchema }), unlockAttendance);
router.put('/save', roleMiddleware(['ADMIN', 'TEACHER']), validate({ body: attendanceStateSchema }), saveAttendance);

export default router;
