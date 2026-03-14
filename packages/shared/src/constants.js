// packages/shared/src/constants.js
// NEVER use raw strings for portals or roles — always import from here

const Portal = Object.freeze({
  ADMIN:    'admin',
  CUSTOMER: 'customer',
  VENDOR:   'vendor',
  AGENT:    'agent',
  DEALER:   'dealer',      // For dealer/franchise portal
});

const Role = Object.freeze({
  // Admin roles
  SUPER_ADMIN:       'SUPER_ADMIN',
  ADMIN:             'ADMIN',
  ADMIN_VIEWER:      'ADMIN_VIEWER',
  // Customer roles
  CUSTOMER:          'CUSTOMER',
  PREMIUM_CUSTOMER:  'PREMIUM_CUSTOMER',
  // Vendor roles
  VENDOR_OWNER:      'VENDOR_OWNER',
  VENDOR_STAFF:      'VENDOR_STAFF',
  // Agent roles
  AGENT:             'AGENT',
  AGENT_LEAD:        'AGENT_LEAD',
  // Dealer/Franchise roles
  DEALER:            'DEALER',
  FRANCHISE_OWNER:   'FRANCHISE_OWNER',
  REGIONAL_MANAGER:  'REGIONAL_MANAGER',
  WHOLESALE_BUYER:   'WHOLESALE_BUYER',
  COLLECTION_MANAGER: 'COLLECTION_MANAGER',
});

// Maps each portal to its allowed roles
const PORTAL_ROLES = {
  [Portal.ADMIN]:    [Role.SUPER_ADMIN, Role.ADMIN, Role.ADMIN_VIEWER, Role.COLLECTION_MANAGER],
  [Portal.CUSTOMER]: [Role.CUSTOMER, Role.PREMIUM_CUSTOMER],
  [Portal.VENDOR]:   [Role.VENDOR_OWNER, Role.VENDOR_STAFF],
  [Portal.AGENT]:    [Role.AGENT, Role.AGENT_LEAD],
  [Portal.DEALER]:   [Role.DEALER, Role.FRANCHISE_OWNER, Role.REGIONAL_MANAGER, Role.WHOLESALE_BUYER],
};

// Maps role to default portal (for backward compatibility)
const ROLE_TO_PORTAL = {
  [Role.SUPER_ADMIN]:       Portal.ADMIN,
  [Role.ADMIN]:             Portal.ADMIN,
  [Role.ADMIN_VIEWER]:      Portal.ADMIN,
  [Role.COLLECTION_MANAGER]: Portal.ADMIN,
  [Role.CUSTOMER]:          Portal.CUSTOMER,
  [Role.PREMIUM_CUSTOMER]:  Portal.CUSTOMER,
  [Role.VENDOR_OWNER]:      Portal.VENDOR,
  [Role.VENDOR_STAFF]:      Portal.VENDOR,
  [Role.AGENT]:             Portal.AGENT,
  [Role.AGENT_LEAD]:        Portal.AGENT,
  [Role.DEALER]:            Portal.DEALER,
  [Role.FRANCHISE_OWNER]:   Portal.DEALER,
  [Role.REGIONAL_MANAGER]:  Portal.DEALER,
  [Role.WHOLESALE_BUYER]:   Portal.DEALER,
};

module.exports = { Portal, Role, PORTAL_ROLES, ROLE_TO_PORTAL };
