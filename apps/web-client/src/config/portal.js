// apps/web-client/src/config/portal.js
export const PORTAL_CONFIG = {
  portalId:        'dealer',
  gatewayUrl:      import.meta.env.VITE_API_URL || '/api',
  loginEndpoint:   '/auth/dealer/login',
  refreshEndpoint: '/auth/refresh',
  tokenKey:        'dealer_access_token',
  expiresAtKey:    'dealer_token_expires_at',
};
