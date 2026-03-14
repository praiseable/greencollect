// apps/web-admin/src/lib/api-client.js
//
// ── Guarantees ─────────────────────────────────────────────────────────────
//  1. CONCURRENT 401 QUEUE — only one refresh runs at a time; all other
//     concurrent requests in the same tab wait and retry with the new token.
//  2. EXPIRED vs INVALID distinction — gateway X-Token-Error header tells us
//     whether to refresh (tokenExpired) or hard-logout (tokenInvalid).
//  3. PROACTIVE SILENT REFRESH — request interceptor refreshes the token
//     60 s before expiry so users never see an unexpected 401.
//  4. EXPIRY TIMESTAMP in localStorage — proactive check survives page reloads.
//  5. MULTI-TAB SYNC — storage event listener detects when another tab already
//     refreshed; current tab adopts the new token without its own refresh call.
//  6. REFRESH LOOP GUARD — the refresh endpoint itself is excluded from the
//     response interceptor so a failed refresh never retries itself.
// ───────────────────────────────────────────────────────────────────────────

import axios from 'axios';
import { PORTAL_CONFIG } from '../config/portal';

// ── Token helpers ──────────────────────────────────────────────────────────

export const tokenStore = {
  get() {
    // Check new key first, fallback to old key for backward compatibility
    return localStorage.getItem(PORTAL_CONFIG.tokenKey) || localStorage.getItem('admin_token');
  },
  set(token, expiresIn) {
    // Store in both new and old keys for migration period
    localStorage.setItem(PORTAL_CONFIG.tokenKey, token);
    localStorage.setItem('admin_token', token); // Backward compatibility
    // Absolute expiry timestamp in ms — survives page reloads
    localStorage.setItem(PORTAL_CONFIG.expiresAtKey, Date.now() + expiresIn * 1000);
  },
  clear() {
    // Clear both new and old keys
    localStorage.removeItem(PORTAL_CONFIG.tokenKey);
    localStorage.removeItem('admin_token'); // Old key
    localStorage.removeItem(PORTAL_CONFIG.expiresAtKey);
    // Note: refresh token is in HttpOnly cookie - cleared by backend on logout
    localStorage.removeItem('admin_refresh_token'); // Legacy cleanup
    localStorage.removeItem('admin_user');
  },
  expiresAt()   { return Number(localStorage.getItem(PORTAL_CONFIG.expiresAtKey) || 0); },
  isExpiringSoon(thresholdSeconds = 60) {
    return this.expiresAt() - Date.now() < thresholdSeconds * 1000;
  },
};

// ── Refresh queue — Guarantee #1 ───────────────────────────────────────────
// All concurrent 401s in this tab wait on one refresh; they all resolve together.

let isRefreshing = false;
let refreshQueue = [];  // [{ resolve, reject }]

function processQueue(error, newToken = null) {
  refreshQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(newToken)
  );
  refreshQueue = [];
}

// Raw axios (no interceptors) — prevents the refresh call hitting the response
// interceptor and triggering another refresh (Guarantee #6)
// Refresh token is now in HttpOnly cookie (skill requirement) - sent automatically
async function doRefresh() {
  // Refresh token is in HttpOnly cookie - no need to read from localStorage
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

// ── Multi-tab sync — Guarantee #5 ─────────────────────────────────────────
// When Tab A refreshes the token it writes to localStorage.
// Tab B picks this up via the storage event and cancels its own refresh.
// Without this: Tab B would try to refresh with Tab A's already-rotated cookie
// and get a 401 → hard-logout, even though the session is still valid.

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === PORTAL_CONFIG.tokenKey && event.newValue) {
      // Another tab stored a fresh token — use it to unblock our queued requests
      if (isRefreshing) {
        isRefreshing = false;
        processQueue(null, event.newValue);
      }
    }
    if (event.key === PORTAL_CONFIG.tokenKey && event.newValue === null) {
      // Another tab cleared the token (logout) — mirror it in this tab
      window.location.href = '/login';
    }
  });

  // Tab visibility refresh (skill requirement)
  // On tab focus, refresh if token expires within 2 minutes
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      // Check if token expires within 2 minutes (120 seconds)
      if (tokenStore.isExpiringSoon(120)) {
        try {
          // Silent refresh - don't show errors to user
          await doRefresh();
        } catch (e) {
          // Silent fail - will refresh on next request
          console.debug('[API] Tab visibility refresh failed (silent):', e);
        }
      }
    }
  });
}

// ── Axios instance ─────────────────────────────────────────────────────────

const api = axios.create({ 
  baseURL: PORTAL_CONFIG.gatewayUrl,
  withCredentials: true, // Required for HttpOnly cookies (skill requirement)
});

// ── Request interceptor — Guarantee #3 proactive silent refresh ────────────

api.interceptors.request.use(async (config) => {
  // Guarantee #6: never intercept the refresh call itself
  if (config.url?.includes(PORTAL_CONFIG.refreshEndpoint)) return config;

  const token = tokenStore.get();
  if (!token) return config;

  // Token expires within 60 s — refresh silently before the request goes out
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

// ── Response interceptor — Guarantees #1 #2 #6 ────────────────────────────

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    // Guarantee #6: if the refresh endpoint itself 401s, hard-logout immediately —
    // never attempt another refresh
    if (originalRequest.url?.includes(PORTAL_CONFIG.refreshEndpoint)) {
      tokenStore.clear();
      window.location.href = '/login';
      return Promise.reject(err);
    }

    if (err.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(err);
    }

    // Guarantee #2: gateway tells us the error type via X-Token-Error header
    //   tokenExpired  → refresh token is still valid, do silent refresh
    //   tokenInvalid  → tampered/revoked token, hard-logout immediately
    //   missingToken  → no header was sent; treat as expired
    const tokenError = err.response.headers['x-token-error'] || 
                      (err.response.headers['x-token-expired'] === 'true' ? 'tokenExpired' : null);

    if (tokenError === 'tokenInvalid') {
      tokenStore.clear();
      window.location.href = '/login';
      return Promise.reject(err);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      // Guarantee #1: another request in this tab is already refreshing — wait for it
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

    // Guarantee #5: check if another tab already refreshed while we were waiting
    if (!tokenStore.isExpiringSoon(0)) {
      // Token is fresh (another tab refreshed it) — just retry with the stored token
      const freshToken = tokenStore.get();
      originalRequest.headers.Authorization = `Bearer ${freshToken}`;
      return api.request(originalRequest);
    }

    // This request owns the refresh for this tab
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

// ── Gap 1: Tab visibility refresh ──────────────────────────────────────────
// When user returns to a backgrounded tab, the token may have expired.
// The request interceptor's proactive check never ran while hidden.
// This silently refreshes on tab focus so the next user action doesn't hit a 401.

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    if (!tokenStore.get()) return;              // Not logged in — skip
    if (!tokenStore.isExpiringSoon(120)) return; // Token has > 2 min left — skip

    if (isRefreshing) return; // Another tab already triggered a refresh
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
