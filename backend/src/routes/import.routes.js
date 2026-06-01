import express from 'express';
const router = express.Router();
import multer from 'multer';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';
import { schoolValidityMiddleware } from '../middlewares/schoolMiddleware.js';
import { getTemplate, uploadStudents, uploadTeachers, uploadFees } from '../controllers/importController.js';

// Setup multer to store file in memory
const upload = multer({ storage: multer.memoryStorage() });

// All import routes are protected and admin-only
router.use(authMiddleware);
router.use(schoolValidityMiddleware); // Fix: was missing — expired schools could import data
router.use(roleMiddleware(['ADMIN', 'SUPER_ADMIN']));

router.get('/template/:type', getTemplate);

router.post('/students', upload.single('file'), uploadStudents);
router.post('/teachers', upload.single('file'), uploadTeachers);
router.post('/fees', upload.single('file'), uploadFees);

export default router;
