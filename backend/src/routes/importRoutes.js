const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware.js');
const importController = require('../controllers/importController.js');

// Setup multer to store file in memory
const upload = multer({ storage: multer.memoryStorage() });

// All import routes are protected and admin-only
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN', 'SUPER_ADMIN'])); // Both can technically import if desired, but usually ADMIN

router.get('/template/:type', importController.getTemplate);

router.post('/students', upload.single('file'), importController.uploadStudents);
router.post('/teachers', upload.single('file'), importController.uploadTeachers);
router.post('/fees', upload.single('file'), importController.uploadFees);

module.exports = router;
