const express = require('express');
const router = express.Router();
const { markAttendance, getAttendance } = require('../controllers/attendanceController');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');
const { schoolValidityMiddleware } = require('../middlewares/schoolMiddleware');

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

router.get('/', getAttendance);
router.post('/', roleMiddleware(['ADMIN', 'TEACHER']), markAttendance);

module.exports = router;
