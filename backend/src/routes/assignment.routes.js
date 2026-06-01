const express = require('express');
const router = express.Router();
const { 
  createAssignment, 
  getAssignments, 
  submitAssignment,
  getAssignmentSubmissions
} = require('../controllers/assignmentController');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');
const { schoolValidityMiddleware } = require('../middlewares/schoolMiddleware');
const { upload } = require('../utils/cloudinary');
const { validate } = require('../validators/validate');
const { createAssignmentSchema } = require('../validators/assignmentSchemas');

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

router.get('/', getAssignments);
router.get('/:assignmentId/submissions', roleMiddleware(['TEACHER', 'ADMIN']), getAssignmentSubmissions);
// Validation runs after multer parses multipart form data
router.post('/', roleMiddleware(['TEACHER', 'ADMIN']), upload.single('file'), validate({ body: createAssignmentSchema }), createAssignment);
router.post('/:assignmentId/submit', roleMiddleware(['STUDENT']), upload.single('file'), submitAssignment);

module.exports = router;
