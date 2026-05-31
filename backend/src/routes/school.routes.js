const express = require('express');
const router = express.Router();
const { getSchools, getSchoolById, createSchool, updateSchool, deleteSchool, getSchoolSettings, updateSchoolSettings } = require('../controllers/schoolController');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');
const { schoolValidityMiddleware } = require('../middlewares/schoolMiddleware');

router.use(authMiddleware);

// Admin routes for settings
router.get('/settings', schoolValidityMiddleware, roleMiddleware(['ADMIN']), getSchoolSettings);
router.put('/settings', schoolValidityMiddleware, roleMiddleware(['ADMIN']), updateSchoolSettings);

// Super Admin routes for school CRUD
router.get('/', roleMiddleware(['SUPER_ADMIN']), getSchools);
router.get('/:id', roleMiddleware(['SUPER_ADMIN']), getSchoolById);
router.post('/', roleMiddleware(['SUPER_ADMIN']), createSchool);
router.put('/:id', roleMiddleware(['SUPER_ADMIN']), updateSchool);
router.delete('/:id', roleMiddleware(['SUPER_ADMIN']), deleteSchool);

module.exports = router;
