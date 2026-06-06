import express from 'express';
const router = express.Router();
import { createInvoice, recordPayment, getFeeSummary, getTransactionHistory, updateInvoice, deleteInvoice, updatePayment, deletePayment } from '../controllers/feeController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';
import { schoolValidityMiddleware } from '../middlewares/schoolMiddleware.js';
import { validate } from '../validators/validate.js';
import { createInvoiceSchema, recordPaymentSchema } from '../validators/feeSchemas.js';

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

router.get('/summary', getFeeSummary);
router.get('/history', getTransactionHistory);
router.post('/invoice', roleMiddleware(['ADMIN', 'ACCOUNTS']), validate({ body: createInvoiceSchema }), createInvoice);
router.put('/invoice/:id', roleMiddleware(['ADMIN', 'ACCOUNTS']), updateInvoice);
router.delete('/invoice/:id', roleMiddleware(['ADMIN', 'ACCOUNTS']), deleteInvoice);

router.post('/payment', roleMiddleware(['ADMIN', 'ACCOUNTS']), validate({ body: recordPaymentSchema }), recordPayment);
router.put('/payment/:id', roleMiddleware(['ADMIN', 'ACCOUNTS']), updatePayment);
router.delete('/payment/:id', roleMiddleware(['ADMIN', 'ACCOUNTS']), deletePayment);

export default router;
