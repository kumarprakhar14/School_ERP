const express = require('express');
const router = express.Router();
const { markAttendance, getAttendance, lockAttendance, unlockAttendance, saveAttendance } = require('../controllers/attendanceController');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');
const { schoolValidityMiddleware } = require('../middlewares/schoolMiddleware');
const { validate } = require('../validators/validate');
const { markAttendanceSchema, attendanceStateSchema } = require('../validators/attendanceSchemas');

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

router.get('/', getAttendance);
router.post('/', roleMiddleware(['ADMIN', 'TEACHER']), validate({ body: markAttendanceSchema }), markAttendance);
router.put('/lock', roleMiddleware(['ADMIN', 'TEACHER']), validate({ body: attendanceStateSchema }), lockAttendance);
router.put('/unlock', roleMiddleware(['ADMIN', 'TEACHER']), validate({ body: attendanceStateSchema }), unlockAttendance);
router.put('/save', roleMiddleware(['ADMIN', 'TEACHER']), validate({ body: attendanceStateSchema }), saveAttendance);

module.exports = router;
