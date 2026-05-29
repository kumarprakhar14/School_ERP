const express = require('express');
const router = express.Router();
const { createFeeRecord, getFees, markFeePaid, getFeeSummary } = require('../controllers/feeController');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');
const { schoolValidityMiddleware } = require('../middlewares/schoolMiddleware');

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

router.get('/', getFees);
router.get('/summary', getFeeSummary);
router.post('/', roleMiddleware(['ADMIN', 'ACCOUNTS']), createFeeRecord);
router.put('/:feeId/pay', roleMiddleware(['ADMIN', 'ACCOUNTS']), markFeePaid);

module.exports = router;
