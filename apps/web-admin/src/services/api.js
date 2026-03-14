import api, { tokenStore } from './api-client';
import { PORTAL_CONFIG } from '../config/portal';

// Re-export api for backward compatibility
export default api;

// ── Auth ────────────────────────────────────────────────────────────────────
// Use portal-specific login endpoint (skill-compliant)
export const login = async (data) => {
  const response = await api.post(PORTAL_CONFIG.loginEndpoint, data);
  // Store access token with expiry (skill requirement)
  // Refresh token is in HttpOnly cookie - not in response body
  if (response.data.accessToken) {
    tokenStore.set(response.data.accessToken, response.data.expiresIn || 900);
    // Note: refreshToken not in response - it's in HttpOnly cookie
    if (response.data.user) {
      localStorage.setItem('admin_user', JSON.stringify(response.data.user));
    }
  }
  return response;
};

export const getMe = () => api.get('/auth/me');

// ── Dashboard ───────────────────────────────────────────────────────────────
export const getDashboard = () => api.get('/admin/dashboard');

// ── Users ───────────────────────────────────────────────────────────────────
export const getUsers = (params) => api.get('/users', { params });
export const getUser = (id) => api.get(`/users/${id}`);
export const updateUser = (id, d) => api.put(`/users/${id}`, d);
export const toggleUser = (id, d) => api.put(`/users/${id}/toggle`, d);
export const changeUserRole = (id, d) => api.put(`/users/${id}/role`, d);

// ── KYC ─────────────────────────────────────────────────────────────────────
export const getKycApplications = (params) => api.get('/kyc/admin/applications', { params });
export const getKycDetail = (id) => api.get(`/kyc/admin/${id}`);
export const approveKyc = (id, d) => api.put(`/kyc/admin/${id}/approve`, d);
export const rejectKyc = (id, d) => api.put(`/kyc/admin/${id}/reject`, d);
export const updateCriminalCheck = (id, d) => api.put(`/kyc/admin/${id}/criminal-check`, d);
export const recordDeposit = (userId, d) => api.post(`/kyc/admin/${userId}/deposit`, d);

// ── Categories ───────────────────────────────────────────────────────────────
export const getCategories = (params) => api.get('/categories', { params });
export const getCategory = (id) => api.get(`/categories/${id}`);
export const createCategory = (d) => api.post('/categories', d);
export const updateCategory = (id, d) => api.put(`/categories/${id}`, d);
export const upsertCategoryTranslation = (id, d) => api.put(`/categories/${id}/translations`, d);

// ── Product Types ────────────────────────────────────────────────────────────
export const getProductTypes = (params) => api.get('/product-types', { params });
export const getProductType = (id) => api.get(`/product-types/${id}`);
export const createProductType = (d) => api.post('/product-types', d);
export const createAttribute = (id, d) => api.post(`/product-types/${id}/attributes`, d);

// ── Units ────────────────────────────────────────────────────────────────────
export const getUnits = (params) => api.get('/units', { params });

// ── Listings ─────────────────────────────────────────────────────────────────
export const getListings = (params) => api.get('/listings', { params });
export const getListing = (id) => api.get(`/listings/${id}`);
export const createListing = (d) => api.post('/listings', d);
export const postListingImages = (id, d) => api.post(`/listings/${id}/images`, d);
export const getAdminListings = (params) => api.get('/admin/all-listings', { params });
export const updateListingStatus = (id, d) => api.put(`/admin/listings/${id}/status`, d);

// ── Currencies ───────────────────────────────────────────────────────────────
export const getCurrencies = () => api.get('/currencies');
export const setExchangeRate = (d) => api.post('/currencies/exchange-rate', d);

// ── Languages ────────────────────────────────────────────────────────────────
export const getLanguages = () => api.get('/languages');

