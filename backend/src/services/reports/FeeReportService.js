import { ReportEngine } from './ReportEngine.js';
import { ReportDTOs } from './ReportDTOs.js';
import { FeeReportRepository } from '../../repositories/FeeReportRepository.js';

export class FeeReportService {
  async getCollectionSummary(schoolId, query) {
    const { filters, dateRange } = await ReportEngine.validateAndParseFilters(schoolId, query);
    
    const repoResult = await FeeReportRepository.getCollectionSummary(schoolId, dateRange.startDate, dateRange.endDate, filters);
    
    const formattedData = ReportDTOs.formatFeeCollectionSummary(repoResult);

    return ReportEngine.buildResponse('Fee Collection Summary', formattedData, filters, dateRange);
  }

  async getPaymentMethods(schoolId, query) {
    const { filters, dateRange } = await ReportEngine.validateAndParseFilters(schoolId, query);
    
    const repoResult = await FeeReportRepository.getPaymentMethods(schoolId, dateRange.startDate, dateRange.endDate, filters);
    
    const formattedData = ReportDTOs.formatPaymentMethods(repoResult);

    return ReportEngine.buildResponse('Payment Methods Report', formattedData, filters, dateRange);
  }

  async getDefaulters(schoolId, query) {
    const { filters, dateRange } = await ReportEngine.validateAndParseFilters(schoolId, query);
    
    const hasPagination = query.page !== undefined || query.limit !== undefined || query.q !== undefined || query.search !== undefined || query.sortBy !== undefined;
    if (hasPagination) {
      const page = query.page ? Number(query.page) : 1;
      const limit = query.limit ? Number(query.limit) : 20;
      const pagination = { page, limit, q: query.q || query.search || '', sortBy: query.sortBy, order: query.order };
      const repoResult = await FeeReportRepository.getDefaulters(schoolId, dateRange.startDate, dateRange.endDate, filters, pagination);
      const formattedData = ReportDTOs.formatFeeDefaulters(repoResult.data);
      const base = ReportEngine.buildResponse('Fee Defaulters Report', formattedData, filters, dateRange);
      base.pagination = { page, limit, total: repoResult.total, totalPages: Math.ceil(repoResult.total / limit) };
      return base;
    }

    const repoResult = await FeeReportRepository.getDefaulters(schoolId, dateRange.startDate, dateRange.endDate, filters);
    
    const formattedData = ReportDTOs.formatFeeDefaulters(repoResult);
    
    return ReportEngine.buildResponse('Fee Defaulters Report', formattedData, filters, dateRange);
  }
}

export default new FeeReportService();
