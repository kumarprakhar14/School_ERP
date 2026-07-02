import prisma from '../utils/db.js';
import { queryLogger } from '../utils/queryLogger.js';

export class FeeReportRepository {
  static async getCollectionSummary(schoolId, startDate, endDate, filters = {}) {
    return await queryLogger.measure('FeeReportRepository.getCollectionSummary', async () => {
      // Find all invoices that belong to the school and match optional filters
      const where = {
        schoolId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      };
      
      // Calculate total expected amount (sum of all totalAmount for invoices created in this period)
      const expectedAmountResult = await prisma.feeInvoice.aggregate({
        _sum: { totalAmount: true },
        where
      });
      const expectedAmount = expectedAmountResult._sum.totalAmount || 0;

      // Calculate total collected amount (sum of all successful payments in this period)
      // Note: Payment date is based on paidAt
      const paymentWhere = {
        schoolId,
        status: 'SUCCESS',
        paidAt: {
          gte: startDate,
          lte: endDate
        }
      };

      const collectedAmountResult = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: paymentWhere
      });
      const collectedAmount = collectedAmountResult._sum.amount || 0;

      // Outstanding amount could be expected - collected if they strictly overlap,
      // but realistically outstanding is per invoice (total - paid so far).
      // Since this is a summary for a period, we can define outstanding for those invoices created in this period:
      // However, a raw query is safer if we want exact outstanding for the filtered invoices.
      
      const invoices = await prisma.feeInvoice.findMany({
        where,
        select: {
          totalAmount: true,
          payments: {
            where: { status: 'SUCCESS' },
            select: { amount: true }
          }
        }
      });
      
      let outstandingAmount = 0;
      invoices.forEach(inv => {
        const paidForThisInvoice = inv.payments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = inv.totalAmount - paidForThisInvoice;
        if (remaining > 0) outstandingAmount += remaining;
      });

      return {
        expectedAmount,
        collectedAmount,
        outstandingAmount
      };
    });
  }

  static async getPaymentMethods(schoolId, startDate, endDate) {
    return await queryLogger.measure('FeeReportRepository.getPaymentMethods', async () => {
      return await prisma.payment.groupBy({
        by: ['paymentMode'],
        where: {
          schoolId,
          status: 'SUCCESS',
          paidAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          amount: true
        }
      });
    });
  }

  static async getDefaulters(schoolId, startDate, endDate, filters = {}) {
    return await queryLogger.measure('FeeReportRepository.getDefaulters', async () => {
      // Find invoices due within the given period that have an outstanding balance > 0
      // Due to the complexity of nested sums, we use raw SQL.
      // We calculate daysOverdue against the *current date* as requested.
      
      return await prisma.$queryRaw`
        SELECT 
          f.id,
          f."studentId",
          u.name as "studentName",
          c.name as "className",
          s.name as "sectionName",
          f."dueDate",
          (f."totalAmount" - COALESCE((
            SELECT SUM(p.amount) 
            FROM "Payment" p 
            WHERE p."invoiceId" = f.id AND p.status = 'SUCCESS'
          ), 0)) as "pendingAmount",
          EXTRACT(DAY FROM (CURRENT_DATE - f."dueDate")) as "daysOverdue"
        FROM "FeeInvoice" f
        JOIN "User" u ON f."studentId" = u.id
        LEFT JOIN "StudentProfile" sp ON sp."userId" = u.id
        LEFT JOIN "Section" s ON sp."sectionId" = s.id
        LEFT JOIN "Class" c ON s."classId" = c.id
        WHERE f."schoolId" = ${schoolId}
          AND f."dueDate" IS NOT NULL
          AND f."dueDate" >= ${startDate}
          AND f."dueDate" <= ${endDate}
          AND f."dueDate" < CURRENT_DATE
          AND (f."totalAmount" - COALESCE((
            SELECT SUM(p.amount) 
            FROM "Payment" p 
            WHERE p."invoiceId" = f.id AND p.status = 'SUCCESS'
          ), 0)) > 0
        ORDER BY "daysOverdue" DESC
      `;
    });
  }
}
