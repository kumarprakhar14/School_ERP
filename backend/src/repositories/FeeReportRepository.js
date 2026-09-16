import prisma from '../utils/db.js';
import { queryLogger } from '../utils/queryLogger.js';

export class FeeReportRepository {
  static async getCollectionSummary(schoolId, startDate, endDate, filters = {}) {
    return await queryLogger.measure('FeeReportRepository.getCollectionSummary', async () => {
      // DB-level aggregation — avoids loading all invoices into Node
      const where = {
        schoolId,
        dueDate: { gte: startDate, lte: endDate }
      };
      if (filters.sectionId) {
        where.student = { studentProfile: { sectionId: filters.sectionId } };
      } else if (filters.classId) {
        where.student = { studentProfile: { section: { classId: filters.classId } } };
      }

      const agg = await prisma.feeInvoice.aggregate({
        where,
        _sum: { totalAmount: true }
      });
      const expectedAmount = agg._sum.totalAmount || 0;

      // Collected = sum of SUCCESS payments for same invoice set at DB level
      const payAgg = await prisma.payment.aggregate({
        where: {
          schoolId,
          status: 'SUCCESS',
          invoice: {
            dueDate: { gte: startDate, lte: endDate },
            ...(filters.sectionId ? { student: { studentProfile: { sectionId: filters.sectionId } } } : {}),
            ...(filters.classId && !filters.sectionId ? { student: { studentProfile: { section: { classId: filters.classId } } } } : {}),
          }
        },
        _sum: { amount: true }
      });
      const collectedAmount = payAgg._sum.amount || 0;
      const outstandingAmount = Math.max(0, expectedAmount - collectedAmount);
      return { expectedAmount, collectedAmount, outstandingAmount };
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

  static async getDefaulters(schoolId, startDate, endDate, filters = {}, pagination = null) {
    return await queryLogger.measure('FeeReportRepository.getDefaulters', async () => {
      // Standardize to LEFT JOIN always — students without profile are not dropped
      const classFilterJoin = `LEFT JOIN "StudentProfile" sp ON sp."userId" = u.id
           LEFT JOIN "Section" sec ON sp."sectionId" = sec.id
           LEFT JOIN "Class" cls ON sec."classId" = cls.id`;

      const params = [schoolId, startDate, endDate];
      let classFilterWhere = '';
      if (filters.sectionId) {
        classFilterWhere = `AND sp."sectionId" = $4`;
        params.push(filters.sectionId);
      } else if (filters.classId) {
        classFilterWhere = `AND sec."classId" = $4`;
        params.push(filters.classId);
      }

      const q = (pagination?.q || pagination?.search || filters.q || '').trim();
      let searchWhere = '';
      if (q) {
        const idx = params.length + 1;
        params.push(`%${q}%`);
        searchWhere = `AND (u.name ILIKE $${idx} OR u."erpId" ILIKE $${idx} OR cls.name ILIKE $${idx} OR sec.name ILIKE $${idx})`;
      }

      const sortMap = {
        daysOverdue: '"daysOverdue"',
        dueDate: 'f."dueDate"',
        pendingAmount: '"pendingAmount"',
        studentName: 'u.name',
      };
      const sortBy = sortMap[pagination?.sortBy] || '"daysOverdue"';
      const order = (pagination?.order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      // Deterministic secondary sorts
      const orderBy = `ORDER BY ${sortBy} ${order}, f."dueDate" ASC, f.id ASC`;

      const base = `
        SELECT 
          f.id,
          f."studentId",
          u.name as "studentName",
          u."erpId" as "studentErpId",
          cls.name as "className",
          sec.name as "sectionName",
          f."dueDate",
          (f."totalAmount" - COALESCE((
            SELECT SUM(p.amount) 
            FROM "Payment" p 
            WHERE p."invoiceId" = f.id AND p.status = 'SUCCESS'
          ), 0)) as "pendingAmount",
          (CURRENT_DATE - f."dueDate")::int as "daysOverdue"
        FROM "FeeInvoice" f
        JOIN "User" u ON f."studentId" = u.id
        ${classFilterJoin}
        WHERE f."schoolId" = $1
          AND f."dueDate" IS NOT NULL
          AND f."dueDate" >= $2
          AND f."dueDate" <= $3
          AND f."dueDate" < CURRENT_DATE
          ${classFilterWhere}
          ${searchWhere}
          AND (f."totalAmount" - COALESCE((
            SELECT SUM(p.amount) 
            FROM "Payment" p 
            WHERE p."invoiceId" = f.id AND p.status = 'SUCCESS'
          ), 0)) > 0
      `;

      if (!pagination) {
        const query = `${base} ${orderBy}`;
        return await prisma.$queryRawUnsafe(query, ...params);
      }

      const page = Math.max(1, Number(pagination.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(pagination.limit) || 20));
      const offset = (page - 1) * limit;

      const countQuery = `SELECT COUNT(*)::int as total FROM (${base}) t`;
      const countParams = [...params];
      const [countRows, rows] = await Promise.all([
        prisma.$queryRawUnsafe(countQuery, ...countParams),
        prisma.$queryRawUnsafe(`${base} ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, ...params, limit, offset),
      ]);
      const total = countRows[0]?.total ?? 0;
      return { data: rows, total };
    });
  }
}

