import axios from 'axios';

// ✅ VITE_API_BASE_URL must be set in .env / .env.production
// Falls back to '/api' which only works if nginx proxies /api → backend on same origin
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const lang = localStorage.getItem('language') || 'en';
  config.headers['Accept-Language'] = lang;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ✅ Attempt token refresh on 401 (TOKEN_EXPIRED) before giving up
    if (
      error.response?.status === 401 &&
      error.response?.data?.error?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/refresh-token`,
            { refreshToken }
          );
          localStorage.setItem('token', data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        }
      } catch (_) {
        // refresh failed — fall through to logout
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
