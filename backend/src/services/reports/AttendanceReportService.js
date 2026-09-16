import { ReportEngine } from './ReportEngine.js';
import { ReportDTOs } from './ReportDTOs.js';
import { AttendanceReportRepository } from '../../repositories/AttendanceReportRepository.js';
import academicCalendarService from '../academicCalendarService.js';

export class AttendanceReportService {
  async getSummary(schoolId, query) {
    const { filters, dateRange } = await ReportEngine.validateAndParseFilters(schoolId, query);
    
    // Resolve Working Days from the Calendar Service (Single source of truth)
    const workingDays = await academicCalendarService.countWorkingDays(
      schoolId, 
      dateRange.startDate, 
      dateRange.endDate
    );

    if (workingDays === 0) {
      return ReportEngine.buildResponse('Attendance Summary', {
        message: 'No working days exist within the selected period.',
        workingDays: 0,
        presentCount: 0,
        absentCount: 0,
        leaveCount: 0,
        attendancePercentage: null
      }, filters, dateRange);
    }

    const repoResult = await AttendanceReportRepository.getSummary(schoolId, dateRange.startDate, dateRange.endDate, filters);
    
    const formattedData = ReportDTOs.formatAttendanceSummary({
      ...repoResult,
      workingDays
    });

    return ReportEngine.buildResponse('Attendance Summary', formattedData, filters, dateRange);
  }

  async getRanking(schoolId, query) {
    const { filters, dateRange } = await ReportEngine.validateAndParseFilters(schoolId, query);
    
    const hasPagination = query.page !== undefined || query.limit !== undefined;
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const repoResult = hasPagination
      ? await AttendanceReportRepository.getRanking(schoolId, dateRange.startDate, dateRange.endDate, { page, limit })
      : await AttendanceReportRepository.getRanking(schoolId, dateRange.startDate, dateRange.endDate, 10);
    
    if (hasPagination && repoResult && typeof repoResult === 'object' && 'data' in repoResult) {
      const formattedData = ReportDTOs.formatAttendanceRanking(repoResult.data);
      const base = ReportEngine.buildResponse('Attendance Ranking', formattedData, filters, dateRange);
      base.pagination = { page, limit, total: repoResult.total, totalPages: Math.ceil(repoResult.total / limit) };
      return base;
    }
    const formattedData = ReportDTOs.formatAttendanceRanking(repoResult);
    return ReportEngine.buildResponse('Attendance Ranking (Top 10)', formattedData, filters, dateRange);
  }

  async getLowAttendance(schoolId, query) {
    const { filters, dateRange } = await ReportEngine.validateAndParseFilters(schoolId, query);
    
    const thresholdPercent = query.threshold ? parseFloat(query.threshold) : 75;
    const hasPagination = query.page !== undefined || query.limit !== undefined || query.q !== undefined || query.search !== undefined;

    if (hasPagination) {
      const page = query.page ? Number(query.page) : 1;
      const limit = query.limit ? Number(query.limit) : 20;
      const q = query.q || query.search || '';
      const repoResult = await AttendanceReportRepository.getLowAttendance(schoolId, dateRange.startDate, dateRange.endDate, { threshold: thresholdPercent, pagination: { page, limit, q } });
      const formattedData = ReportDTOs.formatLowAttendance(repoResult.data);
      const base = ReportEngine.buildResponse(`Low Attendance (Below ${thresholdPercent}%)`, formattedData, filters, dateRange);
      base.pagination = { page, limit, total: repoResult.total, totalPages: Math.ceil(repoResult.total / limit) };
      return base;
    }

    const repoResult = await AttendanceReportRepository.getLowAttendance(schoolId, dateRange.startDate, dateRange.endDate, thresholdPercent);
    
    const formattedData = ReportDTOs.formatLowAttendance(repoResult);
    
    return ReportEngine.buildResponse(`Low Attendance (Below ${thresholdPercent}%)`, formattedData, filters, dateRange);
  }

  // NOTE: Chronic Absentees is pattern-based and can be added later when rules are defined.
  async getChronicAbsentees(schoolId, query) {
    const { filters, dateRange } = await ReportEngine.validateAndParseFilters(schoolId, query);
    
    return ReportEngine.buildResponse('Chronic Absentees', {
      message: 'Chronic absentees (pattern-based detection) is scheduled for future implementation.'
    }, filters, dateRange);
  }
}

export default new AttendanceReportService();
