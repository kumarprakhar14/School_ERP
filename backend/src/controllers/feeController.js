import prisma from '../utils/db.js';
import { ForbiddenError, NotFoundError } from '../errors/index.js';

const createFeeRecord = async (req, res, next) => {
  try {
    const { studentId, amount, month, year, remarks, paymentMode, referenceNo, status } = req.body;
    const schoolId = req.user.schoolId;

    // Check whether a student belongs to the same school as the user
    // Otherwise, a malicious admin from school A can create record for student of school B
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
    
    const feeRecord = await prisma.feeRecord.create({
      data: {
        schoolId,
        studentId,
        amount: parseFloat(amount),
        month: parseInt(month),
        year: parseInt(year),
        remarks,
        status: status || 'PENDING',
        paymentMode: paymentMode || null,
        referenceNo: referenceNo || null,
        paidAt: status === 'PAID' ? new Date() : null,
        createdBy: req.user.userId
      }
    });

    res.status(201).json(feeRecord);
  } catch (error) {
    next(error);
  }
};

const getFees = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    let whereClause = {
      student: { schoolId }
    };

    if (req.user.role === 'STUDENT') {
      whereClause.studentId = req.user.userId;
    }

    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    let queryOptions = {
      where: whereClause,
      include: {
        student: { select: { name: true, erpId: true, studentProfile: { include: { section: { include: { class: true } } } } } },
        creator: { select: { name: true } }
      },
      orderBy: { year: 'desc' }
    };

    if (page && limit) {
      const totalCount = await prisma.feeRecord.count({ where: whereClause });
      res.setHeader('X-Total-Count', totalCount);
      res.setHeader('X-Total-Pages', Math.ceil(totalCount / limit));
      res.setHeader('X-Current-Page', page);
      res.setHeader('X-Limit', limit);

      queryOptions.skip = (page - 1) * limit;
      queryOptions.take = limit;
    }

    const fees = await prisma.feeRecord.findMany(queryOptions);
    res.json(fees);
  } catch (error) {
    next(error);
  }
};

// Fix 5: Enforce schoolId on markFeePaid
const markFeePaid = async (req, res, next) => {
  try {
    const { feeId } = req.params;
    const { paymentMode, referenceNo } = req.body;
    const schoolId = req.user.schoolId;

    // Fix 5: Verify fee record belongs to user's school
    const existing = await prisma.feeRecord.findFirst({
      where: { id: feeId, schoolId }
    });
    if (!existing) {
      throw new NotFoundError('Fee record');
    }
    
    const feeRecord = await prisma.feeRecord.update({
      where: { id: feeId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentMode: paymentMode || undefined,
        referenceNo: referenceNo || undefined,
        updatedBy: req.user.userId
      }
    });

    res.json(feeRecord);
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
        feeRecords: true
      }
    });

    const summary = students.map(student => {
      let totalAmount = 0;
      let dueAmount = 0;
      let hasOverdue = false;
      let earliestPending = null;

      student.feeRecords.forEach(record => {
        totalAmount += record.amount;
        if (record.status === 'PENDING' || record.status === 'OVERDUE') {
          dueAmount += record.amount;
          if (record.status === 'OVERDUE') hasOverdue = true;
          
          const recordDate = new Date(record.year, record.month - 1, 10);
          if (!earliestPending || recordDate < earliestPending) {
            earliestPending = recordDate;
          }
        }
      });

      let status = 'PAID';
      if (dueAmount > 0) {
        status = hasOverdue || (earliestPending && earliestPending < new Date()) ? 'OVERDUE' : 'PENDING';
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

export { createFeeRecord, getFees, markFeePaid, getFeeSummary  };
