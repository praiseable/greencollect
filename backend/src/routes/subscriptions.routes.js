const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize } = require('../middleware/auth');

// GET /subscriptions/plans — Available plans
router.get('/plans', async (req, res) => {
  try {
    const { countryId = 'PK' } = req.query;
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true, countryId },
      include: { prices: { include: { currency: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch plans' } });
  }
});

// GET /subscriptions/my — Current user subscription
router.get('/my', authenticate, async (req, res) => {
  try {
    const sub = await prisma.userSubscription.findUnique({
      where: { userId: req.user.id },
      include: { plan: { include: { prices: { include: { currency: true } } } } },
    });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch subscription' } });
  }
});

// POST /subscriptions/subscribe
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: { message: 'Plan not found' } });

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const sub = await prisma.userSubscription.upsert({
      where: { userId: req.user.id },
      update: { planId, status: 'ACTIVE', expiresAt },
      create: { userId: req.user.id, planId, status: 'ACTIVE', expiresAt },
    });

    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to subscribe' } });
  }
});

// POST /subscriptions/plans — Create plan (admin)
router.post('/plans', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { name, slug, description, features, maxListings, maxZones, countryId, prices } = req.body;
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name, slug, description, features, maxListings, maxZones,
        countryId: countryId || 'PK',
        prices: prices ? {
          create: prices.map(p => ({ currencyId: p.currencyId, pricePaisa: BigInt(p.pricePaisa), interval: p.interval || 'MONTHLY' })),
        } : undefined,
      },
      include: { prices: true },
    });
    res.status(201).json(plan);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to create plan' } });
  }
});

module.exports = router;
