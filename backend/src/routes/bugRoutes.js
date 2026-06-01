const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');
const { schoolValidityMiddleware } = require('../middlewares/schoolMiddleware');
const { upload } = require('../utils/cloudinary');
const bugController = require('../controllers/bugController');
const { validate } = require('../validators/validate');
const { submitBugSchema, updateBugStatusSchema } = require('../validators/bugSchemas');

// Submit a bug report (Authenticated users)
// Note: validation runs after multer parses multipart form data
router.post('/', authMiddleware, upload.array('screenshots', 3), validate({ body: submitBugSchema }), bugController.submitBug);

// Super Admin routes
router.get('/', authMiddleware, roleMiddleware(['SUPER_ADMIN']), bugController.getAllBugs);
router.patch('/:id/status', authMiddleware, roleMiddleware(['SUPER_ADMIN']), validate({ body: updateBugStatusSchema }), bugController.updateBugStatus);

module.exports = router;
