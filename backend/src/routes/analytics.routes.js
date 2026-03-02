const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'COLLECTION_MANAGER'));

// GET /analytics/overview
router.get('/overview', async (req, res) => {
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
      prisma.transaction.count({ where: { status: 'COMPLETED' } }),
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

// GET /analytics/listings-by-category
router.get('/listings-by-category', async (req, res) => {
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

// GET /analytics/listings-by-zone
router.get('/listings-by-zone', async (req, res) => {
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
