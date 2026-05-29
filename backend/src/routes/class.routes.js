const express = require('express');
const router = express.Router();
const { getClasses, createClass, createSection, deleteSection, updateClass, updateSection } = require('../controllers/classController');
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
router.put('/:classId', updateClass);
router.put('/sections/:sectionId', updateSection);
router.delete('/sections/:sectionId', deleteSection);

module.exports = router;
