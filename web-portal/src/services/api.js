import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('gc_token');
      localStorage.removeItem('gc_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export function login(email, password) {
  return api.post('/auth/login', { email, password }).then((r) => r.data);
}
export function getMe() {
  return api.get('/auth/me').then((r) => r.data);
}

// Admin Stats & Analytics
export function getAdminStats() {
  return api.get('/admin/stats').then((r) => r.data);
}
export function getWeeklyStats() {
  return api.get('/admin/stats/weekly').then((r) => r.data);
}
export function getMonthlyStats() {
  return api.get('/admin/stats/monthly').then((r) => r.data);
}
export function getGarbageTypeStats() {
  return api.get('/admin/stats/garbage-types').then((r) => r.data);
}
export function getCityStats() {
  return api.get('/admin/stats/cities').then((r) => r.data);
}

// Users
export function getUsers(params) {
  return api.get('/admin/users', { params }).then((r) => r.data);
}
export function verifyUser(id) {
  return api.put(`/admin/users/${id}/verify`).then((r) => r.data);
}
export function banUser(id) {
  return api.put(`/admin/users/${id}/ban`).then((r) => r.data);
}
export function unbanUser(id) {
  return api.put(`/admin/users/${id}/unban`).then((r) => r.data);
}

// Listings
export function getListings(params) {
  return api.get('/admin/listings', { params }).then((r) => r.data);
}

// Collection Points
export function getCollectionPoints() {
  return api.get('/admin/collection-points').then((r) => r.data);
}

// Garbage Types
export function getGarbageTypes() {
  return api.get('/admin/garbage-types').then((r) => r.data);
}
export function updateGarbageType(id, data) {
  return api.put(`/admin/garbage-types/${id}`, data).then((r) => r.data);
}

// Disputes
export function getDisputes(params) {
  return api.get('/admin/disputes', { params }).then((r) => r.data);
}
export function resolveDispute(id, resolution) {
  return api.put(`/admin/disputes/${id}/resolve`, { resolution }).then((r) => r.data);
}

// Regional
export function getAvailableInventory(params) {
  return api.get('/regional/inventory', { params }).then((r) => r.data);
}
export function getRegionalOrders(params) {
  return api.get('/regional/orders', { params }).then((r) => r.data);
}
export function createBulkOrder(data) {
  return api.post('/regional/orders', data).then((r) => r.data);
}
export function markPickupDone(orderId) {
  return api.put(`/regional/orders/${orderId}/pickup`).then((r) => r.data);
}

export default api;
