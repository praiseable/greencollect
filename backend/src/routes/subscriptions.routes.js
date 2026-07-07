const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const {
  debitWalletWithClient,
  serializeWallet,
  WalletError,
  getActiveBuyerSubscription,
  extractPlanDepositPercent,
} = require('../services/wallet.service');

const BUYER_PLAN_FLAG_KEYS = ['buyerPremium', 'buyerPlan', 'buyer_premium', 'buyer_plan'];

function planFeatures(plan) {
  return plan && plan.features && typeof plan.features === 'object' && !Array.isArray(plan.features)
    ? plan.features
    : {};
}

function isBuyerPlan(plan) {
  const features = planFeatures(plan);
  return BUYER_PLAN_FLAG_KEYS.some((key) => features[key] === true) || String(plan?.slug || '').includes('buyer');
}

function pickPrice(plan, interval = 'MONTHLY', currencyId = 'PKR') {
  const prices = Array.isArray(plan?.prices) ? plan.prices : [];
  return prices.find((p) => p.interval === interval && p.currencyId === currencyId)
    || prices.find((p) => p.currencyId === currencyId)
    || prices[0]
    || null;
}

function durationForInterval(interval = 'MONTHLY') {
  const now = new Date();
  const expiresAt = new Date(now);
  if (interval === 'YEARLY') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  else if (interval === 'QUARTERLY') expiresAt.setMonth(expiresAt.getMonth() + 3);
  else expiresAt.setMonth(expiresAt.getMonth() + 1);
  return { now, expiresAt };
}

function serializePlan(plan, opts = {}) {
  if (!plan) return null;
  const features = planFeatures(plan);
  const prices = (plan.prices || []).map((price) => ({
    ...price,
    pricePaisa: price.pricePaisa?.toString?.() ?? String(price.pricePaisa ?? '0'),
    amountFormatted: `₨ ${Number(price.pricePaisa || 0n).toLocaleString('en-PK')}`,
  }));
  const depositPercent = extractPlanDepositPercent(plan);
  return {
    ...plan,
    features,
    prices,
    buyerPremium: true,
    audience: 'BUYER',
    sellerVisible: false,
    depositPercent: depositPercent ?? features.depositPercent ?? features.deposit_percent ?? null,
    concurrentDepositCap: Number(features.concurrentDepositCap || features.concurrent_deposit_cap || 3),
    selectedPrice: opts.selectedPrice
      ? {
          ...opts.selectedPrice,
          pricePaisa: opts.selectedPrice.pricePaisa?.toString?.() ?? String(opts.selectedPrice.pricePaisa ?? '0'),
        }
      : undefined,
  };
}

async function expireDueSubscriptionForUser(userId, client = prisma) {
  const existing = await client.userSubscription.findUnique({
    where: { userId },
    include: { plan: { include: { prices: { include: { currency: true } } } } },
  });
  if (!existing) return null;
  if (['EXPIRED', 'CANCELLED'].includes(existing.status)) return existing;
  if (existing.expiresAt && existing.expiresAt <= new Date()) {
    const expired = await client.userSubscription.update({
      where: { userId },
      data: { status: 'EXPIRED' },
      include: { plan: { include: { prices: { include: { currency: true } } } } },
    });
    await client.notification.create({
      data: {
        userId,
        type: 'SUBSCRIPTION_EXPIRED',
        title: 'Subscription expired',
        body: 'Your buyer premium subscription expired. Your account has reverted to the Basic deposit tier.',
        data: { event: 'SUBSCRIPTION_EXPIRED', subscriptionId: expired.id, planId: expired.planId },
      },
    }).catch(() => null);
    return expired;
  }
  return existing;
}

