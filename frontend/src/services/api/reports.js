import api from '../../lib/api';

export const reportsApi = {
  // --- ATTENDANCE REPORTS ---
  getAttendanceSummary: async (params) => {
    const response = await api.get('/reports/attendance/summary', { params });
    return response.data;
  },
  
  getAttendanceRanking: async (params) => {
    const response = await api.get('/reports/attendance/ranking', { params });
    return response.data;
  },
  
  getLowAttendance: async (params) => {
    const response = await api.get('/reports/attendance/low-attendance', { params });
    return response.data;
  },

  getChronicAbsentees: async (params) => {
    const response = await api.get('/reports/attendance/chronic-absentees', { params });
    return response.data;
  },

  // --- FEE REPORTS ---
  getFeeCollectionSummary: async (params) => {
    const response = await api.get('/reports/fees/collection-summary', { params });
    return response.data;
  },
  
  getFeePaymentMethods: async (params) => {
    const response = await api.get('/reports/fees/payment-methods', { params });
    return response.data;
  },
  
  getFeeDefaulters: async (params) => {
    const response = await api.get('/reports/fees/defaulters', { params });
    return response.data;
  }
};
