import express from 'express';
const router = express.Router();
import multer from 'multer';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';
import { schoolValidityMiddleware } from '../middlewares/schoolMiddleware.js';
import { 
  getTemplate, 
  uploadStudents, 
  uploadTeachers, 
  uploadFees,
  validateFees,
  matchFees,
  reconcileMatching,
  resolveAmbiguity,
  previewFees,
  confirmFees,
  getAmbiguousRows
} from '../controllers/importController.js';

// Setup multer to store file in memory
const upload = multer({ storage: multer.memoryStorage() });

// All import routes are protected and admin-only
router.use(authMiddleware);
router.use(schoolValidityMiddleware); // Fix: was missing — expired schools could import data
router.use(roleMiddleware(['ADMIN', 'SUPER_ADMIN']));

router.get('/template/:type', getTemplate);

router.post('/students', upload.single('file'), uploadStudents);
router.post('/teachers', upload.single('file'), uploadTeachers);
router.post('/fees/upload', upload.single('file'), uploadFees);
router.post('/fees/:jobId/validate', validateFees);
router.post('/fees/:jobId/match', matchFees);
router.post('/fees/:jobId/reconcile-matching', reconcileMatching);
router.post('/fees/:jobId/resolve', resolveAmbiguity);
router.get('/fees/:jobId/ambiguous-rows', getAmbiguousRows);
router.post('/fees/:jobId/preview', previewFees);
router.post('/fees/:jobId/confirm', confirmFees);

export default router;
