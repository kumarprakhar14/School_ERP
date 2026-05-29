const prisma = require('../utils/db');

const createFeeRecord = async (req, res) => {
  try {
    const { studentId, amount, month, year, remarks, paymentMode, referenceNo, status } = req.body;
    const schoolId = req.user.schoolId;
    
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
    res.status(400).json({ message: error.message });
  }
};

const getFees = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    let whereClause = {
      student: { schoolId }
    };

    if (req.user.role === 'STUDENT') {
      whereClause.studentId = req.user.userId;
    }

    const fees = await prisma.feeRecord.findMany({
      where: whereClause,
      include: {
        student: { select: { name: true, erpId: true, studentProfile: { include: { section: { include: { class: true } } } } } },
        creator: { select: { name: true } }
      },
      orderBy: { year: 'desc' }
    });

    res.json(fees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markFeePaid = async (req, res) => {
  try {
    const { feeId } = req.params;
    const { paymentMode, referenceNo } = req.body;
    
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
    res.status(400).json({ message: error.message });
  }
};

const getFeeSummary = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    
    // Fetch all students for the school
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
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createFeeRecord, getFees, markFeePaid, getFeeSummary };
