import prisma from '../utils/db.js';
import { NotFoundError } from '../errors/index.js';

export const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    let whereClause = { id, schoolId };

    const payment = await prisma.payment.findFirst({
      where: whereClause,
      include: {
        invoice: {
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
            }
          }
        },
        receiver: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!payment) {
      throw new NotFoundError('Payment not found or you do not have permission to access it');
    }

    // Students can only access their own payments
    if (req.user.role === 'STUDENT' && payment.invoice.student.id !== req.user.userId) {
      throw new NotFoundError('Payment not found or you do not have permission to access it');
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { settings: true }
    });

    // Generate a deterministic receipt number based on the creation date and ID
    const year = new Date(payment.createdAt).getFullYear();
    const shortId = payment.id.substring(0, 8).toUpperCase();
    const receiptNumber = `REC-${year}-${shortId}`;

    res.json({
      success: true,
      message: 'Payment fetched successfully',
      data: {
        ...payment,
        school,
        receiptNumber
      }
    });
  } catch (error) {
    next(error);
  }
};