// ── Translations ─────────────────────────────────────────────────────────────
export const getTranslations = (params) => api.get('/translations', { params });
export const saveTranslation = (d) => api.post('/translations', d);
export const bulkImportTranslations = (d) => api.post('/translations/bulk', d);

// ── Geo Zones ────────────────────────────────────────────────────────────────
export const getGeoZones = (params) => api.get('/geo-zones', { params });
export const getCities = () => api.get('/geo-zones/cities');

// ── Countries ────────────────────────────────────────────────────────────────
export const getCountries = () => api.get('/countries');

// ── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications = (params) => api.get('/notifications', { params });
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllRead = () => api.patch('/notifications/read-all');
export const broadcastNotification = (d) => api.post('/admin/notifications/broadcast', d);

// ── Chat ─────────────────────────────────────────────────────────────────────
export const getChatConversations = () => api.get('/chat/conversations');
export const getChatMessages = (userId) => api.get(`/chat/${userId}`);
export const sendChatMessage = (userId, d) => api.post(`/chat/${userId}`, d);

// ── Transactions ─────────────────────────────────────────────────────────────
export const getTransactions = (params) => api.get('/transactions', { params });
export const getTransaction = (id) => api.get(`/transactions/${id}`);
export const getTransactionBond = (id) => api.get(`/transactions/${id}/bond`);
export const acceptTransaction = (id) => api.put(`/transactions/${id}/accept`);
export const rejectTransaction = (id) => api.put(`/transactions/${id}/reject`);
export const finalizeTransaction = (id) => api.put(`/transactions/${id}/finalize`);

// ── Analytics ────────────────────────────────────────────────────────────────
export const getAnalyticsOverview = () => api.get('/analytics');
export const getListingsByCategory = () => api.get('/analytics/listings-by-category');
export const getListingsByZone = () => api.get('/analytics/listings-by-zone');
export const getCarbonAnalytics = (params) => api.get('/analytics/carbon', { params });

// ── Platform Config ───────────────────────────────────────────────────────────
export const getPlatformConfig = () => api.get('/admin/platform-config');
export const updatePlatformConfig = (d) => api.put('/admin/platform-config', d);

// ── Territories ───────────────────────────────────────────────────────────────
export const getTerritories = () => api.get('/territories');
export const getMyTerritories = () => api.get('/territories/mine');
export const getZoneDealers = (id) => api.get(`/territories/${id}/dealers`);
export const assignTerritory = (id, d) => api.post(`/territories/${id}/dealers`, d);
export const bulkAssignTerritories = (d) => api.post('/territories/bulk-assign', d);
export const updateTerritory = (id, d) => api.put(`/admin/territories/${id}`, d);
export const removeTerritory = (id, uid) => api.delete(`/admin/territories/${id}/dealers/${uid}`);

// ── Escalation ────────────────────────────────────────────────────────────────
export const getEscalationRules = () => api.get('/territories/escalation-rules');
export const updateEscalationRule = (id, d) => api.put(`/territories/escalation-rules/${id}`, d);

// ── Collections ───────────────────────────────────────────────────────────────
export const getCollections = (params) => api.get('/collections', { params });
export const getCollection = (id) => api.get(`/collections/${id}`);
export const updateCollectionStatus = (id, d) => api.patch(`/collections/${id}/status`, d);

// ── Subscriptions ─────────────────────────────────────────────────────────────
export const getPlans = () => api.get('/subscriptions/plans');

// ── Dealer Wallets ────────────────────────────────────────────────────────────
export const getDealerWallets = (params) => api.get('/admin/dealers/wallets', { params });
export const addDealerBalance = (id, d) => api.post(`/admin/dealers/${id}/balance/add`, d);
export const deductDealerBalance = (id, d) => api.post(`/admin/dealers/${id}/balance/deduct`, d);

// ── Dealer Rating ─────────────────────────────────────────────────────────────
export const getDealerRating = (id) => api.get(`/users/${id}/rating-summary`);
