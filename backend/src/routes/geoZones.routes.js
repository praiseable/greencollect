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

// GET /geo-zones/available — Zones available for current user to post listings
router.get('/available', authenticate, async (req, res) => {
  try {
    const { countryId = 'PK' } = req.query;
    const user = req.user;
    
    // Admins can post in any zone
    if (['SUPER_ADMIN', 'ADMIN', 'COLLECTION_MANAGER'].includes(user.role)) {
      const allZones = await prisma.geoZone.findMany({
        where: { countryId, isActive: true, type: { in: ['CITY', 'LOCAL_AREA'] } },
        orderBy: { name: 'asc' },
        include: { parent: { select: { id: true, name: true, type: true } } },
      });
      return res.json(allZones);
    }
    
    // Dealers: return their territories + children zones
    if (['DEALER', 'FRANCHISE_OWNER', 'REGIONAL_MANAGER', 'WHOLESALE_BUYER'].includes(user.role)) {
      const territories = await prisma.dealerTerritory.findMany({
        where: { userId: user.id, isActive: true },
        include: {
          geoZone: {
            include: {
              children: { where: { isActive: true } },
            },
          },
        },
      });
      
      const availableZones = [];
      for (const territory of territories) {
        const zone = territory.geoZone;
        // Add the territory zone itself
        availableZones.push({
          id: zone.id,
          name: zone.name,
          type: zone.type,
          slug: zone.slug,
          parent: zone.parent ? { id: zone.parent.id, name: zone.parent.name, type: zone.parent.type } : null,
        });
        // Add children zones
        if (zone.children && zone.children.length > 0) {
          for (const child of zone.children) {
            availableZones.push({
              id: child.id,
              name: child.name,
              type: child.type,
              slug: child.slug,
              parent: { id: zone.id, name: zone.name, type: zone.type },
            });
          }
        }
      }
      
      // If dealer has geoZoneId but no territories, use geoZoneId as fallback
      if (availableZones.length === 0 && user.geoZoneId) {
        const userZone = await prisma.geoZone.findUnique({
          where: { id: user.geoZoneId },
          include: { children: { where: { isActive: true } }, parent: true },
        });
        if (userZone) {
          availableZones.push({
            id: userZone.id,
            name: userZone.name,
            type: userZone.type,
            slug: userZone.slug,
            parent: userZone.parent ? { id: userZone.parent.id, name: userZone.parent.name, type: userZone.parent.type } : null,
          });
          if (userZone.children) {
            for (const child of userZone.children) {
              availableZones.push({
                id: child.id,
                name: child.name,
                type: child.type,
                slug: child.slug,
                parent: { id: userZone.id, name: userZone.name, type: userZone.type },
              });
            }
          }
        }
      }
      
      // Remove duplicates
      const uniqueZones = availableZones.filter((zone, index, self) =>
        index === self.findIndex((z) => z.id === zone.id)
      );
      
      return res.json(uniqueZones.sort((a, b) => a.name.localeCompare(b.name)));
    }
    
    // Customers: return all cities (they can post in any city)
    const cities = await prisma.geoZone.findMany({
      where: { countryId, type: 'CITY', isActive: true },
      orderBy: { name: 'asc' },
      include: { parent: { select: { id: true, name: true, type: true } } },
    });
    
    res.json(cities);
  } catch (err) {
    console.error('GET /geo-zones/available error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch available zones' } });
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
