import prisma from '../utils/db.js';
import crypto from 'crypto';
import { ForbiddenError, NotFoundError } from '../errors/index.js';
import { notifyUser } from '../services/notificationService.js';

const createInvoice = async (req, res, next) => {
  try {
    const { studentId, amount, month, year, remarks, dueDate } = req.body;
    const schoolId = req.user.schoolId;

    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        schoolId,
        role: 'STUDENT'
      }
    });
    if (!student) {
      throw new NotFoundError('Student not found');
    }
    
    const invoiceNumber = `INV-${year}-${month}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

    const invoice = await prisma.feeInvoice.create({
      data: {
        invoiceNumber,
        schoolId,
        studentId,
        totalAmount: Math.round(parseFloat(amount) * 100),
        month: parseInt(month),
        year: parseInt(year),
        dueDate: dueDate ? new Date(dueDate) : null,
        remarks,
        createdBy: req.user.userId
      }
    });

    res.status(201).json(invoice);

    // Fire-and-forget: Push notification to the student
    notifyUser(studentId, {
      title: '💰 New Fee Invoice',
      body: 'A new fee invoice has been generated. Tap to view.',
      url: '/fees',
      category: 'fees',
    }).catch(err => console.error('[Push] Fee notify failed:', err));
  } catch (error) {
    next(error);
  }
};

const recordPayment = async (req, res, next) => {
  try {
    const { invoiceId, amount, paymentMode, referenceNo, remarks } = req.body;
    const schoolId = req.user.schoolId;

    const invoice = await prisma.feeInvoice.findFirst({
      where: { id: invoiceId, schoolId }
    });
    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }
    
    const payment = await prisma.payment.create({
      data: {
        schoolId,
        invoiceId,
        amount: Math.round(parseFloat(amount) * 100),
        paymentMode: paymentMode || null,
        referenceNo: referenceNo || null,
        remarks,
        paidAt: new Date(),
        receivedBy: req.user.userId
      }
    });

    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
};

const getFeeSummary = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    
    let studentsWhere = { schoolId, role: 'STUDENT', isActive: true };
    if (req.user.role === 'STUDENT') {
      studentsWhere.id = req.user.userId;
    }
    
    const students = await prisma.user.findMany({
      where: studentsWhere,
      select: {
        id: true,
        name: true,
        erpId: true,
        studentProfile: {
          include: { section: { include: { class: true } } }
        },
        feeInvoices: {
          include: { payments: true }
        }
      }
    });

    const summary = students.map(student => {
      let totalAmount = 0;
      let totalPaid = 0;
      let earliestPending = null;

      student.feeInvoices.forEach(inv => {
        totalAmount += inv.totalAmount;
        let invoicePaid = 0;
        inv.payments.forEach(p => invoicePaid += p.amount);
        totalPaid += invoicePaid;

        if (invoicePaid < inv.totalAmount) {
           if (inv.dueDate && (!earliestPending || inv.dueDate < earliestPending)) {
             earliestPending = inv.dueDate;
           }
        }
      });

      const dueAmount = totalAmount - totalPaid;
      
      let status;
      if (student.feeInvoices.length === 0) {
        status = 'NO_FEES';
      } else if (dueAmount <= 0) {
        status = 'PAID';
      } else {
        if (totalPaid > 0) status = 'PARTIALLY_PAID';
        else status = 'PENDING';

        if (earliestPending && earliestPending < new Date()) {
          status = 'OVERDUE';
        }
      }

      return {
        student: {
          id: student.id,
          name: student.name,
          erpId: student.erpId,
          classDetails: student.studentProfile?.section ? `${student.studentProfile.section.class.name} - ${student.studentProfile.section.name}` : 'N/A'
        },
        totalAmount,
        dueAmount,
        dueDate: earliestPending,
        status
      };
    });

    res.json(summary);
  } catch (error) {
    next(error);
  }
};

const getTransactionHistory = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    let studentId = req.query.studentId;

    if (req.user.role === 'STUDENT') {
      studentId = req.user.userId;
    }
    
    let whereClause = { schoolId };
    if (studentId) whereClause.studentId = studentId;

    const invoices = await prisma.feeInvoice.findMany({
      where: whereClause,
      include: {
        student: { select: { id: true, name: true, erpId: true, studentProfile: { include: { section: { include: { class: true } } } } } },
        creator: { select: { name: true } },
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });

    let history = [];
    invoices.forEach(inv => {
      history.push({
        id: inv.id,
        type: 'Invoice',
        invoiceNumber: inv.invoiceNumber,
        amount: inv.totalAmount,
        date: inv.createdAt,
        dueDate: inv.dueDate,
        remarks: inv.remarks,
        month: inv.month,
        year: inv.year,
        student: inv.student,
        creator: inv.creator
      });
      inv.payments.forEach(pay => {
        history.push({
          id: pay.id,
          type: 'Payment',
          invoiceNumber: inv.invoiceNumber,
          amount: pay.amount,
          date: pay.paidAt,
          paymentMode: pay.paymentMode,
          referenceNo: pay.referenceNo,
          remarks: pay.remarks,
          student: inv.student,
        });
      });
    });

    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(history);
  } catch (error) {
    next(error);
  }
};

const updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, month, year, remarks, dueDate } = req.body;
    const schoolId = req.user.schoolId;

    const invoice = await prisma.feeInvoice.findFirst({ where: { id, schoolId } });
    if (!invoice) throw new NotFoundError('Invoice not found');

    const updated = await prisma.feeInvoice.update({
      where: { id },
      data: {
        totalAmount: Math.round(parseFloat(amount) * 100),
        month: parseInt(month),
        year: parseInt(year),
        dueDate: dueDate ? new Date(dueDate) : null,
        remarks
      }
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const invoice = await prisma.feeInvoice.findFirst({ where: { id, schoolId } });
    if (!invoice) throw new NotFoundError('Invoice not found');

    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { invoiceId: id } }),
      prisma.feeInvoice.delete({ where: { id } })
    ]);

    res.json({ message: 'Invoice and associated payments deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const updatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, paymentMode, referenceNo, remarks } = req.body;
    const schoolId = req.user.schoolId;

    const payment = await prisma.payment.findFirst({ where: { id, schoolId } });
    if (!payment) throw new NotFoundError('Payment not found');

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        amount: Math.round(parseFloat(amount) * 100),
        paymentMode: paymentMode || null,
        referenceNo: referenceNo || null,
        remarks
      }
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deletePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const payment = await prisma.payment.findFirst({ where: { id, schoolId } });
    if (!payment) throw new NotFoundError('Payment not found');

    await prisma.payment.delete({ where: { id } });
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export { createInvoice, recordPayment, getFeeSummary, getTransactionHistory, updateInvoice, deleteInvoice, updatePayment, deletePayment };
