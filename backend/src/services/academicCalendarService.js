import prisma from '../utils/db.js';

class AcademicCalendarService {
  /**
   * Retrieves the effective status of a specific date for a school.
   * Logic:
   * 1. Check for explicit overrides for this date.
   * 2. If no override, check if Sunday (HOLIDAY).
   * 3. Otherwise, WORKING.
   * @param {string} schoolId
   * @param {string} dateString (YYYY-MM-DD or valid date string)
   * @returns {Promise<{date: string, status: string, reason?: string}>}
   */
  async getEffectiveStatus(schoolId, dateString) {
    const date = new Date(dateString);
    // Ensure the date is just the date component (midnight UTC) for consistent comparison
    const searchDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

    // Find any override that encompasses this date
    const override = await prisma.academicCalendarOverride.findFirst({
      where: {
        schoolId,
        startDate: { lte: searchDate },
        endDate: { gte: searchDate }
      }
    });

    if (override) {
      return {
        date: searchDate.toISOString().split('T')[0],
        status: override.status,
        ...(override.reason && { reason: override.reason })
      };
    }

    // Default rules
    const isSunday = searchDate.getUTCDay() === 0;

    return {
      date: searchDate.toISOString().split('T')[0],
      status: isSunday ? 'HOLIDAY' : 'WORKING'
    };
  }

  /**
   * Create a new academic calendar override.
   */
  async createOverride(schoolId, data, userId) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    // Normalize to UTC midnight
    const normalizedStartDate = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()));
    const normalizedEndDate = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()));

    // Check for overlapping overrides
    const overlapping = await prisma.academicCalendarOverride.findFirst({
      where: {
        schoolId,
        OR: [
          {
            startDate: { lte: normalizedEndDate },
            endDate: { gte: normalizedStartDate }
          }
        ]
      }
    });

    if (overlapping) {
      throw new Error('An overlapping override already exists for this date range.');
    }

    return await prisma.academicCalendarOverride.create({
      data: {
        schoolId,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        status: data.status,
        reason: data.reason,
        createdBy: userId
      }
    });
  }

  /**
   * Update an existing academic calendar override.
   */
  async updateOverride(id, schoolId, data, userId) {
    const existing = await prisma.academicCalendarOverride.findUnique({
      where: { id, schoolId }
    });

    if (!existing) {
      throw new Error('Override not found.');
    }

    let normalizedStartDate = existing.startDate;
    let normalizedEndDate = existing.endDate;

    if (data.startDate) {
      const start = new Date(data.startDate);
      normalizedStartDate = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
    }
    if (data.endDate) {
      const end = new Date(data.endDate);
      normalizedEndDate = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()));
    }

    // Check for overlaps excluding the current override
    if (data.startDate || data.endDate) {
      const overlapping = await prisma.academicCalendarOverride.findFirst({
        where: {
          schoolId,
          id: { not: id },
          OR: [
            {
              startDate: { lte: normalizedEndDate },
              endDate: { gte: normalizedStartDate }
            }
          ]
        }
      });

      if (overlapping) {
        throw new Error('An overlapping override already exists for this date range.');
      }
    }

    return await prisma.academicCalendarOverride.update({
      where: { id },
      data: {
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        status: data.status !== undefined ? data.status : existing.status,
        reason: data.reason !== undefined ? data.reason : existing.reason,
      }
    });
  }

  /**
   * Delete an override.
   */
  async deleteOverride(id, schoolId) {
    const existing = await prisma.academicCalendarOverride.findUnique({
      where: { id, schoolId }
    });

    if (!existing) {
      throw new Error('Override not found.');
    }

    await prisma.academicCalendarOverride.delete({
      where: { id }
    });

    return { message: 'Override deleted successfully' };
  }

  /**
   * List all overrides for a school, optionally filtered by month or date range.
   */
  async listOverrides(schoolId, filters = {}) {
    const where = { schoolId };

    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      where.startDate = { gte: new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) };
      where.endDate = { lte: new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())) };
    }

    return await prisma.academicCalendarOverride.findMany({
      where,
      orderBy: { startDate: 'asc' }
    });
  }
}

export default new AcademicCalendarService();
