import prisma from '../utils/db.js';
import { queryLogger } from '../utils/queryLogger.js';

/**
 * FeeSummaryRepository — DB-level aggregation for fees/summary.
 * Replaces JS loop over all students×invoices×payments with single SQL
 * GROUP BY per student. Supports pagination, search, status, class/section,
 * stable ordering, and exact total count with same filters.
 *
 * Fixed semantics vs legacy JS:
 *  - strict p.status='SUCCESS' only (legacy treated null as SUCCESS)
 *  - OVERDUE uses CURRENT_DATE at DB (vs new Date() JS) — UTC
 *  - classDetails derived from class/section names via JOIN
 */
export class FeeSummaryRepository {
  /**
   * @param {string} schoolId
   * @param {object} opts { page, limit, q, status, classId, sectionId, sortBy, order, studentId? (self-scoped) }
   * @returns {{data:Array, total:number}}
   */
  static async getPaginated(schoolId, opts = {}) {
    return await queryLogger.measure('FeeSummaryRepository.getPaginated', async () => {
      const page = opts.page || 1;
      const limit = opts.limit || 20;
      const offset = (page - 1) * limit;
      const q = (opts.q || opts.search || '').trim();
      const statusFilter = opts.status || null;
      const classId = opts.classId || null;
      const sectionId = opts.sectionId || null;
      const sortBy = opts.sortBy || 'name';
      const order = (opts.order || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      const studentId = opts.studentId || null; // when STUDENT role, restrict to self

      // Whitelisted sort columns — maps to SQL expression
      const sortMap = {
        name: 'base."studentName"',
        erpId: 'base."erpId"',
        totalAmount: 'base."totalAmount"',
        dueAmount: 'base."dueAmount"',
        dueDate: 'base."earliestPending"',
        status: 'base."status"',
      };
      const sortExpr = sortMap[sortBy] || sortMap.name;

      // Common CTE base without LIMIT/OFFSET for count + data share
      // We build WHERE fragments with param indexes
      const params = [];
      let idx = 1;

      const schoolParam = `$${idx++}`;
      params.push(schoolId);

      // Build search fragment
      let searchWhere = '';
      let searchParamIdx = null;
      if (q) {
        searchParamIdx = idx++;
        params.push(`%${q}%`);
        searchWhere = `AND (u.name ILIKE $${searchParamIdx} OR u."erpId" ILIKE $${searchParamIdx} OR cls.name ILIKE $${searchParamIdx} OR sec.name ILIKE $${searchParamIdx})`;
      }

      let classSectionWhere = '';
      if (sectionId) {
        const pIdx = idx++;
        params.push(sectionId);
        classSectionWhere = `AND sp."sectionId" = $${pIdx}`;
      } else if (classId) {
        const pIdx = idx++;
        params.push(classId);
        classSectionWhere = `AND sec."classId" = $${pIdx}`;
      }

      let studentWhere = '';
      if (studentId) {
        const pIdx = idx++;
        params.push(studentId);
        studentWhere = `AND u.id = $${pIdx}`;
      }

      // Active students only
      // Base subquery: per-student aggregates
      // Note: pendingAmount computed per-invoice vs total — we use per-student SUMs
      const baseSelect = `
        SELECT
          u.id as "studentId",
          u.name as "studentName",
          u."erpId" as "erpId",
          cls.name as "className",
          sec.name as "sectionName",
          COALESCE(SUM(f."totalAmount"), 0)::bigint as "totalAmount",
          COALESCE(SUM(sub.paid), 0)::bigint as "totalPaid",
          (COALESCE(SUM(f."totalAmount"), 0) - COALESCE(SUM(sub.paid), 0))::bigint as "dueAmount",
          MIN(CASE WHEN sub.paid IS NOT NULL AND sub.paid < f."totalAmount" THEN f."dueDate" END) as "earliestPending",
          CASE
            WHEN COUNT(f.id) = 0 THEN 'NO_FEES'
            WHEN (COALESCE(SUM(f."totalAmount"),0) - COALESCE(SUM(sub.paid),0)) <= 0 THEN 'PAID'
            WHEN MIN(CASE WHEN sub.paid IS NOT NULL AND sub.paid < f."totalAmount" THEN f."dueDate" END) IS NOT NULL
                 AND MIN(CASE WHEN sub.paid IS NOT NULL AND sub.paid < f."totalAmount" THEN f."dueDate" END) < CURRENT_DATE
            THEN 'OVERDUE'
            WHEN COALESCE(SUM(sub.paid),0) > 0 THEN 'PARTIALLY_PAID'
            ELSE 'PENDING'
          END as "status"
        FROM "User" u
        LEFT JOIN "StudentProfile" sp ON sp."userId" = u.id
        LEFT JOIN "Section" sec ON sp."sectionId" = sec.id
        LEFT JOIN "Class" cls ON sec."classId" = cls.id
        LEFT JOIN "FeeInvoice" f ON f."studentId" = u.id
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(p.amount),0) as paid FROM "Payment" p WHERE p."invoiceId" = f.id AND p.status = 'SUCCESS'
        ) sub ON true
        WHERE u."schoolId" = ${schoolParam}
          AND u.role = 'STUDENT'
          AND u."isActive" = true
          ${studentWhere}
          ${searchWhere}
          ${classSectionWhere}
        GROUP BY u.id, u.name, u."erpId", cls.name, sec.name
      `;

      // Wrap for status filter (HAVING vs WHERE on aggregated alias)
      let statusFilterClause = '';
      let statusParamIdx = null;
      if (statusFilter) {
        statusParamIdx = idx++;
        params.push(statusFilter);
        statusFilterClause = `WHERE base."status" = $${statusParamIdx}`;
      }

      // Order by — deterministic secondary id ASC
      // Need to guarantee stable pagination when primary ties
      const orderBy = `ORDER BY ${sortExpr} ${order}, base."studentId" ASC`;

      // Count query — same filters, count of students matching
      const countQuery = `SELECT COUNT(*)::int as total FROM (${baseSelect}) base ${statusFilterClause}`;

      // Data query — base + status filter + order + limit/offset
      const limitParamIdx = idx++;
      const offsetParamIdx = idx++;
      params.push(limit, offset);
      const dataQuery = `SELECT * FROM (${baseSelect}) base ${statusFilterClause} ${orderBy} LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`;

      const countParams = params.slice(0, params.length - 2);
      const [countRows, rows] = await Promise.all([
        prisma.$queryRawUnsafe(countQuery, ...countParams),
        prisma.$queryRawUnsafe(dataQuery, ...params),
      ]);

      const total = countRows[0]?.total ?? 0;

      // Map to legacy API shape to preserve domain fields
      const data = rows.map(r => ({
        student: {
          id: r.studentId,
          name: r.studentName,
          erpId: r.erpId,
          classDetails: r.className && r.sectionName ? `${r.className} - ${r.sectionName}` : (r.className || r.sectionName || 'N/A'),
        },
        totalAmount: Number(r.totalAmount || 0),
        dueAmount: Number(r.dueAmount || 0),
        dueDate: r.earliestPending,
        status: r.status,
      }));

      return { data, total };
    });
  }
}
