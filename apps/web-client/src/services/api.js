import api, { tokenStore } from './api-client';

// Add language header to requests
api.interceptors.request.use((config) => {
  const lang = localStorage.getItem('language') || 'en';
  config.headers['Accept-Language'] = lang;
  return config;
});

export default api;
