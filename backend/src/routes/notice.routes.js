const express = require('express');
const router = express.Router();
const { createNotice, getNotices } = require('../controllers/noticeController');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');
const { schoolValidityMiddleware } = require('../middlewares/schoolMiddleware');
const { validate } = require('../validators/validate');
const { createNoticeSchema } = require('../validators/noticeSchemas');

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

router.get('/', getNotices);
router.post('/', roleMiddleware(['ADMIN', 'TEACHER']), validate({ body: createNoticeSchema }), createNotice);

module.exports = router;
