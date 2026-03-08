import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: API_BASE });

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

// Dashboard
export const getDashboard = () => api.get('/admin/dashboard');

// Users
export const getUsers = (params) => api.get('/users', { params });
export const getUser = (id) => api.get(`/users/${id}`);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const toggleUser = (id) => api.put(`/users/${id}/toggle`);
export const changeUserRole = (id, data) => api.put(`/users/${id}/role`, data);

// Categories
export const getCategories = () => api.get('/categories');
export const getCategory = (id) => api.get(`/categories/${id}`);
export const createCategory = (data) => api.post('/categories', data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const upsertCategoryTranslation = (id, data) => api.post(`/categories/${id}/translations`, data);

// Product Types
export const getProductTypes = (params) => api.get('/product-types', { params });
export const getProductType = (id) => api.get(`/product-types/${id}`);
export const createProductType = (data) => api.post('/product-types', data);
export const createAttribute = (typeId, data) => api.post(`/product-types/${typeId}/attributes`, data);

// Listings
export const getListings = (params) => api.get('/listings', { params });
export const getAdminListings = (params) => api.get('/admin/all-listings', { params });
export const updateListingStatus = (id, data) => api.put(`/admin/listings/${id}/status`, data);

// Currencies
export const getCurrencies = () => api.get('/currencies');
export const setExchangeRate = (data) => api.post('/currencies/rates', data);

// Languages & Translations
export const getLanguages = () => api.get('/languages');
export const getTranslations = (langId) => api.get(`/translations/${langId}`);
export const saveTranslation = (data) => api.post('/translations', data);
export const bulkImportTranslations = (data) => api.post('/translations/bulk-import', data);

// Geo-Zones
export const getGeoZones = (params) => api.get('/geo-zones', { params });
export const getCities = () => api.get('/geo-zones/cities');

// Units
export const getUnits = (params) => api.get('/units', { params });

// Subscriptions
export const getPlans = () => api.get('/subscriptions/plans');

// Notifications
export const getNotifications = (params) => api.get('/notifications', { params });
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllRead = () => api.put('/notifications/read-all');

// Analytics
export const getAnalyticsOverview = () => api.get('/analytics/overview');
export const getListingsByCategory = () => api.get('/analytics/listings-by-category');
export const getListingsByZone = () => api.get('/analytics/listings-by-zone');

// Platform Config
export const getPlatformConfig = () => api.get('/admin/platform-config');
export const updatePlatformConfig = (data) => api.put('/admin/platform-config', data);

// Territories
export const getTerritories = (params) => api.get('/territories', { params });
export const getMyTerritories = () => api.get('/territories/my');
export const getZoneDealers = (zoneId) => api.get(`/territories/zone/${zoneId}`);
export const assignTerritory = (data) => api.post('/territories', data);
export const bulkAssignTerritories = (data) => api.post('/territories/bulk', data);
export const updateTerritory = (id, data) => api.put(`/territories/${id}`, data);
export const removeTerritory = (id) => api.delete(`/territories/${id}`);
export const getEscalationRules = () => api.get('/territories/escalation-rules');
export const updateEscalationRule = (id, data) => api.put(`/territories/escalation-rules/${id}`, data);
