import prisma from '../utils/db.js';
import { queryLogger } from '../utils/queryLogger.js';

export class AttendanceReportRepository {
  static async getSummary(schoolId, startDate, endDate, filters = {}) {
    return await queryLogger.measure('AttendanceReportRepository.getSummary', async () => {
      const where = {
        section: {
          class: { schoolId }
        },
        date: {
          gte: startDate,
          lte: endDate
        }
      };

      if (filters.classId) where.section.classId = filters.classId;
      if (filters.sectionId) where.sectionId = filters.sectionId;

      const aggregations = await prisma.attendance.groupBy({
        by: ['status'],
        where,
        _count: {
          status: true
        }
      });

      let presentCount = 0;
      let absentCount = 0;
      let leaveCount = 0;

      aggregations.forEach(agg => {
        if (agg.status === 'PRESENT') presentCount = agg._count.status;
        if (agg.status === 'ABSENT') absentCount = agg._count.status;
        if (agg.status === 'LEAVE') leaveCount = agg._count.status;
      });

      return {
        presentCount,
        absentCount,
        leaveCount
      };
    });
  }

  static async getRanking(schoolId, startDate, endDate, limitOrOpts = 10) {
    return await queryLogger.measure('AttendanceReportRepository.getRanking', async () => {
      let limit = 10, page = null, pagination = null;
      if (typeof limitOrOpts === 'object' && limitOrOpts !== null) {
        pagination = limitOrOpts;
        limit = Math.min(100, Math.max(1, Number(pagination.limit) || 10));
        page = Math.max(1, Number(pagination.page) || 1);
      } else {
        limit = Math.min(100, Math.max(1, Number(limitOrOpts) || 10));
      }

      const offset = page ? (page - 1) * limit : 0;

      // Deterministic secondary sort u.id ASC
      const orderBy = `ORDER BY attendance_percentage DESC, present_count DESC, u.id ASC`;

      if (!page) {
        return await prisma.$queryRaw`
          SELECT 
            u.id, 
            u.name, 
            u."erpId",
            COUNT(a.id) FILTER (WHERE a.status = 'PRESENT') as present_count,
            COUNT(a.id) as total_days,
            (COUNT(a.id) FILTER (WHERE a.status = 'PRESENT')::FLOAT / NULLIF(COUNT(a.id), 0)) * 100 as attendance_percentage
          FROM "Attendance" a
          JOIN "User" u ON a."studentId" = u.id
          JOIN "Section" s ON a."sectionId" = s.id
          JOIN "Class" c ON s."classId" = c.id
          WHERE c."schoolId" = ${schoolId}
            AND a.date >= ${startDate}
            AND a.date <= ${endDate}
          GROUP BY u.id, u.name, u."erpId"
          HAVING COUNT(a.id) > 0
          ORDER BY attendance_percentage DESC, present_count DESC, u.id ASC
          LIMIT ${limit};
        `;
      }

      // Paginated: need total count and data
      const base = `
        SELECT 
          u.id, u.name, u."erpId",
          COUNT(a.id) FILTER (WHERE a.status = 'PRESENT') as present_count,
          COUNT(a.id) as total_days,
          (COUNT(a.id) FILTER (WHERE a.status = 'PRESENT')::FLOAT / NULLIF(COUNT(a.id), 0)) * 100 as attendance_percentage
        FROM "Attendance" a
        JOIN "User" u ON a."studentId" = u.id
        JOIN "Section" s ON a."sectionId" = s.id
        JOIN "Class" c ON s."classId" = c.id
        WHERE c."schoolId" = $1 AND a.date >= $2 AND a.date <= $3
        GROUP BY u.id, u.name, u."erpId"
        HAVING COUNT(a.id) > 0
      `;
      const countQ = `SELECT COUNT(*)::int as total FROM (${base}) t`;
      const dataQ = `SELECT * FROM (${base}) t ${orderBy} LIMIT $4 OFFSET $5`;
      const [countRows, rows] = await Promise.all([
        prisma.$queryRawUnsafe(countQ, schoolId, startDate, endDate),
        prisma.$queryRawUnsafe(dataQ, schoolId, startDate, endDate, limit, offset),
      ]);
      const total = countRows[0]?.total ?? 0;
      return { data: rows, total };
    });
  }

  static async getLowAttendance(schoolId, startDate, endDate, thresholdOrOpts = 75) {
    return await queryLogger.measure('AttendanceReportRepository.getLowAttendance', async () => {
      let thresholdPercent = 75, pagination = null;
      if (typeof thresholdOrOpts === 'object' && thresholdOrOpts !== null) {
        pagination = thresholdOrOpts.pagination || null;
        thresholdPercent = Number(thresholdOrOpts.threshold ?? thresholdOrOpts.thresholdPercent ?? 75);
      } else {
        thresholdPercent = Number(thresholdOrOpts ?? 75);
      }

      if (!pagination) {
        return await prisma.$queryRaw`
          SELECT 
            u.id, 
            u.name, 
            u."erpId",
            (COUNT(a.id) FILTER (WHERE a.status = 'PRESENT')::FLOAT / NULLIF(COUNT(a.id), 0)) * 100 as attendance_percentage
          FROM "Attendance" a
          JOIN "User" u ON a."studentId" = u.id
          JOIN "Section" s ON a."sectionId" = s.id
          JOIN "Class" c ON s."classId" = c.id
          WHERE c."schoolId" = ${schoolId}
            AND a.date >= ${startDate}
            AND a.date <= ${endDate}
          GROUP BY u.id, u.name, u."erpId"
          HAVING (COUNT(a.id) FILTER (WHERE a.status = 'PRESENT')::FLOAT / NULLIF(COUNT(a.id), 0)) * 100 < ${thresholdPercent}
          ORDER BY attendance_percentage ASC, u.id ASC;
        `;
      }

      const page = Math.max(1, Number(pagination.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(pagination.limit) || 20));
      const offset = (page - 1) * limit;
      const q = (pagination.q || pagination.search || '').trim();

      let searchWhere = '';
      const params = [schoolId, startDate, endDate, thresholdPercent];
      if (q) {
        params.push(`%${q}%`);
        searchWhere = `AND (u.name ILIKE $${params.length} OR u."erpId" ILIKE $${params.length})`;
      }

      const base = `
        SELECT u.id, u.name, u."erpId",
               (COUNT(a.id) FILTER (WHERE a.status = 'PRESENT')::FLOAT / NULLIF(COUNT(a.id), 0)) * 100 as attendance_percentage
        FROM "Attendance" a
        JOIN "User" u ON a."studentId" = u.id
        JOIN "Section" s ON a."sectionId" = s.id
        JOIN "Class" c ON s."classId" = c.id
        WHERE c."schoolId" = $1 AND a.date >= $2 AND a.date <= $3 ${searchWhere}
        GROUP BY u.id, u.name, u."erpId"
        HAVING (COUNT(a.id) FILTER (WHERE a.status = 'PRESENT')::FLOAT / NULLIF(COUNT(a.id), 0)) * 100 < $4
      `;
      const orderBy = `ORDER BY attendance_percentage ASC, u.id ASC`;
      const countQ = `SELECT COUNT(*)::int as total FROM (${base}) t`;
      const dataQ = `SELECT * FROM (${base}) t ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      const [countRows, rows] = await Promise.all([
        prisma.$queryRawUnsafe(countQ, ...params),
        prisma.$queryRawUnsafe(dataQ, ...params, limit, offset),
      ]);
      const total = countRows[0]?.total ?? 0;
      return { data: rows, total };
    });
  }
}
