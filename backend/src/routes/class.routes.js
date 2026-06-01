const express = require('express');
const router = express.Router();
const { getClasses, createClass, createSection, deleteSection, updateClass, updateSection } = require('../controllers/classController');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');
const { schoolValidityMiddleware } = require('../middlewares/schoolMiddleware');
const { validate } = require('../validators/validate');
const { createClassSchema, createSectionSchema, updateClassSchema, updateSectionSchema } = require('../validators/classSchemas');

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

// All roles in the school can view classes/sections (useful for teachers/students)
router.get('/', getClasses);

// Only ADMIN can create classes and sections
router.use(roleMiddleware(['ADMIN']));
router.post('/', validate({ body: createClassSchema }), createClass);
router.post('/:classId/sections', validate({ body: createSectionSchema }), createSection);
router.put('/:classId', validate({ body: updateClassSchema }), updateClass);
router.put('/sections/:sectionId', validate({ body: updateSectionSchema }), updateSection);
router.delete('/sections/:sectionId', deleteSection);

module.exports = router;
