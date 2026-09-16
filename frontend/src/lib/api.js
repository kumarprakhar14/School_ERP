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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

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
        
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        if (window.location.pathname !== '/login') {
          const redirect = window.location.pathname + window.location.search;
          try { sessionStorage.setItem('redirectAfterLogin', redirect); } catch {}
          window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
        }
        return Promise.reject(error);
      }

      if (code === 'TOKEN_EXPIRED' || !originalRequest._retry) {
        if (originalRequest.url === '/auth/refresh') {
          // If the refresh token itself fails
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          if (window.location.pathname !== '/login') {
            const redirect = window.location.pathname + window.location.search;
            try { sessionStorage.setItem('redirectAfterLogin', redirect); } catch {}
            window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
          }
          return Promise.reject(error);
        }

        if (isRefreshing) {
          try {
            const token = await new Promise(function(resolve, reject) {
              failedQueue.push({ resolve, reject });
            });
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          } catch (err) {
            return Promise.reject(err);
          }
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('refreshToken');
        const token = localStorage.getItem('token');
        
        if (refreshToken) {
          try {
            const res = await axios.post(`${API_URL}/auth/refresh`, { token, refreshToken });
            const newAccessToken = res.data.token;
            const newRefreshToken = res.data.refreshToken;
            
            localStorage.setItem('token', newAccessToken);
            if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
            
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            
            processQueue(null, newAccessToken);
            return api(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError, null);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            if (window.location.pathname !== '/login') {
              const redirect = window.location.pathname + window.location.search;
              try { sessionStorage.setItem('redirectAfterLogin', redirect); } catch {}
              window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
            }
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          if (window.location.pathname !== '/login') {
            const redirect = window.location.pathname + window.location.search;
            try { sessionStorage.setItem('redirectAfterLogin', redirect); } catch {}
            window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
          }
        }
      } else {
         // Some other 401 error like Invalid Token
         localStorage.removeItem('token');
         localStorage.removeItem('refreshToken');
         if (window.location.pathname !== '/login') {
           const redirect = window.location.pathname + window.location.search;
           try { sessionStorage.setItem('redirectAfterLogin', redirect); } catch {}
           window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
         }
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
