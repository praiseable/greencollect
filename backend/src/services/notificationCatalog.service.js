const NOTIFICATION_CATALOG = {
  DEPOSIT_PLACED: {
    type: 'SYSTEM',
    title: 'Buyer deposit placed',
    screen: 'listingDetail',
    deepLinkTemplate: '/listings/:listingId',
    description: 'Seller receives this when a buyer places a deposit on their listing.',
  },
  DEPOSIT_REFUNDED: {
    type: 'SYSTEM',
    title: 'Deposit refunded',
    screen: 'wallet',
    deepLinkTemplate: '/wallet',
    description: 'Buyer receives this when escrow is released/refunded.',
  },
  OFFER_RECEIVED: {
    type: 'OFFER_RECEIVED',
    title: 'Offer received',
    screen: 'transactionDetail',
    deepLinkTemplate: '/transactions/:transactionId',
    description: 'Seller receives this when a deposited buyer submits an offer.',
  },
  OFFER_ACCEPTED: {
    type: 'OFFER_ACCEPTED',
    title: 'Offer accepted',
    screen: 'transactionDetail',
    deepLinkTemplate: '/transactions/:transactionId',
    description: 'Buyer receives this when the seller accepts a funded offer.',
  },
  OFFER_REJECTED: {
    type: 'OFFER_REJECTED',
    title: 'Offer rejected',
    screen: 'listingDetail',
    deepLinkTemplate: '/listings/:listingId',
    description: 'Buyer receives this when an offer is rejected.',
  },
  CHAT_MESSAGE: {
    type: 'CHAT_MESSAGE',
    title: 'Chat message',
    screen: 'chat',
    deepLinkTemplate: '/chat/:chatUserId',
    description: 'Recipient receives this for a new chat message.',
  },
  DEAL_FINALIZED: {
    type: 'SYSTEM',
    title: 'Deal finalized',
    screen: 'transactionDetail',
    deepLinkTemplate: '/transactions/:transactionId',
    description: 'Both parties receive this after Secure Handshake finalization.',
  },
  BOND_READY: {
    type: 'SYSTEM',
    title: 'Bond ready',
    screen: 'bondDetail',
    deepLinkTemplate: '/bonds/:bondId',
    description: 'Parties receive this when the finalized deal bond is ready.',
  },
  DISPUTE_OPENED: {
    type: 'SYSTEM',
    title: 'Dispute opened',
    screen: 'disputeDetail',
    deepLinkTemplate: '/disputes/:disputeId',
    description: 'Both parties receive this when a dispute is opened.',
  },
  DISPUTE_RESOLVED: {
    type: 'SYSTEM',
    title: 'Dispute resolved',
    screen: 'disputeDetail',
    deepLinkTemplate: '/disputes/:disputeId',
    description: 'Both parties receive this when admin resolves a dispute.',
  },
  KYC_STATUS: {
    type: 'SYSTEM',
    title: 'KYC status update',
    screen: 'kyc',
    deepLinkTemplate: '/profile/kyc',
    description: 'User receives this when KYC is approved or rejected.',
  },
  SUBSCRIPTION_EXPIRING: {
    type: 'SUBSCRIPTION_EXPIRING',
    title: 'Subscription expiring',
    screen: 'subscriptions',
    deepLinkTemplate: '/subscriptions',
    description: 'Buyer receives this before a buyer premium plan expires.',
  },
  SUBSCRIPTION_EXPIRED: {
    type: 'SUBSCRIPTION_EXPIRED',
    title: 'Subscription expired',
    screen: 'subscriptions',
    deepLinkTemplate: '/subscriptions',
    description: 'Buyer receives this when the account reverts to Basic tier.',
  },
};

function pickFirst(data, keys) {
  for (const key of keys) {
    if (data && data[key] !== undefined && data[key] !== null && data[key] !== '') return data[key];
  }
  return null;
}

