import axios from 'axios';

// ✅ FIX: Must be set at build time via VITE_API_URL env variable
// Fallback '/api' only works if nginx is proxying on the same origin
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('admin_user');
      // ✅ FIX: Route is '/login' not '/admin/login'
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ────────────────────────────────────────────────────────────────────
// ✅ FIX: Use /auth/admin-login (enforces admin/super_admin role server-side)
export const login  = (data) => api.post('/auth/admin-login', data);
export const getMe  = ()     => api.get('/auth/me');

// ── Dashboard ───────────────────────────────────────────────────────────────
export const getDashboard = () => api.get('/admin/dashboard');

// ── Users ───────────────────────────────────────────────────────────────────
export const getUsers      = (params) => api.get('/users', { params });
export const getUser       = (id)     => api.get(`/users/${id}`);
export const updateUser    = (id, d)  => api.put(`/users/${id}`, d);
export const toggleUser    = (id, d)  => api.put(`/users/${id}/toggle`, d);
export const changeUserRole = (id, d) => api.put(`/users/${id}/role`, d);

// ── KYC ─────────────────────────────────────────────────────────────────────
export const getKycApplications = (params) => api.get('/kyc/admin/applications', { params });
export const getKycDetail       = (id)     => api.get(`/kyc/admin/${id}`);
export const approveKyc         = (id, d)  => api.put(`/kyc/admin/${id}/approve`, d);
export const rejectKyc          = (id, d)  => api.put(`/kyc/admin/${id}/reject`, d);
export const updateCriminalCheck = (id, d) => api.put(`/kyc/admin/${id}/criminal-check`, d);

// ── Categories ───────────────────────────────────────────────────────────────
export const getCategories            = (params) => api.get('/categories', { params });
export const getCategory              = (id)     => api.get(`/categories/${id}`);
export const createCategory           = (d)      => api.post('/categories', d);
export const updateCategory           = (id, d)  => api.put(`/categories/${id}`, d);
export const upsertCategoryTranslation = (id, d) => api.put(`/categories/${id}/translations`, d);

// ── Product Types ────────────────────────────────────────────────────────────
export const getProductTypes  = (params) => api.get('/product-types', { params });
export const getProductType   = (id)     => api.get(`/product-types/${id}`);
export const createProductType = (d)     => api.post('/product-types', d);
export const createAttribute   = (id, d) => api.post(`/product-types/${id}/attributes`, d);

// ── Units ────────────────────────────────────────────────────────────────────
export const getUnits = (params) => api.get('/units', { params });

// ── Listings ─────────────────────────────────────────────────────────────────
export const getListings          = (params) => api.get('/listings', { params });
export const getListing           = (id)     => api.get(`/listings/${id}`);
export const createListing        = (d)      => api.post('/listings', d);
export const postListingImages    = (id, d)  => api.post(`/listings/${id}/images`, d);
export const getAdminListings     = (params) => api.get('/admin/all-listings', { params });
export const updateListingStatus  = (id, d)  => api.put(`/admin/listings/${id}/status`, d);

// ── Currencies ───────────────────────────────────────────────────────────────
export const getCurrencies   = ()     => api.get('/currencies');
export const setExchangeRate = (d)    => api.post('/currencies/exchange-rate', d);

// ── Languages ────────────────────────────────────────────────────────────────
export const getLanguages = () => api.get('/languages');

// ── Translations ─────────────────────────────────────────────────────────────
export const getTranslations      = (params) => api.get('/translations', { params });
export const saveTranslation      = (d)      => api.post('/translations', d);
export const bulkImportTranslations = (d)    => api.post('/translations/bulk', d);

// ── Geo Zones ────────────────────────────────────────────────────────────────
export const getGeoZones = (params) => api.get('/geo-zones', { params });
export const getCities   = ()       => api.get('/geo-zones/cities');

// ── Countries ────────────────────────────────────────────────────────────────
export const getCountries = () => api.get('/countries');

// ── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications    = (params) => api.get('/notifications', { params });
export const markNotificationRead = (id)    => api.patch(`/notifications/${id}/read`);
export const markAllRead         = ()       => api.patch('/notifications/read-all');
export const broadcastNotification = (d)   => api.post('/admin/notifications/broadcast', d);

// ── Chat ─────────────────────────────────────────────────────────────────────
export const getChatConversations = ()         => api.get('/chat/conversations');
export const getChatMessages      = (userId)   => api.get(`/chat/${userId}`);
export const sendChatMessage      = (userId, d) => api.post(`/chat/${userId}`, d);

// ── Transactions ─────────────────────────────────────────────────────────────
export const getTransactions    = (params) => api.get('/transactions', { params });
export const getTransaction     = (id)     => api.get(`/transactions/${id}`);
export const getTransactionBond = (id)     => api.get(`/transactions/${id}/bond`);
export const acceptTransaction  = (id)     => api.put(`/transactions/${id}/accept`);
export const rejectTransaction  = (id)     => api.put(`/transactions/${id}/reject`);
export const finalizeTransaction = (id)    => api.put(`/transactions/${id}/finalize`);

// ── Analytics ────────────────────────────────────────────────────────────────
export const getAnalyticsOverview   = ()       => api.get('/analytics');
export const getListingsByCategory  = ()       => api.get('/analytics/listings-by-category');
export const getListingsByZone      = ()       => api.get('/analytics/listings-by-zone');
export const getCarbonAnalytics     = (params) => api.get('/analytics/carbon', { params });

// ── Platform Config ───────────────────────────────────────────────────────────
export const getPlatformConfig    = ()    => api.get('/admin/platform-config');
export const updatePlatformConfig = (d)   => api.put('/admin/platform-config', d);

// ── Territories ───────────────────────────────────────────────────────────────
export const getTerritories       = ()         => api.get('/territories');
export const getMyTerritories     = ()         => api.get('/territories/mine');
export const getZoneDealers       = (id)       => api.get(`/territories/${id}/dealers`);
export const assignTerritory      = (id, d)    => api.post(`/territories/${id}/dealers`, d);
export const bulkAssignTerritories = (d)       => api.post('/territories/bulk-assign', d);
export const updateTerritory      = (id, d)    => api.put(`/admin/territories/${id}`, d);
export const removeTerritory      = (id, uid)  => api.delete(`/admin/territories/${id}/dealers/${uid}`);

// ── Escalation ────────────────────────────────────────────────────────────────
export const getEscalationRules  = ()      => api.get('/territories/escalation-rules');
export const updateEscalationRule = (id, d) => api.put(`/territories/escalation-rules/${id}`, d);

// ── Collections ───────────────────────────────────────────────────────────────
export const getCollections       = (params) => api.get('/collections', { params });
export const getCollection        = (id)     => api.get(`/collections/${id}`);
export const updateCollectionStatus = (id, d) => api.patch(`/collections/${id}/status`, d);

// ── Subscriptions ─────────────────────────────────────────────────────────────
export const getPlans = () => api.get('/subscriptions/plans');

// ── Dealer Wallets ────────────────────────────────────────────────────────────
export const getDealerWallets   = (params) => api.get('/admin/dealers/wallets', { params });
export const addDealerBalance   = (id, d)  => api.post(`/admin/dealers/${id}/balance/add`, d);
export const deductDealerBalance = (id, d) => api.post(`/admin/dealers/${id}/balance/deduct`, d);

// ── Dealer Rating ─────────────────────────────────────────────────────────────
export const getDealerRating = (id) => api.get(`/users/${id}/rating-summary`);
