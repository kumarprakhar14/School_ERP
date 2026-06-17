import express from 'express';
const router = express.Router();
import { createInvoice, recordPayment, getFeeSummary, getTransactionHistory, updateInvoice, deleteInvoice, updatePayment, deletePayment } from '../controllers/feeController.js';
import { generateUpiUri, submitPayment, getPendingPayments, verifyPayment } from '../controllers/paymentController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';
import { schoolValidityMiddleware } from '../middlewares/schoolMiddleware.js';
import { validate } from '../validators/validate.js';
import { createInvoiceSchema, recordPaymentSchema } from '../validators/feeSchemas.js';
import { upload } from '../utils/cloudinary.js';

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

// UPI Payment Routes
router.get('/upi/pending', roleMiddleware(['ADMIN', 'ACCOUNTS']), getPendingPayments);
router.get('/upi/:invoiceId/uri', generateUpiUri);
router.post('/upi/:invoiceId/submit', upload.single('screenshot'), submitPayment);
router.post('/upi/:paymentId/verify', roleMiddleware(['ADMIN', 'ACCOUNTS']), verifyPayment);

export default router;
