const express = require('express');
const router = express.Router();
const { getClasses, createClass, createSection } = require('../controllers/classController');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');
const { schoolValidityMiddleware } = require('../middlewares/schoolMiddleware');

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

// All roles in the school can view classes/sections (useful for teachers/students)
router.get('/', getClasses);

// Only ADMIN can create classes and sections
router.use(roleMiddleware(['ADMIN']));
router.post('/', createClass);
router.post('/:classId/sections', createSection);

module.exports = router;
