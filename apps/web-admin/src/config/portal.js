// apps/web-admin/src/config/portal.js
export const PORTAL_CONFIG = {
  portalId:        'admin',
  gatewayUrl:      import.meta.env.VITE_API_URL || '/api',
  loginEndpoint:   '/auth/admin/login',
  refreshEndpoint: '/auth/refresh',
  tokenKey:        'admin_access_token',
  expiresAtKey:    'admin_token_expires_at',
};
