import express from 'express';
const router = express.Router();
import { createInvoice, recordPayment, getFeeSummary, getTransactionHistory } from '../controllers/feeController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';
import { schoolValidityMiddleware } from '../middlewares/schoolMiddleware.js';
import { validate } from '../validators/validate.js';
import { createInvoiceSchema, recordPaymentSchema } from '../validators/feeSchemas.js';

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

router.get('/summary', getFeeSummary);
router.get('/history', getTransactionHistory);
router.post('/invoice', roleMiddleware(['ADMIN', 'ACCOUNTS']), validate({ body: createInvoiceSchema }), createInvoice);
router.post('/payment', roleMiddleware(['ADMIN', 'ACCOUNTS']), validate({ body: recordPaymentSchema }), recordPayment);

export default router;
