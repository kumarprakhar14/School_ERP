import express from 'express';
const router = express.Router();
import { 
  getClasses, 
  createClass, 
  createSection, 
  deleteSection, 
  updateClass, 
  updateSection,
  getSectionStudents,
  getClassStudents
} from '../controllers/classController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';
import { schoolValidityMiddleware } from '../middlewares/schoolMiddleware.js';
import { validate } from '../validators/validate.js';
import { createClassSchema, createSectionSchema, updateClassSchema, updateSectionSchema } from '../validators/classSchemas.js';

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

// All roles in the school can view classes/sections (useful for teachers/students)
router.get('/', getClasses);
router.get('/sections/:sectionId/students', getSectionStudents);
router.get('/:classId/students', getClassStudents);

// Only ADMIN can create classes and sections
router.use(roleMiddleware(['ADMIN']));
router.post('/', validate({ body: createClassSchema }), createClass);
router.post('/:classId/sections', validate({ body: createSectionSchema }), createSection);
router.put('/:classId', validate({ body: updateClassSchema }), updateClass);
router.put('/sections/:sectionId', validate({ body: updateSectionSchema }), updateSection);
router.delete('/sections/:sectionId', deleteSection);

export default router;
