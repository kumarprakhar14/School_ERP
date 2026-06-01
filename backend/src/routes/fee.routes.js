import express from 'express';
const router = express.Router();
import { createFeeRecord, getFees, markFeePaid, getFeeSummary } from '../controllers/feeController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';
import { schoolValidityMiddleware } from '../middlewares/schoolMiddleware.js';
import { validate } from '../validators/validate.js';
import { createFeeSchema, markFeePaidSchema } from '../validators/feeSchemas.js';

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

router.get('/', getFees);
router.get('/summary', getFeeSummary);
router.post('/', roleMiddleware(['ADMIN', 'ACCOUNTS']), validate({ body: createFeeSchema }), createFeeRecord);
router.put('/:feeId/pay', roleMiddleware(['ADMIN', 'ACCOUNTS']), validate({ body: markFeePaidSchema }), markFeePaid);

export default router;
