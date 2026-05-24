const prisma = require('../utils/db');

const createFeeRecord = async (req, res) => {
  try {
    const { studentId, amount, dueDate, remarks } = req.body;
    
    const feeRecord = await prisma.feeRecord.create({
      data: {
        studentId,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        remarks,
        status: 'PENDING'
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
        student: { select: { name: true, erpId: true, studentProfile: { include: { section: { include: { class: true } } } } } }
      },
      orderBy: { dueDate: 'asc' }
    });

    res.json(fees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markFeePaid = async (req, res) => {
  try {
    const { feeId } = req.params;
    
    const feeRecord = await prisma.feeRecord.update({
      where: { id: feeId },
      data: {
        status: 'PAID',
        paidDate: new Date()
      }
    });

    res.json(feeRecord);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { createFeeRecord, getFees, markFeePaid };
