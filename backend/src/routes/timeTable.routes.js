const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');
const { schoolValidityMiddleware } = require('../middlewares/schoolMiddleware');
const {
  getSubjects, createSubject, deleteSubject,
  getPeriods, createPeriod, updatePeriod, deletePeriod,
  getTimeTable, createTimeTableEntry, deleteTimeTableEntry
} = require('../controllers/timeTableController');

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

// Public (within school)
router.get('/subjects', getSubjects);
router.get('/periods', getPeriods);
router.get('/', getTimeTable);

// Admin Only
router.use(roleMiddleware(['ADMIN']));
router.post('/subjects', createSubject);
router.delete('/subjects/:id', deleteSubject);

router.post('/periods', createPeriod);
router.put('/periods/:id', updatePeriod);
router.delete('/periods/:id', deletePeriod);

router.post('/', createTimeTableEntry);
router.delete('/:id', deleteTimeTableEntry);

module.exports = router;
