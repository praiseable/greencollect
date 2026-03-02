const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

// GET /geo-zones — Zone tree
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { countryId = 'PK', type, parentId } = req.query;
    const where = { countryId, isActive: true };
    if (type) where.type = type;
    if (parentId) where.parentId = parentId;
    else if (!type) where.parentId = null; // Top-level zones

    const zones = await prisma.geoZone.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          include: {
            children: {
              where: { isActive: true },
              orderBy: { name: 'asc' },
            },
            _count: { select: { listings: true, users: true } },
          },
        },
        _count: { select: { listings: true, users: true } },
      },
    });

    res.json(zones);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch geo zones' } });
  }
});

// GET /geo-zones/cities — Flat list of cities
router.get('/cities', async (req, res) => {
  try {
    const { countryId = 'PK' } = req.query;
    const cities = await prisma.geoZone.findMany({
      where: { countryId, type: 'CITY', isActive: true },
      orderBy: { name: 'asc' },
      include: { parent: { select: { name: true } } },
    });
    res.json(cities);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch cities' } });
  }
});

// GET /geo-zones/:id
router.get('/:id', async (req, res) => {
  try {
    const zone = await prisma.geoZone.findUnique({
      where: { id: req.params.id },
      include: {
        parent: true,
        children: { where: { isActive: true } },
        _count: { select: { listings: true, users: true } },
      },
    });
    if (!zone) return res.status(404).json({ error: { message: 'Zone not found' } });
    res.json(zone);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch zone' } });
  }
});

// POST /geo-zones (admin)
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { name, slug, type, parentId, countryId, latitude, longitude, radiusKm } = req.body;
    const zone = await prisma.geoZone.create({
      data: { name, slug, type, parentId, countryId: countryId || 'PK', latitude, longitude, radiusKm },
    });
    res.status(201).json(zone);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to create zone' } });
  }
});

// PUT /geo-zones/:id (admin)
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { name, latitude, longitude, radiusKm, isActive } = req.body;
    const data = {};
    if (name) data.name = name;
    if (latitude) data.latitude = latitude;
    if (longitude) data.longitude = longitude;
    if (radiusKm) data.radiusKm = radiusKm;
    if (isActive !== undefined) data.isActive = isActive;

    const zone = await prisma.geoZone.update({ where: { id: req.params.id }, data });
    res.json(zone);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to update zone' } });
  }
});

module.exports = router;