// GET /subscriptions/plans — Available buyer premium plans only.
// Sellers must never be offered seller-side plans or listing gates.
router.get('/plans', async (req, res) => {
  try {
    const { countryId = 'PK', interval = 'MONTHLY', currencyId = 'PKR' } = req.query;
    const rows = await prisma.subscriptionPlan.findMany({
      where: { isActive: true, countryId },
      include: { prices: { include: { currency: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const plans = rows
      .filter(isBuyerPlan)
      .map((plan) => serializePlan(plan, { selectedPrice: pickPrice(plan, interval, currencyId) }));
    res.json(plans);
  } catch (err) {
    console.error('GET /subscriptions/plans error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch plans' } });
  }
});

// GET /subscriptions/my — Current user subscription. Lazily expires old subscriptions.
router.get('/my', authenticate, async (req, res) => {
  try {
    const sub = await expireDueSubscriptionForUser(req.user.id);
    if (!sub) return res.json(null);
    res.json({
      ...sub,
      plan: serializePlan(sub.plan),
    });
  } catch (err) {
    console.error('GET /subscriptions/my error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch subscription' } });
  }
});

// POST /subscriptions/subscribe — Buyer premium purchase from wallet.
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { planId, interval = 'MONTHLY', currencyId = 'PKR' } = req.body || {};
    if (!planId) return res.status(400).json({ error: { message: 'planId is required', code: 'VALIDATION_ERROR' } });

    const result = await prisma.$transaction(async (tx) => {
      const plan = await tx.subscriptionPlan.findUnique({
        where: { id: planId },
        include: { prices: { include: { currency: true } } },
      });
      if (!plan || !plan.isActive || !isBuyerPlan(plan)) {
        const err = new WalletError('Buyer premium plan not found', 'PLAN_NOT_FOUND', 404);
        throw err;
      }

      const price = pickPrice(plan, interval, currencyId);
      if (!price) throw new WalletError('Plan price not configured for requested currency/interval', 'PLAN_PRICE_NOT_FOUND', 404);

      const amountPaisa = BigInt(price.pricePaisa || 0n);
      let wallet = null;
      if (amountPaisa > 0n) {
        wallet = await debitWalletWithClient(tx, req.user.id, amountPaisa, {
          type: 'DEBIT',
          referenceType: 'SUBSCRIPTION_PURCHASE',
          referenceId: plan.id,
          note: `Buyer premium subscription purchased: ${plan.name}`,
          metadata: { planId: plan.id, slug: plan.slug, interval: price.interval, currencyId: price.currencyId },
        });
      }

      const { now, expiresAt } = durationForInterval(price.interval || interval);
      const sub = await tx.userSubscription.upsert({
        where: { userId: req.user.id },
        update: { planId: plan.id, status: 'ACTIVE', startedAt: now, expiresAt },
        create: { userId: req.user.id, planId: plan.id, status: 'ACTIVE', startedAt: now, expiresAt },
        include: { plan: { include: { prices: { include: { currency: true } } } } },
      });

      await tx.notification.create({
        data: {
          userId: req.user.id,
          type: 'SYSTEM',
          title: 'Buyer premium activated',
          body: `${plan.name} is active. New deposits will use your buyer premium deposit tier.`,
          data: { event: 'SUBSCRIPTION_ACTIVATED', subscriptionId: sub.id, planId: plan.id, interval: price.interval, amountPaisa: amountPaisa.toString() },
        },
      }).catch(() => null);

      return { sub, wallet, price, amountPaisa };
    });

    res.json({
      subscription: {
        ...result.sub,
        plan: serializePlan(result.sub.plan, { selectedPrice: result.price }),
      },
      chargedPaisa: result.amountPaisa.toString(),
      wallet: result.wallet ? serializeWallet(result.wallet) : null,
    });
  } catch (err) {
    if (err instanceof WalletError) {
      return res.status(err.status).json({ error: { message: err.message, code: err.code, ...err.details } });
    }
    console.error('POST /subscriptions/subscribe error:', err);
    res.status(500).json({ error: { message: 'Failed to subscribe' } });
  }
});

// POST /subscriptions/maintenance/warn-expiring — Admin-triggerable 7d/1d warning sweep.
router.post('/maintenance/warn-expiring', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const days = Math.max(1, Math.min(30, Number(req.body?.days || req.query?.days || 7) || 7));
    const now = new Date();
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const due = await prisma.userSubscription.findMany({
      where: { status: { in: ['ACTIVE', 'GRACE_PERIOD'] }, expiresAt: { gt: now, lte: until } },
      include: { plan: true },
      take: 500,
    });

    const notifications = [];
    for (const sub of due) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: sub.userId,
          type: 'SUBSCRIPTION_EXPIRING',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      });
      if (existing) continue;
      notifications.push({
        userId: sub.userId,
        type: 'SUBSCRIPTION_EXPIRING',
        title: 'Subscription expiring',
        body: `Your buyer premium subscription expires on ${sub.expiresAt.toISOString().slice(0, 10)}.`,
        data: { event: 'SUBSCRIPTION_EXPIRING', subscriptionId: sub.id, planId: sub.planId, expiresAt: sub.expiresAt.toISOString(), days },
      });
    }

    if (notifications.length) await prisma.notification.createMany({ data: notifications });
    res.json({ warningCount: notifications.length, checkedCount: due.length, days });
  } catch (err) {
    console.error('POST /subscriptions/maintenance/warn-expiring error:', err);
    res.status(500).json({ error: { message: 'Failed to warn expiring subscriptions' } });
  }
});

// POST /subscriptions/maintenance/expire-due — Admin-triggerable expiry sweep.
router.post('/maintenance/expire-due', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const due = await prisma.userSubscription.findMany({
      where: { status: { in: ['ACTIVE', 'GRACE_PERIOD'] }, expiresAt: { lte: new Date() } },
      select: { userId: true },
      take: 500,
    });
    const expired = [];
    for (const row of due) {
      const sub = await expireDueSubscriptionForUser(row.userId);
      if (sub?.status === 'EXPIRED') expired.push(sub.id);
    }
    res.json({ expiredCount: expired.length, expiredSubscriptionIds: expired });
  } catch (err) {
    console.error('POST /subscriptions/maintenance/expire-due error:', err);
    res.status(500).json({ error: { message: 'Failed to expire subscriptions' } });
  }
});

// POST /subscriptions/plans — Create buyer premium plan (admin)
router.post('/plans', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { name, slug, description, features, maxListings, maxZones, countryId, prices } = req.body || {};
    const normalizedFeatures = {
      ...(features && typeof features === 'object' ? features : {}),
      buyerPremium: true,
      sellerVisible: false,
    };
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        slug,
        description,
        features: normalizedFeatures,
        maxListings: maxListings || 0,
        maxZones: maxZones || 0,
        countryId: countryId || 'PK',
        prices: prices ? {
          create: prices.map((p) => ({
            currencyId: p.currencyId || 'PKR',
            pricePaisa: BigInt(p.pricePaisa),
            interval: p.interval || 'MONTHLY',
          })),
        } : undefined,
      },
      include: { prices: { include: { currency: true } } },
    });
    res.status(201).json(serializePlan(plan));
  } catch (err) {
    console.error('POST /subscriptions/plans error:', err);
    res.status(500).json({ error: { message: 'Failed to create plan' } });
  }
});

module.exports = router;
