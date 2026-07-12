import prisma from '../../utils/db.js';

export class ReportEngine {
  /**
   * Resolves raw query parameters into a standardized filter object and date range.
   * Enforces a maximum report window to protect the system.
   */
  static async validateAndParseFilters(schoolId, query) {
    const filters = {
      classId: query.classId || null,
      sectionId: query.sectionId || null,
      groupBy: query.groupBy || null,
      academicSessionId: query.academicSessionId || null,
    };

    let startDate;
    let endDate;

    // Date Resolution
    if (query.preset) {
      const now = new Date();
      switch (query.preset) {
        case 'Today':
          startDate = new Date(now);
          endDate = new Date(now);
          break;
        case 'This Week': {
          const day = now.getDay(); // 0=Sun, 1=Mon, ...
          const diffToMonday = day === 0 ? -6 : 1 - day;
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
          endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6);
          break;
        }
        case 'This Month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'Last Month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case 'This Year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
        case 'Custom Range':
          if (!query.startDate || !query.endDate) {
            throw new Error('startDate and endDate are required for Custom Range.');
          }
          startDate = new Date(query.startDate);
          endDate = new Date(query.endDate);
          break;
        default:
          throw new Error('Invalid preset');
      }
    } else {
      if (!query.startDate || !query.endDate) {
        throw new Error('startDate and endDate or a valid preset are required.');
      }
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
    }

    // Normalize: startDate to start-of-day UTC, endDate to end-of-day UTC
    startDate = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()));
    endDate = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999));

    // System Protection: Max window of 5 years
    const FIVE_YEARS_MS = 5 * 365 * 24 * 60 * 60 * 1000;
    if (endDate.getTime() - startDate.getTime() > FIVE_YEARS_MS) {
      throw new Error('Report date range exceeds the maximum allowed limit of 5 years.');
    }

    if (startDate > endDate) {
      throw new Error('startDate cannot be after endDate.');
    }

    return {
      filters,
      dateRange: { startDate, endDate }
    };
  }

  /**
   * Wraps the report data in a standardized response envelope containing metadata.
   */
  static buildResponse(reportName, data, filters, dateRange) {
    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedFor: reportName,
        filters: {
          ...filters,
          startDate: dateRange.startDate.toISOString().split('T')[0],
          endDate: dateRange.endDate.toISOString().split('T')[0]
        }
      },
      data
    };
  }
}
