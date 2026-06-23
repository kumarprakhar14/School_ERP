import prisma from '../utils/db.js';
import { NotFoundError } from '../errors/index.js';

export const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    let whereClause = { id, schoolId };
    
    // Students can only access their own invoices
    if (req.user.role === 'STUDENT') {
      whereClause.studentId = req.user.userId;
    }

    const invoice = await prisma.feeInvoice.findFirst({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            erpId: true,
            contactDetails: true,
            studentProfile: {
              include: {
                section: {
                  include: {
                    class: true
                  }
                }
              }
            }
          }
        },
        creator: {
          select: {
            id: true,
            name: true
          }
        },
        payments: {
          orderBy: {
            paidAt: 'desc'
          }
        }
      }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found or you do not have permission to access it');
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { settings: true }
    });

    // Standard API response
    res.json({
      success: true,
      message: 'Invoice fetched successfully',
      data: {
        ...invoice,
        school
      }
    });
  } catch (error) {
    next(error);
  }
};
