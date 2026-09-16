import prisma from '../utils/db.js';
import { queryLogger } from '../utils/queryLogger.js';

/**
 * TransactionHistoryRepository — UNION ALL at DB level for fees/history.
 * Merges invoices and payments chronologically, paginated at DB.
 * Replaces JS flatten+sort over full dataset.
 */
export class TransactionHistoryRepository {
  /**
   * @param {string} schoolId
   * @param {object} opts { page, limit, q, studentId, status, paymentMode, fromDate, toDate, sortBy, order }
   * @returns {{data:Array, total:number}}
   */
  static async getPaginated(schoolId, opts = {}) {
    return await queryLogger.measure('TransactionHistoryRepository.getPaginated', async () => {
      const page = opts.page || 1;
      const limit = opts.limit || 20;
      const offset = (page - 1) * limit;
      const q = (opts.q || opts.search || '').trim();
      const studentId = opts.studentId || null;
      const status = opts.status || null;
      const paymentMode = opts.paymentMode || null;
      const fromDate = opts.fromDate ? new Date(opts.fromDate) : null;
      const toDate = opts.toDate ? new Date(opts.toDate) : null;
      const sortBy = opts.sortBy || 'date';
      const order = (opts.order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Sort mapping — only date is canonical (merged stream)
      // For amount/invoiceNumber we also support but across union
      const sortMap = {
        date: 't.date',
        amount: 't.amount',
        invoiceNumber: 't."invoiceNumber"',
      };
      const sortExpr = sortMap[sortBy] || sortMap.date;

      const params = [];
      let idx = 1;

      // Invoice fragment params
      const schoolParam1 = `$${idx++}`;
      params.push(schoolId);

      let invWhere = `f."schoolId" = ${schoolParam1}`;
      if (studentId) {
        const p = `$${idx++}`;
        params.push(studentId);
        invWhere += ` AND f."studentId" = ${p}`;
      }
      if (fromDate) {
        const p = `$${idx++}`;
        params.push(fromDate);
        invWhere += ` AND f."createdAt" >= ${p}`;
      }
      if (toDate) {
        const p = `$${idx++}`;
        params.push(toDate);
        invWhere += ` AND f."createdAt" <= ${p}`;
      }
      if (q) {
        const p = `$${idx++}`;
        params.push(`%${q}%`);
        // Search across invoiceNumber, student name/erpId, remarks
        invWhere += ` AND (f."invoiceNumber" ILIKE ${p} OR u.name ILIKE ${p} OR u."erpId" ILIKE ${p} OR f.remarks ILIKE ${p})`;
      }

      // Payment fragment params — re-use schoolId but need joins
      // We'll build second fragment with same schoolId param but new indexes after
      // For UNION we need contiguous params array — build query string with placeholders already pushed

      // Build payment where
      // Note: need to handle status/paymentMode filters only for payments
      let payWhere = `f2."schoolId" = ${schoolParam1}`; // reuse first schoolId param
      if (studentId) {
        // studentId param already pushed — need to reference same index as inv studentId param
        // Find its index — we pushed studentId at idx-? Let's track
        // Simpler: push duplicate param for pay leg
        const p = `$${idx++}`;
        params.push(studentId);
        payWhere += ` AND f2."studentId" = ${p}`;
      }
      if (fromDate) {
        const p = `$${idx++}`;
        params.push(fromDate);
        payWhere += ` AND p."paidAt" >= ${p}`;
      }
      if (toDate) {
        const p = `$${idx++}`;
        params.push(toDate);
        payWhere += ` AND p."paidAt" <= ${p}`;
      }
      if (q) {
        const p = `$${idx++}`;
        params.push(`%${q}%`);
        payWhere += ` AND (p."referenceNo" ILIKE ${p} OR p.utr ILIKE ${p} OR f2."invoiceNumber" ILIKE ${p} OR u2.name ILIKE ${p} OR u2."erpId" ILIKE ${p} OR p.remarks ILIKE ${p})`;
      }
      if (status) {
        const p = `$${idx++}`;
        params.push(status);
        payWhere += ` AND p.status = ${p}`;
      }
      if (paymentMode) {
        const p = `$${idx++}`;
        params.push(paymentMode);
        payWhere += ` AND p."paymentMode" = ${p}`;
      }

      // For count we need same UNION without LIMIT
      // Prefix: keep schoolId param shared? Actually params array order matters for $queryRawUnsafe
      // We'll build full union query with params in order pushed above.

      // Unfortunately param indexes for payWhere reused schoolParam1 but we pushed duplicates for others — indexes are correct as pushed
      // Rebuild invWhere payWhere strings already contain correct $n

      const unionBase = `
        SELECT f.id, 'Invoice'::text as type, f."invoiceNumber", f."totalAmount" as amount, f."createdAt" as date,
               f."dueDate", f.remarks, f.month, f.year,
               u.id as "studentId", u.name as "studentName", u."erpId" as "studentErpId",
               NULL as "paymentMode", NULL as "referenceNo", NULL as utr, NULL as "screenshotUrl", NULL as status,
               cr.name as "creatorName",
               sp."sectionId" as "sectionId", sec."classId" as "classId"
        FROM "FeeInvoice" f
        JOIN "User" u ON f."studentId" = u.id
        LEFT JOIN "StudentProfile" sp ON sp."userId" = u.id
        LEFT JOIN "Section" sec ON sp."sectionId" = sec.id
        LEFT JOIN "Class" cls ON sec."classId" = cls.id
        LEFT JOIN "User" cr ON f."createdBy" = cr.id
        WHERE ${invWhere}
        UNION ALL
        SELECT p.id, 'Payment'::text as type, f2."invoiceNumber", p.amount, p."paidAt" as date,
               NULL as "dueDate", p.remarks, NULL as month, NULL as year,
               u2.id as "studentId", u2.name as "studentName", u2."erpId" as "studentErpId",
               p."paymentMode", p."referenceNo", p.utr, p."screenshotUrl", p.status,
               NULL as "creatorName",
               sp2."sectionId" as "sectionId", sec2."classId" as "classId"
        FROM "Payment" p
        JOIN "FeeInvoice" f2 ON p."invoiceId" = f2.id
        JOIN "User" u2 ON f2."studentId" = u2.id
        LEFT JOIN "StudentProfile" sp2 ON sp2."userId" = u2.id
        LEFT JOIN "Section" sec2 ON sp2."sectionId" = sec2.id
        LEFT JOIN "Class" cls2 ON sec2."classId" = cls2.id
        WHERE ${payWhere}
      `;

      const orderBy = `ORDER BY ${sortExpr} ${order}, t.id ASC`;

      // Count
      const countQuery = `SELECT COUNT(*)::int as total FROM (${unionBase}) t`;
      // Data with pagination
      const limitP = `$${idx++}`;
      const offsetP = `$${idx++}`;
      params.push(limit, offset);
      const dataQuery = `SELECT t.* FROM (${unionBase}) t ${orderBy} LIMIT ${limitP} OFFSET ${offsetP}`;

      const [countRows, rows] = await Promise.all([
        prisma.$queryRawUnsafe(countQuery, ...params.slice(0, params.length - 2)),
        prisma.$queryRawUnsafe(dataQuery, ...params),
      ]);

      const total = countRows[0]?.total ?? 0;

      // Map to legacy shape expected by FE (preserve invoiceNumber, student nested)
      const data = rows.map(r => {
        const baseStudent = {
          id: r.studentId,
          name: r.studentName,
          erpId: r.studentErpId,
          // studentProfile not loaded fully for list — keep minimal; detail fetch does full
          studentProfile: r.sectionId ? { section: { id: r.sectionId, class: r.classId ? { id: r.classId } : null } } : null,
        };
        if (r.type === 'Invoice') {
          return {
            id: r.id,
            type: 'Invoice',
            invoiceNumber: r.invoiceNumber,
            amount: Number(r.amount),
            date: r.date,
            dueDate: r.dueDate,
            remarks: r.remarks,
            month: r.month,
            year: r.year,
            student: baseStudent,
            creator: r.creatorName ? { name: r.creatorName } : null,
          };
        } else {
          return {
            id: r.id,
            type: 'Payment',
            invoiceNumber: r.invoiceNumber,
            amount: Number(r.amount),
            date: r.date,
            paymentMode: r.paymentMode,
            referenceNo: r.referenceNo,
            utr: r.utr,
            screenshotUrl: r.screenshotUrl,
            remarks: r.remarks,
            status: r.status,
            student: baseStudent,
          };
        }
      });

      return { data, total };
    });
  }
}
