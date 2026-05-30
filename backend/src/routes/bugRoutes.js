const express = require('express');
const router = express.Router();
const { protect, roleMiddleware, authMiddleware } = require('../middlewares/authMiddleware');
const { upload } = require('../utils/cloudinary');
const bugController = require('../controllers/bugController');

// Submit a bug report (Authenticated users)
router.post('/', authMiddleware, upload.array('screenshots', 3), bugController.submitBug);

// Super Admin routes
router.get('/', authMiddleware, roleMiddleware(['SUPER_ADMIN']), bugController.getAllBugs);
router.patch('/:id/status', authMiddleware, roleMiddleware(['SUPER_ADMIN']), bugController.updateBugStatus);

module.exports = router;
