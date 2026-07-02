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

  static async getRanking(schoolId, startDate, endDate, limit = 10) {
    return await queryLogger.measure('AttendanceReportRepository.getRanking', async () => {
      // Postgres-specific raw query to calculate attendance percentage per student and limit to Top N.
      // Raw query is used since prisma-specific methods and functions can be expensive for this type
      // of heavy crud operation.
      // We assume that the total number of "working days" is the total count of attendance records for the student in that period.
      // Or, more accurately, we only look at students who have records, and their percentage is (PRESENT / (PRESENT + ABSENT + LEAVE)).
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
        ORDER BY attendance_percentage DESC, present_count DESC
        LIMIT ${limit};
      `;
    });
  }

  static async getLowAttendance(schoolId, startDate, endDate, thresholdPercent = 75) {
    return await queryLogger.measure('AttendanceReportRepository.getLowAttendance', async () => {
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
        ORDER BY attendance_percentage ASC;
      `;
    });
  }
}
