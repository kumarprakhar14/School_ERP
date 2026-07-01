import api from '../../lib/api';

const academicCalendarApi = {
  getTodayStatus: async () => {
    const response = await api.get('/academic-calendar/today');
    return response.data;
  },
  
  getStatusForDate: async (date) => {
    const response = await api.get(`/academic-calendar/status?date=${date}`);
    return response.data;
  },

  listOverrides: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/academic-calendar${params ? `?${params}` : ''}`);
    return response.data;
  },

  createOverride: async (data) => {
    const response = await api.post('/academic-calendar', data);
    return response.data;
  },

  updateOverride: async (id, data) => {
    const response = await api.put(`/academic-calendar/${id}`, data);
    return response.data;
  },

  deleteOverride: async (id) => {
    const response = await api.delete(`/academic-calendar/${id}`);
    return response.data;
  }
};

export default academicCalendarApi;
