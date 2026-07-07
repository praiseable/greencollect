const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'COLLECTION_MANAGER'];
const requireAdmin = authorize(...ADMIN_ROLES);

function toBigInt(value) {
  if (value === null || value === undefined) return 0n;
  try { return BigInt(value); } catch (_) { return 0n; }
}

function paisa(value) {
  return toBigInt(value).toString();
}

function averageMsToHours(ms) {
  if (!ms || ms <= 0) return null;
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

function isPremiumPlan(plan) {
  if (!plan) return false;
  const slug = String(plan.slug || '').toLowerCase();
  const name = String(plan.name || '').toLowerCase();
  const features = plan.features || {};
  return Boolean(features.buyerPremium) && (slug.includes('pro') || slug.includes('enterprise') || name.includes('pro') || name.includes('enterprise'));
}

async function getActiveBuyerSubscription(userId) {
  const sub = await prisma.userSubscription.findUnique({
    where: { userId },
    include: { plan: true },
  });
  if (!sub || sub.status !== 'ACTIVE' || new Date(sub.expiresAt) <= new Date()) return null;
  return sub;
}

async function getBuyerTier(userId) {
  const sub = await getActiveBuyerSubscription(userId);
  if (!sub || !isPremiumPlan(sub.plan)) {
    return {
      tier: 'BASIC',
      planId: null,
      planName: 'Basic',
      premiumAnalyticsUnlocked: false,
      subscriptionExpiresAt: null,
    };
  }
  const slug = String(sub.plan.slug || sub.plan.name || '').toLowerCase();
  const tier = slug.includes('enterprise') ? 'ENTERPRISE' : 'PRO';
  return {
    tier,
    planId: sub.planId,
    planName: sub.plan.name,
    premiumAnalyticsUnlocked: true,
    subscriptionExpiresAt: sub.expiresAt,
  };
}

async function categoryTrendsForBuyer(buyerId) {
  const finalized = await prisma.transaction.findMany({
    where: { buyerId, status: { in: ['FINALIZED', 'COMPLETED'] } },
    include: {
      listing: {
        include: { category: { include: { translations: { where: { languageId: 'en' } } } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  const grouped = new Map();
  for (const tx of finalized) {
    const categoryId = tx.listing?.categoryId || 'uncategorized';
    const current = grouped.get(categoryId) || {
      categoryId,
      categoryName: tx.listing?.category?.translations?.[0]?.name || tx.listing?.category?.slug || 'Uncategorized',
      transactionCount: 0,
      volumePaisa: 0n,
    };
    current.transactionCount += 1;
    current.volumePaisa += toBigInt(tx.actualPricePaisa || tx.finalPricePaisa || tx.amountPaisa);
    grouped.set(categoryId, current);
  }

  return [...grouped.values()]
    .map((r) => ({ ...r, volumePaisa: r.volumePaisa.toString() }))
    .sort((a, b) => Number(BigInt(b.volumePaisa) - BigInt(a.volumePaisa)))
    .slice(0, 10);
}

// UC-ANL-01 — Seller analytics are free and never subscription gated.
router.get('/seller', async (req, res) => {
  try {
    const sellerId = req.user.id;
    const listings = await prisma.listing.findMany({
      where: { sellerId },
      select: {
        id: true,
        title: true,
        status: true,
        viewCount: true,
        interestedCount: true,
        pricePaisa: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    const listingIds = listings.map((l) => l.id);

    const [deposits, offersReceived, finalizedDeals] = await Promise.all([
      listingIds.length ? prisma.listingDeposit.findMany({
        where: { listingId: { in: listingIds } },
        select: { id: true, listingId: true, status: true, amountPaisa: true, heldAt: true, createdAt: true, listing: { select: { createdAt: true } } },
      }) : [],
      prisma.transaction.count({ where: { sellerId } }),
      prisma.transaction.findMany({
        where: { sellerId, status: { in: ['FINALIZED', 'COMPLETED'] } },
        select: { id: true, actualPricePaisa: true, finalPricePaisa: true, amountPaisa: true, finalizedAt: true, updatedAt: true },
      }),
    ]);

    const totalViews = listings.reduce((sum, l) => sum + (l.viewCount || 0), 0);
    const totalInterested = listings.reduce((sum, l) => sum + (l.interestedCount || 0), 0);
    const activeListings = listings.filter((l) => l.status === 'ACTIVE').length;
    const depositAmount = deposits.reduce((sum, d) => sum + toBigInt(d.amountPaisa), 0n);
    const closedVolume = finalizedDeals.reduce((sum, tx) => sum + toBigInt(tx.actualPricePaisa || tx.finalPricePaisa || tx.amountPaisa), 0n);

    const depositAges = deposits
      .map((d) => {
        const listingCreated = d.listing?.createdAt ? new Date(d.listing.createdAt).getTime() : null;
        const heldAt = d.heldAt ? new Date(d.heldAt).getTime() : new Date(d.createdAt).getTime();
        return listingCreated && heldAt >= listingCreated ? heldAt - listingCreated : null;
      })
      .filter((v) => v !== null);
    const avgTimeToDepositHours = depositAges.length
      ? averageMsToHours(depositAges.reduce((a, b) => a + b, 0) / depositAges.length)
      : null;

    res.json({
      sellerFree: true,
      requiresSubscription: false,
      paywall: false,
      userId: sellerId,
      listingStats: {
        totalListings: listings.length,
        activeListings,
        totalViews,
        totalInterested,
        depositsPlaced: deposits.length,
        activeDeposits: deposits.filter((d) => d.status === 'HELD').length,
        depositAmountPaisa: depositAmount.toString(),
        offersReceived,
        dealsClosed: finalizedDeals.length,
        closedVolumePaisa: closedVolume.toString(),
        avgTimeToDepositHours,
      },
      recentListings: listings.slice(0, 10).map((l) => ({
        ...l,
        pricePaisa: paisa(l.pricePaisa),
      })),
    });
  } catch (err) {
    console.error('Seller analytics error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch seller analytics', code: 'INTERNAL_ERROR' } });
  }
});

router.get('/seller/overview', (req, res, next) => {
  req.url = '/seller';
  next('route');
});

// UC-ANL-02 — Buyer analytics; base tier remains useful, premium unlocks deeper trend data.
router.get('/buyer', async (req, res) => {
  try {
    const buyerId = req.user.id;
    const tier = await getBuyerTier(buyerId);

    const [deposits, transactions] = await Promise.all([
      prisma.listingDeposit.findMany({
        where: { buyerId },
        orderBy: { createdAt: 'desc' },
        include: { listing: { select: { id: true, title: true, categoryId: true, pricePaisa: true, status: true } } },
      }),
      prisma.transaction.findMany({
        where: { buyerId },
        orderBy: { createdAt: 'desc' },
        take: tier.premiumAnalyticsUnlocked ? 100 : 10,
        include: { listing: { select: { id: true, title: true, categoryId: true } } },
      }),
    ]);

    const activeDeposits = deposits.filter((d) => d.status === 'HELD');
    const finalized = transactions.filter((tx) => ['FINALIZED', 'COMPLETED'].includes(tx.status));
    const activeDepositAmount = activeDeposits.reduce((sum, d) => sum + toBigInt(d.amountPaisa), 0n);
    const totalSourcingVolume = finalized.reduce((sum, tx) => sum + toBigInt(tx.actualPricePaisa || tx.finalPricePaisa || tx.amountPaisa), 0n);

    const response = {
      ...tier,
      buyerId,
      currentDeposits: {
        count: activeDeposits.length,
        amountPaisa: activeDepositAmount.toString(),
      },
      transactionHistory: {
        totalReturned: transactions.length,
        totalFinalized: finalized.length,
        totalSourcingVolumePaisa: totalSourcingVolume.toString(),
        rows: transactions.map((tx) => ({
          id: tx.id,
          status: tx.status,
          listingId: tx.listingId,
          listingTitle: tx.listing?.title || null,
          settlementPaisa: paisa(tx.actualPricePaisa || tx.finalPricePaisa || tx.amountPaisa),
          createdAt: tx.createdAt,
        })),
      },
      premiumAnalytics: null,
      upgradePrompt: tier.premiumAnalyticsUnlocked ? null : {
        available: true,
        message: 'Upgrade to Pro Buyer or Enterprise for category trends and bulk sourcing dashboards.',
      },
    };

    if (tier.premiumAnalyticsUnlocked) {
      response.premiumAnalytics = {
        categoryTrends: await categoryTrendsForBuyer(buyerId),
        savedSearchAlerts: true,
        bulkSourcingDashboard: tier.tier === 'ENTERPRISE',
      };
    }

    res.json(response);
  } catch (err) {
    console.error('Buyer analytics error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch buyer analytics', code: 'INTERNAL_ERROR' } });
  }
});

// GET /analytics/overview — admin-only platform overview.
router.get('/overview', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers, newUsersThisMonth,
      totalListings, activeListings, newListingsThisMonth,
      totalTransactions, completedTransactions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.listing.count(),
      prisma.listing.count({ where: { status: 'ACTIVE' } }),
      prisma.listing.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.transaction.count(),
      prisma.transaction.count({ where: { status: { in: ['FINALIZED', 'COMPLETED'] } } }),
    ]);

    res.json({
      users: { total: totalUsers, newThisMonth: newUsersThisMonth },
      listings: { total: totalListings, active: activeListings, newThisMonth: newListingsThisMonth },
      transactions: { total: totalTransactions, completed: completedTransactions },
    });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch analytics' } });
  }
});

// GET /analytics/listings-by-category — admin-only.
router.get('/listings-by-category', requireAdmin, async (req, res) => {
  try {
    const data = await prisma.listing.groupBy({
      by: ['categoryId'],
      _count: true,
      where: { status: 'ACTIVE' },
    });

    const categories = await prisma.category.findMany({
      where: { id: { in: data.map(d => d.categoryId) } },
      include: { translations: { where: { languageId: 'en' } } },
    });

    const result = data.map(d => {
      const cat = categories.find(c => c.id === d.categoryId);
      return { categoryId: d.categoryId, name: cat?.translations[0]?.name || cat?.slug, count: d._count };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch analytics' } });
  }
});

// GET /analytics/listings-by-zone — admin-only.
router.get('/listings-by-zone', requireAdmin, async (req, res) => {
  try {
    const data = await prisma.listing.groupBy({
      by: ['geoZoneId'],
      _count: true,
      where: { status: 'ACTIVE' },
    });

    const zones = await prisma.geoZone.findMany({
      where: { id: { in: data.map(d => d.geoZoneId) } },
    });

    const result = data.map(d => {
      const zone = zones.find(z => z.id === d.geoZoneId);
      return { zoneId: d.geoZoneId, name: zone?.name, count: d._count };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch analytics' } });
  }
});

module.exports = router;
