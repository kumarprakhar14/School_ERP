import prisma from '../utils/db.js';
import { NotFoundError, BadRequestError } from '../errors/index.js';
import { notifyUser, notifySchoolByRoles } from '../services/notificationService.js';

export const generateUpiUri = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const schoolId = req.user.schoolId;

    const invoice = await prisma.feeInvoice.findFirst({
      where: { id: invoiceId, schoolId }
    });
    
    if (!invoice) throw new NotFoundError('Invoice not found');

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { settings: true }
    });

    if (!school?.settings?.upiId) {
      throw new BadRequestError('UPI ID is not configured for this school. Please contact administration.');
    }

    const { upiId, merchantName } = school.settings;
    
    // Calculate pending amount
    const payments = await prisma.payment.findMany({
      where: { invoiceId, status: 'SUCCESS' }
    });
    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const dueAmount = invoice.totalAmount - paidAmount;

    if (dueAmount <= 0) {
      throw new BadRequestError('Invoice is already paid');
    }

    // Format amount in INR decimals
    const amountStr = (dueAmount / 100).toFixed(2);
    
    // Build UPI URI
    const pn = encodeURIComponent(merchantName || school.name);
    const tn = encodeURIComponent(`Fee Payment for Inv ${invoice.invoiceNumber}`);
    const tr = `TXN${Date.now()}`;
    
    const uri = `upi://pay?pa=${upiId}&pn=${pn}&am=${amountStr}&cu=INR&tn=${tn}&tr=${tr}`;

    res.json({
      uri,
      amount: dueAmount,
      upiId,
      merchantName: merchantName || school.name,
      invoiceNumber: invoice.invoiceNumber
    });
  } catch (error) {
    next(error);
  }
};

export const submitPayment = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const { utr } = req.body;
    const schoolId = req.user.schoolId;

    if (!utr) throw new BadRequestError('UTR number is required');

    const invoice = await prisma.feeInvoice.findFirst({
      where: { id: invoiceId, schoolId }
    });

    if (!invoice) throw new NotFoundError('Invoice not found');

    const payments = await prisma.payment.findMany({
      where: { invoiceId, status: 'SUCCESS' }
    });
    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const dueAmount = invoice.totalAmount - paidAmount;

    if (dueAmount <= 0) {
      throw new BadRequestError('Invoice is already paid');
    }

    let screenshotUrl = null;
    if (req.file) {
      screenshotUrl = req.file.path; // Cloudinary URL
    }

    const payment = await prisma.payment.create({
      data: {
        schoolId,
        invoiceId,
        amount: dueAmount,
        paymentMode: 'UPI',
        utr,
        screenshotUrl,
        status: 'PENDING_VERIFICATION',
        paidAt: new Date(),
        receivedBy: req.user.userId
      }
    });

    res.status(201).json({ message: 'Payment submitted successfully', payment });

    notifySchoolByRoles(
      schoolId,
      ['ADMIN', 'ACCOUNTS'],
      {
        title: 'New UPI Payment Submitted',
        body: `A new UPI payment of ₹${(dueAmount / 100).toFixed(2)} is pending verification for Invoice ${invoice.invoiceNumber}.`,
        category: 'fees'
      },
      { entityType: 'payment', entityId: payment.id }
    ).catch(err => console.error('[Push] Submit payment notify failed:', err));

  } catch (error) {
    next(error);
  }
};

export const getPendingPayments = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const payments = await prisma.payment.findMany({
      where: { schoolId, status: 'PENDING_VERIFICATION' },
      include: {
        invoice: {
          include: {
            student: { select: { name: true, erpId: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(payments);
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    const schoolId = req.user.schoolId;

    if (!['approve', 'reject'].includes(action)) {
      throw new BadRequestError('Invalid action. Must be approve or reject.');
    }

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, schoolId },
      include: { invoice: true }
    });

    if (!payment) throw new NotFoundError('Payment not found');
    if (payment.status !== 'PENDING_VERIFICATION') {
      throw new BadRequestError(`Payment is already ${payment.status}`);
    }

    const newStatus = action === 'approve' ? 'SUCCESS' : 'REJECTED';
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: newStatus }
    });

    res.json({ message: `Payment ${action}d successfully`, payment: updated });

    // Notify student
    const title = action === 'approve' ? '✅ Payment Approved' : '❌ Payment Rejected';
    const body = action === 'approve' 
      ? `Your payment for invoice ${payment.invoice.invoiceNumber} has been verified.`
      : `Your payment for invoice ${payment.invoice.invoiceNumber} was rejected. Please contact the school.`;

    notifyUser(
      payment.invoice.studentId,
      { title, body, category: 'fees' },
      { entityType: 'payment', entityId: payment.id }
    ).catch(err => console.error('[Push] Verify payment notify failed:', err));

  } catch (error) {
    next(error);
  }
};
