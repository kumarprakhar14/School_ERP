import express from 'express';
const router = express.Router();
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';
import { schoolValidityMiddleware } from '../middlewares/schoolMiddleware.js';
import {
  getSubjects, createSubject, deleteSubject,
  getPeriods, createPeriod, updatePeriod, deletePeriod,
  getTimeTable, createTimeTableEntry, deleteTimeTableEntry
} from '../controllers/timeTableController.js';
import { validate } from '../validators/validate.js';
import { createSubjectSchema, createPeriodSchema, updatePeriodSchema, createTimeTableEntrySchema } from '../validators/timetableSchemas.js';

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

export default router;
