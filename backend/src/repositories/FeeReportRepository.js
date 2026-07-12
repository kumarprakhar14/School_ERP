import prisma from '../utils/db.js';
import { queryLogger } from '../utils/queryLogger.js';

export class FeeReportRepository {
  static async getCollectionSummary(schoolId, startDate, endDate, filters = {}) {
    return await queryLogger.measure('FeeReportRepository.getCollectionSummary', async () => {
      // Build the invoice filter: invoices whose dueDate falls in the selected period
      const where = {
        schoolId,
        dueDate: {
          gte: startDate,
          lte: endDate
        }
      };

      // Apply class/section filters via student → studentProfile → section → class
      if (filters.sectionId) {
        where.student = {
          studentProfile: { sectionId: filters.sectionId }
        };
      } else if (filters.classId) {
        where.student = {
          studentProfile: { section: { classId: filters.classId } }
        };
      }

      // Fetch the selected invoices with their ALL-TIME successful payments
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

      // Compute all three metrics from the SAME invoice population
      let expectedAmount = 0;
      let collectedAmount = 0;

      invoices.forEach(inv => {
        expectedAmount += inv.totalAmount;
        collectedAmount += inv.payments.reduce((sum, p) => sum + p.amount, 0);
      });

      // Outstanding is derived, not queried separately — guarantees Expected - Collected = Outstanding
      const outstandingAmount = Math.max(0, expectedAmount - collectedAmount);

      return {
        expectedAmount,
        collectedAmount,
        outstandingAmount
      };
    });
  }

  static async getPaymentMethods(schoolId, startDate, endDate, filters = {}) {
    return await queryLogger.measure('FeeReportRepository.getPaymentMethods', async () => {
      // Build filter: payments linked to invoices whose dueDate falls in the period
      const where = {
        schoolId,
        status: 'SUCCESS',
        invoice: {
          dueDate: {
            gte: startDate,
            lte: endDate
          }
        }
      };

      // Apply class/section filters via invoice → student → studentProfile → section → class
      if (filters.sectionId) {
        where.invoice.student = {
          studentProfile: { sectionId: filters.sectionId }
        };
      } else if (filters.classId) {
        where.invoice.student = {
          studentProfile: { section: { classId: filters.classId } }
        };
      }

      return await prisma.payment.groupBy({
        by: ['paymentMode'],
        where,
        _sum: {
          amount: true
        }
      });
    });
  }

  static async getDefaulters(schoolId, startDate, endDate, filters = {}) {
    return await queryLogger.measure('FeeReportRepository.getDefaulters', async () => {
      // Build class/section filter conditions for the raw SQL
      const classFilterJoin = (filters.classId || filters.sectionId)
        ? `JOIN "StudentProfile" sp ON sp."userId" = u.id
           LEFT JOIN "Section" sec ON sp."sectionId" = sec.id
           LEFT JOIN "Class" cls ON sec."classId" = cls.id`
        : `LEFT JOIN "StudentProfile" sp ON sp."userId" = u.id
           LEFT JOIN "Section" sec ON sp."sectionId" = sec.id
           LEFT JOIN "Class" cls ON sec."classId" = cls.id`;

      let classFilterWhere = '';
      const params = [schoolId, startDate, endDate];

      if (filters.sectionId) {
        classFilterWhere = `AND sp."sectionId" = $4`;
        params.push(filters.sectionId);
      } else if (filters.classId) {
        classFilterWhere = `AND sec."classId" = $4`;
        params.push(filters.classId);
      }

      // Use $queryRawUnsafe since we need dynamic WHERE clauses
      const query = `
        SELECT 
          f.id,
          f."studentId",
          u.name as "studentName",
          cls.name as "className",
          sec.name as "sectionName",
          f."dueDate",
          (f."totalAmount" - COALESCE((
            SELECT SUM(p.amount) 
            FROM "Payment" p 
            WHERE p."invoiceId" = f.id AND p.status = 'SUCCESS'
          ), 0)) as "pendingAmount",
          EXTRACT(DAY FROM (CURRENT_DATE - f."dueDate")) as "daysOverdue"
        FROM "FeeInvoice" f
        JOIN "User" u ON f."studentId" = u.id
        ${classFilterJoin}
        WHERE f."schoolId" = $1
          AND f."dueDate" IS NOT NULL
          AND f."dueDate" >= $2
          AND f."dueDate" <= $3
          AND f."dueDate" < CURRENT_DATE
          ${classFilterWhere}
          AND (f."totalAmount" - COALESCE((
            SELECT SUM(p.amount) 
            FROM "Payment" p 
            WHERE p."invoiceId" = f.id AND p.status = 'SUCCESS'
          ), 0)) > 0
        ORDER BY "daysOverdue" DESC
      `;

      return await prisma.$queryRawUnsafe(query, ...params);
    });
  }
}

