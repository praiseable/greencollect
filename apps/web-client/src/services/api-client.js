// apps/web-client/src/lib/api-client.js
// Same advanced token refresh implementation as web-admin

import axios from 'axios';
import { PORTAL_CONFIG } from '../config/portal';

export const tokenStore = {
  get() {
    // Check new key first, fallback to old keys for backward compatibility
    return localStorage.getItem(PORTAL_CONFIG.tokenKey) || 
           localStorage.getItem('token') || 
           localStorage.getItem('dealer_token');
  },
  set(token, expiresIn) {
    // Store in new key and old keys for migration period
    localStorage.setItem(PORTAL_CONFIG.tokenKey, token);
    localStorage.setItem('token', token); // Old key for backward compatibility
    localStorage.setItem(PORTAL_CONFIG.expiresAtKey, Date.now() + expiresIn * 1000);
  },
  clear() {
    // Clear all token-related keys
    localStorage.removeItem(PORTAL_CONFIG.tokenKey);
    localStorage.removeItem('token'); // Old key
    localStorage.removeItem('dealer_token'); // Alternative old key
    localStorage.removeItem(PORTAL_CONFIG.expiresAtKey);
    // Note: refresh token is in HttpOnly cookie - cleared by backend on logout
    localStorage.removeItem('dealer_refresh_token'); // Legacy cleanup
    localStorage.removeItem('refreshToken'); // Legacy cleanup
    localStorage.removeItem('dealer_user');
    localStorage.removeItem('user'); // Old user key
  },
  expiresAt()   { return Number(localStorage.getItem(PORTAL_CONFIG.expiresAtKey) || 0); },
  isExpiringSoon(thresholdSeconds = 60) {
    return this.expiresAt() - Date.now() < thresholdSeconds * 1000;
  },
};

let isRefreshing = false;
let refreshQueue = [];

function processQueue(error, newToken = null) {
  refreshQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(newToken)
  );
  refreshQueue = [];
}

async function doRefresh() {
  // Refresh token is in HttpOnly cookie (skill requirement) - sent automatically
  // Cookie is sent automatically with credentials: true
  const { data } = await axios.post(
    `${PORTAL_CONFIG.gatewayUrl}${PORTAL_CONFIG.refreshEndpoint}`,
    {}, // No body needed - refresh token is in HttpOnly cookie
    { withCredentials: true }, // Required for cookies
  );
  tokenStore.set(data.accessToken, data.expiresIn || 900);
  // Note: refreshToken not in response - it's in HttpOnly cookie
  return data.accessToken;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === PORTAL_CONFIG.tokenKey && event.newValue) {
      if (isRefreshing) {
        isRefreshing = false;
        processQueue(null, event.newValue);
      }
    }
    if (event.key === PORTAL_CONFIG.tokenKey && event.newValue === null) {
      window.location.href = '/login';
    }
  });
}

const api = axios.create({ 
  baseURL: PORTAL_CONFIG.gatewayUrl,
  withCredentials: true, // Required for HttpOnly cookies (skill requirement)
});

api.interceptors.request.use(async (config) => {
  if (config.url?.includes(PORTAL_CONFIG.refreshEndpoint)) return config;

  const token = tokenStore.get();
  if (!token) return config;

  if (tokenStore.isExpiringSoon(60) && !isRefreshing) {
    isRefreshing = true;
    try {
      const newToken = await doRefresh();
      processQueue(null, newToken);
      config.headers.Authorization = `Bearer ${newToken}`;
    } catch (err) {
      processQueue(err);
      tokenStore.clear();
      window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  } else {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (originalRequest.url?.includes(PORTAL_CONFIG.refreshEndpoint)) {
      tokenStore.clear();
      window.location.href = '/login';
      return Promise.reject(err);
    }

    if (err.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(err);
    }

    const tokenError = err.response.headers['x-token-error'] || 
                      (err.response.headers['x-token-expired'] === 'true' ? 'tokenExpired' : null);

    if (tokenError === 'tokenInvalid') {
      tokenStore.clear();
      window.location.href = '/login';
      return Promise.reject(err);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api.request(originalRequest));
          },
          reject,
        });
      });
    }

    if (!tokenStore.isExpiringSoon(0)) {
      const freshToken = tokenStore.get();
      originalRequest.headers.Authorization = `Bearer ${freshToken}`;
      return api.request(originalRequest);
    }

    isRefreshing = true;

    try {
      const newToken = await doRefresh();
      processQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api.request(originalRequest);
    } catch (refreshErr) {
      processQueue(refreshErr);
      tokenStore.clear();
      window.location.href = '/login';
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    if (!tokenStore.get()) return;
    if (!tokenStore.isExpiringSoon(120)) return;

    if (isRefreshing) return;
    isRefreshing = true;
    try {
      const newToken = await doRefresh();
      processQueue(null, newToken);
    } catch {
      processQueue(new Error('Session expired'));
      tokenStore.clear();
      window.location.href = '/login';
    } finally {
      isRefreshing = false;
    }
  });
}

export default api;