function inferEvent(notification) {
  const data = notification?.data || {};
  if (data.event && NOTIFICATION_CATALOG[data.event]) return data.event;

  if (notification.type && notification.type !== 'SYSTEM' && NOTIFICATION_CATALOG[notification.type]) {
    return notification.type;
  }

  const title = String(notification.title || '').toLowerCase();
  const body = String(notification.body || '').toLowerCase();
  const text = `${title} ${body}`;

  if (text.includes('deposit') && (text.includes('placed') || text.includes('unlocked'))) return 'DEPOSIT_PLACED';
  if (text.includes('deposit') && (text.includes('refund') || text.includes('released'))) return 'DEPOSIT_REFUNDED';
  if (text.includes('offer') && text.includes('accepted')) return 'OFFER_ACCEPTED';
  if (text.includes('offer') && text.includes('rejected')) return 'OFFER_REJECTED';
  if (text.includes('offer')) return 'OFFER_RECEIVED';
  if (text.includes('message')) return 'CHAT_MESSAGE';
  if (text.includes('bond')) return 'BOND_READY';
  if (text.includes('deal finalized') || text.includes('finalized')) return 'DEAL_FINALIZED';
  if (text.includes('dispute') && text.includes('resolved')) return 'DISPUTE_RESOLVED';
  if (text.includes('dispute')) return 'DISPUTE_OPENED';
  if (text.includes('kyc')) return 'KYC_STATUS';
  if (text.includes('subscription') && text.includes('expiring')) return 'SUBSCRIPTION_EXPIRING';
  if (text.includes('subscription') && text.includes('expired')) return 'SUBSCRIPTION_EXPIRED';

  return 'SYSTEM';
}

function buildDeepLink(event, rawData = {}) {
  const data = rawData || {};
  const catalogItem = NOTIFICATION_CATALOG[event];

  if (data.deepLink) return String(data.deepLink);
  if (event === 'CHAT_MESSAGE') {
    const chatUserId = pickFirst(data, ['chatUserId', 'fromUserId', 'toUserId']);
    return chatUserId ? `/chat/${chatUserId}` : '/chat';
  }
  if (event === 'BOND_READY') {
    const bondId = pickFirst(data, ['bondId']);
    return bondId ? `/bonds/${bondId}` : '/transactions';
  }
  if (event === 'DISPUTE_OPENED' || event === 'DISPUTE_RESOLVED') {
    const disputeId = pickFirst(data, ['disputeId']);
    return disputeId ? `/disputes/${disputeId}` : '/disputes';
  }
  if (event === 'DEAL_FINALIZED' || event === 'OFFER_ACCEPTED' || event === 'OFFER_RECEIVED') {
    const transactionId = pickFirst(data, ['transactionId', 'id']);
    if (transactionId) return `/transactions/${transactionId}`;
  }
  if (event === 'DEPOSIT_PLACED' || event === 'OFFER_REJECTED') {
    const listingId = pickFirst(data, ['listingId']);
    if (listingId) return `/listings/${listingId}`;
  }
  if (event === 'DEPOSIT_REFUNDED') return '/wallet';
  if (event === 'KYC_STATUS') return '/profile/kyc';
  if (event === 'SUBSCRIPTION_EXPIRING' || event === 'SUBSCRIPTION_EXPIRED') return '/subscriptions';

  return catalogItem?.deepLinkTemplate?.replace(/:\w+/g, '') || '/notifications';
}

function enrichNotification(notification) {
  if (!notification) return notification;

  const event = inferEvent(notification);
  const catalogItem = NOTIFICATION_CATALOG[event] || {
    type: notification.type || 'SYSTEM',
    screen: 'notifications',
    deepLinkTemplate: '/notifications',
  };
  const data = notification.data && typeof notification.data === 'object' ? notification.data : {};
  const deepLink = buildDeepLink(event, data);

  return {
    ...notification,
    data: {
      ...data,
      event,
      screen: data.screen || catalogItem.screen || 'notifications',
      deepLink,
    },
  };
}

function getNotificationCatalog() {
  return Object.entries(NOTIFICATION_CATALOG).map(([event, value]) => ({ event, ...value }));
}

module.exports = {
  NOTIFICATION_CATALOG,
  buildDeepLink,
  enrichNotification,
  getNotificationCatalog,
};
