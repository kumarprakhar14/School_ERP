import { create } from 'zustand';
import api from '../lib/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  isLoading: false,
  isInitialized: false,

  applyTheme: (user) => {
    const themeColor = user?.schoolSettings?.themeColor || '#3b82f6';
    document.documentElement.style.setProperty('--app-theme-color', themeColor);
  },

  login: async (erpId, password, schoolId) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', { erpId, password, schoolId });
      const { token, refreshToken, user } = response.data;
      localStorage.setItem('token', token);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      get().applyTheme(user);
      set({ user, token, refreshToken, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    document.documentElement.style.removeProperty('--app-theme-color');
    set({ user: null, token: null, refreshToken: null });
  },

  fetchProfile: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isInitialized: true });
      return;
    }
    try {
      const response = await api.get('/auth/me');
      const user = response.data.user;
      get().applyTheme(user);
      set({ user, isInitialized: true });
    } catch (error) {
      console.error('Failed to fetch profile', error);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      set({ user: null, token: null, refreshToken: null, isInitialized: true });
    }
  }
}));

export default useAuthStore;
