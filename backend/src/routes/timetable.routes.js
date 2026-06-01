const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');
const { schoolValidityMiddleware } = require('../middlewares/schoolMiddleware');
const {
  getSubjects, createSubject, deleteSubject,
  getPeriods, createPeriod, updatePeriod, deletePeriod,
  getTimeTable, createTimeTableEntry, deleteTimeTableEntry
} = require('../controllers/timeTableController');
const { validate } = require('../validators/validate');
const { createSubjectSchema, createPeriodSchema, updatePeriodSchema, createTimeTableEntrySchema } = require('../validators/timetableSchemas');

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

// Public (within school)
router.get('/subjects', getSubjects);
router.get('/periods', getPeriods);
router.get('/', getTimeTable);

// Admin Only
router.use(roleMiddleware(['ADMIN']));
router.post('/subjects', validate({ body: createSubjectSchema }), createSubject);
router.delete('/subjects/:id', deleteSubject);

router.post('/periods', validate({ body: createPeriodSchema }), createPeriod);
router.put('/periods/:id', validate({ body: updatePeriodSchema }), updatePeriod);
router.delete('/periods/:id', deletePeriod);

router.post('/', validate({ body: createTimeTableEntrySchema }), createTimeTableEntry);
router.delete('/:id', deleteTimeTableEntry);

module.exports = router;
