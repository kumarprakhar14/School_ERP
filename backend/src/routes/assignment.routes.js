import express from 'express';
const router = express.Router();
import { 
  createAssignment, 
  getAssignments, 
  submitAssignment,
  getAssignmentSubmissions
} from '../controllers/assignmentController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';
import { schoolValidityMiddleware } from '../middlewares/schoolMiddleware.js';
import { upload } from '../utils/cloudinary.js';
import { validate } from '../validators/validate.js';
import { createAssignmentSchema } from '../validators/assignmentSchemas.js';

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

router.get('/', getAssignments);
router.get('/:assignmentId/submissions', roleMiddleware(['TEACHER', 'ADMIN']), getAssignmentSubmissions);
// Validation runs after multer parses multipart form data
router.post('/', roleMiddleware(['TEACHER', 'ADMIN']), upload.single('file'), validate({ body: createAssignmentSchema }), createAssignment);
router.post('/:assignmentId/submit', roleMiddleware(['STUDENT']), upload.single('file'), submitAssignment);

export default router;
