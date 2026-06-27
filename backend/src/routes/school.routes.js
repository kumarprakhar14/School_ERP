import express from 'express';
const router = express.Router();
import { getSchools, getSchoolById, createSchool, updateSchool, deleteSchool, disableSchool, enableSchool, archiveSchool, restoreSchool, getSchoolSettings, updateSchoolSettings } from '../controllers/schoolController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';
import { schoolValidityMiddleware } from '../middlewares/schoolMiddleware.js';
import { validate } from '../validators/validate.js';
import { createSchoolSchema, updateSchoolSchema, updateSchoolSettingsSchema } from '../validators/schoolSchemas.js';

router.use(authMiddleware);

// Admin routes for settings
import { upload } from '../utils/cloudinary.js';
router.get('/settings', schoolValidityMiddleware, roleMiddleware(['ADMIN']), getSchoolSettings);
router.put('/settings', schoolValidityMiddleware, roleMiddleware(['ADMIN']), upload.single('logo'), validate({ body: updateSchoolSettingsSchema }), updateSchoolSettings);

// Super Admin routes for school CRUD
router.get('/', roleMiddleware(['SUPER_ADMIN']), getSchools);
router.get('/:id', roleMiddleware(['SUPER_ADMIN']), getSchoolById);
router.post('/', roleMiddleware(['SUPER_ADMIN']), validate({ body: createSchoolSchema }), createSchool);
router.put('/:id', roleMiddleware(['SUPER_ADMIN']), validate({ body: updateSchoolSchema }), updateSchool);
router.delete('/:id', roleMiddleware(['SUPER_ADMIN']), deleteSchool);
router.patch('/:id/disable', roleMiddleware(['SUPER_ADMIN']), disableSchool);
router.patch('/:id/enable', roleMiddleware(['SUPER_ADMIN']), enableSchool);
router.patch('/:id/archive', roleMiddleware(['SUPER_ADMIN']), archiveSchool);
router.patch('/:id/restore', roleMiddleware(['SUPER_ADMIN']), restoreSchool);

export default router;
