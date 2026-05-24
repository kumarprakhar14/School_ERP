const express = require('express');
const router = express.Router();
const { createAssignment, getAssignments, submitAssignment } = require('../controllers/assignmentController');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');
const { schoolValidityMiddleware } = require('../middlewares/schoolMiddleware');
const { upload } = require('../utils/cloudinary');

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

router.get('/', getAssignments);
router.post('/', roleMiddleware(['TEACHER', 'ADMIN']), upload.single('file'), createAssignment);
router.post('/:assignmentId/submit', roleMiddleware(['STUDENT']), upload.single('file'), submitAssignment);

module.exports = router;
