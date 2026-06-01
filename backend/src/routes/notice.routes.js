import express from 'express';
const router = express.Router();
import { createNotice, getNotices } from '../controllers/noticeController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';
import { schoolValidityMiddleware } from '../middlewares/schoolMiddleware.js';
import { validate } from '../validators/validate.js';
import { createNoticeSchema } from '../validators/noticeSchemas.js';

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

router.get('/', getNotices);
router.post('/', roleMiddleware(['ADMIN', 'TEACHER']), validate({ body: createNoticeSchema }), createNotice);

export default router;
