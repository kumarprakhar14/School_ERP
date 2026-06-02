import axios from 'axios';

import { toast } from 'sonner';

const API_URL = import.meta.env.MODE === 'production' 
  ? 'https://api.kumarprakhar.online/api' 
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const code = error.response.data?.code;
      const message = error.response.data?.message;

      if (code === 'ACCOUNT_DISABLED' || code === 'ACCOUNT_ARCHIVED' || code === 'SCHOOL_EXPIRED') {
        // Developer Note: We deliberately use native alert() here instead of a prettier toast (like sonner).
        // A toast is non-blocking, which means we'd have to artificially delay the redirect to let the user read it.
        // During that delay, the user could still click UI elements on the dashboard (ghost interactions).
        // alert() synchronously blocks the browser thread, guaranteeing they see the message and absolutely
        // preventing any further interactions before they are immediately redirected to /login.
        alert(message || 'Session expired. You have been logged out.');
      }
      
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (error.response && error.response.status === 403) {
      const code = error.response.data?.code;
      if (code === 'SCHOOL_EXPIRED_ADMIN') {
        toast.error(error.response.data.message || 'School subscription has expired.');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
