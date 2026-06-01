import express from 'express';
const router = express.Router();
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';
import { schoolValidityMiddleware } from '../middlewares/schoolMiddleware.js';
import { upload } from '../utils/cloudinary.js';
import { submitBug, getAllBugs, updateBugStatus } from '../controllers/bugController.js';
import { validate } from '../validators/validate.js';
import { submitBugSchema, updateBugStatusSchema } from '../validators/bugSchemas.js';

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

// Submit a bug report (Authenticated users)
// Note: validation runs after multer parses multipart form data
router.post('/', upload.array('screenshots', 3), validate({ body: submitBugSchema }), submitBug);

// Super Admin routes
router.use(roleMiddleware(['SUPER_ADMIN']));
router.get('/', getAllBugs);
router.patch('/:id/status', validate({ body: updateBugStatusSchema }), updateBugStatus);

export default router;
