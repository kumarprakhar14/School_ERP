const express = require('express');
const router = express.Router();
const { markAttendance, getAttendance, lockAttendance, unlockAttendance, saveAttendance } = require('../controllers/attendanceController');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');
const { schoolValidityMiddleware } = require('../middlewares/schoolMiddleware');

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

router.get('/', getAttendance);
router.post('/', roleMiddleware(['ADMIN', 'TEACHER']), markAttendance);
router.put('/lock', roleMiddleware(['ADMIN', 'TEACHER']), lockAttendance);
router.put('/unlock', roleMiddleware(['ADMIN', 'TEACHER']), unlockAttendance);
router.put('/save', roleMiddleware(['ADMIN', 'TEACHER']), saveAttendance);

module.exports = router;
