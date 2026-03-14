const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { portalCheck } = require('../middleware/portalCheck');
const { Portal } = require('../../../packages/shared/src/constants');

// Admin-only routes - require admin portal token
router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN'), portalCheck(Portal.ADMIN));

// GET /admin/dashboard — Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers, activeListings, totalTransactions,
      totalCategories, usersByRole, recentListings,
      listingsByStatus, recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.listing.count({ where: { status: 'ACTIVE' } }),
      prisma.transaction.count(),
      prisma.category.count({ where: { isActive: true } }),
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.listing.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { select: { firstName: true, lastName: true } },
          category: { include: { translations: { where: { languageId: 'en' } } } },
        },
      }),
      prisma.listing.groupBy({ by: ['status'], _count: true }),
      prisma.user.findMany({ take: 10, orderBy: { createdAt: 'desc' }, select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true } }),
    ]);

    res.json({
      stats: { totalUsers, activeListings, totalTransactions, totalCategories },
      usersByRole,
      listingsByStatus,
      recentListings: recentListings.map(l => ({ ...l, pricePaisa: l.pricePaisa?.toString() })),
      recentUsers,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch dashboard' } });
  }
});

// GET /admin/audit-logs — Audit log viewer
router.get('/audit-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, entity, userId } = req.query;
    const where = {};
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ data: logs, total });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch audit logs' } });
  }
});

// GET /admin/platform-config
router.get('/platform-config', async (req, res) => {
  try {
    const configs = await prisma.platformConfig.findMany();
    const map = {};
    configs.forEach(c => { map[c.key] = c.value; });
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch config' } });
  }
});

// PUT /admin/platform-config
router.put('/platform-config', async (req, res) => {
  try {
    const updates = req.body; // { key: value, key: value }
    for (const [key, value] of Object.entries(updates)) {
      await prisma.platformConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { id: key, key, value: String(value) },
      });
    }
    res.json({ message: 'Config updated' });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to update config' } });
  }
});

// GET /admin/all-listings — All listings (admin view)
router.get('/all-listings', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const where = {};
    if (status) where.status = status;

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { select: { id: true, firstName: true, lastName: true, email: true } },
          category: { include: { translations: { where: { languageId: 'en' } } } },
          geoZone: { select: { name: true } },
          images: { take: 1 },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      data: listings.map(l => ({ ...l, pricePaisa: l.pricePaisa?.toString() })),
      total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch listings' } });
  }
});

// PUT /admin/listings/:id/status — Change listing status
router.put('/listings/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const listing = await prisma.listing.update({ where: { id: req.params.id }, data: { status } });
    res.json({ ...listing, pricePaisa: listing.pricePaisa?.toString() });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to update listing status' } });
  }
});

module.exports = router;
