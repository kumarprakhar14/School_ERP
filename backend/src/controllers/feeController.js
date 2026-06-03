import prisma from '../utils/db.js';
import crypto from 'crypto';
import { ForbiddenError, NotFoundError } from '../errors/index.js';

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
        totalAmount: parseFloat(amount),
        month: parseInt(month),
        year: parseInt(year),
        dueDate: dueDate ? new Date(dueDate) : null,
        remarks,
        createdBy: req.user.userId
      }
    });

    res.status(201).json(invoice);
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
        amount: parseFloat(amount),
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
      
      let status = 'PAID';
      if (dueAmount > 0) {
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
        student: { select: { name: true, erpId: true, studentProfile: { include: { section: { include: { class: true } } } } } },
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

export { createInvoice, recordPayment, getFeeSummary, getTransactionHistory };
