const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize } = require('../middleware/auth');

// ─────────────────────────────────────────────────────────
// GET /territories — List all dealer territory assignments
// Query: ?userId=&geoZoneId=&role=&isActive=true
// ─────────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { userId, geoZoneId, role, isActive = 'true', page = 1, limit = 50 } = req.query;

    const where = {};
    if (isActive !== 'all') where.isActive = isActive === 'true';
    if (userId) where.userId = userId;
    if (geoZoneId) where.geoZoneId = geoZoneId;
    if (role) where.user = { role };

    // Non-admin users can only see their own territories
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(req.user.role);
    if (!isAdmin) {
      where.userId = req.user.id;
    }

    const [territories, total] = await Promise.all([
      prisma.dealerTerritory.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          user: {
            select: {
              id: true, firstName: true, lastName: true, displayName: true,
              role: true, phone: true, email: true, city: true, avatar: true,
            },
          },
          geoZone: {
            include: {
              parent: { select: { id: true, name: true, type: true } },
              children: { select: { id: true, name: true, type: true, slug: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dealerTerritory.count({ where }),
    ]);

    res.json({ data: territories, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('GET /territories error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch territories' } });
  }
});

// ─────────────────────────────────────────────────────────
// GET /territories/my — Current user's territories
// ─────────────────────────────────────────────────────────
router.get('/my', authenticate, async (req, res) => {
  try {
    const territories = await prisma.dealerTerritory.findMany({
      where: { userId: req.user.id, isActive: true },
      include: {
        geoZone: {
          include: {
            parent: { select: { id: true, name: true, type: true } },
            children: { select: { id: true, name: true, type: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: territories });
  } catch (err) {
    console.error('GET /territories/my error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch your territories' } });
  }
});

// ─────────────────────────────────────────────────────────
// GET /territories/zone/:zoneId — Who manages a specific zone?
// Returns the dealer hierarchy: local dealer → city franchise → province manager
// ─────────────────────────────────────────────────────────
router.get('/zone/:zoneId', authenticate, async (req, res) => {
  try {
    const { zoneId } = req.params;

    // Get the zone and its parent chain
    const zone = await prisma.geoZone.findUnique({
      where: { id: zoneId },
      include: {
        parent: {
          include: {
            parent: {
              include: {
                parent: true,
              },
            },
          },
        },
      },
    });

    if (!zone) return res.status(404).json({ error: { message: 'Zone not found' } });

    // Collect all zone IDs in the hierarchy (local → city → province → country)
    const zoneChain = [];
    let current = zone;
    while (current) {
      zoneChain.push({ id: current.id, name: current.name, type: current.type });
      current = current.parent;
    }

    // Find dealers assigned to each level
    const dealersByLevel = {};
    for (const z of zoneChain) {
      const dealers = await prisma.dealerTerritory.findMany({
        where: { geoZoneId: z.id, isActive: true },
        include: {
          user: {
            select: {
              id: true, firstName: true, lastName: true, displayName: true,
              role: true, phone: true, city: true,
            },
          },
        },
      });
      dealersByLevel[z.type] = { zone: z, dealers };
    }

    // Also find adjacent zones at the same level (siblings)
    const adjacentZones = [];
    if (zone.parentId) {
      const siblings = await prisma.geoZone.findMany({
        where: {
          parentId: zone.parentId,
          id: { not: zone.id },
          isActive: true,
        },
        select: { id: true, name: true, slug: true, type: true },
      });
      adjacentZones.push(...siblings);
    }

    res.json({
      zone,
      hierarchy: zoneChain,
      dealersByLevel,
      adjacentZones,
    });
  } catch (err) {
    console.error('GET /territories/zone/:zoneId error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch zone dealers' } });
  }
});

// ─────────────────────────────────────────────────────────
// POST /territories — Assign dealer to territory (Admin only)
// Body: { userId, geoZoneId, isExclusive?, notes? }
// ─────────────────────────────────────────────────────────
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { userId, geoZoneId, isExclusive = true, notes } = req.body;

    if (!userId || !geoZoneId) {
      return res.status(400).json({ error: { message: 'userId and geoZoneId are required' } });
    }

    // Validate user exists and has a dealer-like role
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: { message: 'User not found' } });

    const dealerRoles = ['DEALER', 'FRANCHISE_OWNER', 'REGIONAL_MANAGER', 'WHOLESALE_BUYER'];
    if (!dealerRoles.includes(user.role)) {
      return res.status(400).json({
        error: { message: `User must have a dealer role (${dealerRoles.join(', ')}). Current role: ${user.role}` },
      });
    }

    // Validate zone exists
    const zone = await prisma.geoZone.findUnique({ where: { id: geoZoneId } });
    if (!zone) return res.status(404).json({ error: { message: 'GeoZone not found' } });

    // Check role-zone alignment
    const roleZoneMap = {
      DEALER: ['LOCAL_AREA'],
      FRANCHISE_OWNER: ['CITY', 'LOCAL_AREA'],
      REGIONAL_MANAGER: ['PROVINCE', 'CITY'],
      WHOLESALE_BUYER: ['CITY', 'PROVINCE', 'COUNTRY'],
    };
    const allowedZoneTypes = roleZoneMap[user.role] || [];
    if (!allowedZoneTypes.includes(zone.type)) {
      return res.status(400).json({
        error: {
          message: `${user.role} can only be assigned to ${allowedZoneTypes.join('/')} zones. This zone is ${zone.type}.`,
        },
      });
    }

    // Check exclusivity: is another active dealer already assigned to this zone?
    if (isExclusive) {
      const existing = await prisma.dealerTerritory.findFirst({
        where: {
          geoZoneId,
          isActive: true,
          isExclusive: true,
          userId: { not: userId },
          user: { role: user.role }, // Same role exclusivity
        },
        include: {
          user: { select: { firstName: true, lastName: true, role: true } },
        },
      });

      if (existing) {
        return res.status(409).json({
          error: {
            message: `This zone is already exclusively assigned to ${existing.user.firstName} ${existing.user.lastName} (${existing.user.role}). Deactivate their assignment first or set isExclusive=false.`,
            existingAssignment: existing,
          },
        });
      }
    }

    // Create or reactivate territory assignment
    const territory = await prisma.dealerTerritory.upsert({
      where: { userId_geoZoneId: { userId, geoZoneId } },
      update: { isActive: true, isExclusive, notes, assignedBy: req.user.id },
      create: { userId, geoZoneId, isExclusive, notes, assignedBy: req.user.id },
    });

    // Also update user's primary geoZoneId if they don't have one
    if (!user.geoZoneId) {
      await prisma.user.update({
        where: { id: userId },
        data: { geoZoneId },
      });
    }

    // Notify the dealer
    await prisma.notification.create({
      data: {
        userId,
        type: 'SYSTEM',
        title: 'Territory Assigned',
        body: `You have been assigned to manage "${zone.name}" (${zone.type}).`,
        data: { territoryId: territory.id, geoZoneId: zone.id, zoneName: zone.name },
      },
    });

    const result = await prisma.dealerTerritory.findUnique({
      where: { id: territory.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
        geoZone: true,
      },
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('POST /territories error:', err);
    res.status(500).json({ error: { message: 'Failed to assign territory', details: err.message } });
  }
});

// ─────────────────────────────────────────────────────────
// POST /territories/bulk — Assign dealer to multiple zones at once
// Body: { userId, geoZoneIds: [...], isExclusive?, notes? }
// ─────────────────────────────────────────────────────────
router.post('/bulk', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { userId, geoZoneIds, isExclusive = true, notes } = req.body;

    if (!userId || !geoZoneIds?.length) {
      return res.status(400).json({ error: { message: 'userId and geoZoneIds[] are required' } });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: { message: 'User not found' } });

    const results = [];
    const errors = [];

    for (const geoZoneId of geoZoneIds) {
      try {
        const zone = await prisma.geoZone.findUnique({ where: { id: geoZoneId } });
        if (!zone) {
          errors.push({ geoZoneId, error: 'Zone not found' });
          continue;
        }

        // Check exclusivity
        if (isExclusive) {
          const existing = await prisma.dealerTerritory.findFirst({
            where: {
              geoZoneId,
              isActive: true,
              isExclusive: true,
              userId: { not: userId },
              user: { role: user.role },
            },
          });
          if (existing) {
            errors.push({ geoZoneId, zoneName: zone.name, error: 'Already assigned exclusively' });
            continue;
          }
        }

        const territory = await prisma.dealerTerritory.upsert({
          where: { userId_geoZoneId: { userId, geoZoneId } },
          update: { isActive: true, isExclusive, notes, assignedBy: req.user.id },
          create: { userId, geoZoneId, isExclusive, notes, assignedBy: req.user.id },
        });
        results.push(territory);
      } catch (e) {
        errors.push({ geoZoneId, error: e.message });
      }
    }

    // Notify dealer once
    if (results.length > 0) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'SYSTEM',
          title: 'Territories Assigned',
          body: `You have been assigned ${results.length} new territory zone(s).`,
          data: { count: results.length },
        },
      });
    }

    res.status(201).json({ assigned: results, errors, totalAssigned: results.length, totalErrors: errors.length });
  } catch (err) {
    console.error('POST /territories/bulk error:', err);
    res.status(500).json({ error: { message: 'Failed to bulk assign territories' } });
  }
});

// ─────────────────────────────────────────────────────────
// PUT /territories/:id — Update territory assignment
// ─────────────────────────────────────────────────────────
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { isActive, isExclusive, notes } = req.body;
    const data = {};
    if (isActive !== undefined) data.isActive = isActive;
    if (isExclusive !== undefined) data.isExclusive = isExclusive;
    if (notes !== undefined) data.notes = notes;

    const territory = await prisma.dealerTerritory.update({
      where: { id: req.params.id },
      data,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
        geoZone: true,
      },
    });

    // Notify if deactivated
    if (isActive === false) {
      await prisma.notification.create({
        data: {
          userId: territory.userId,
          type: 'SYSTEM',
          title: 'Territory Removed',
          body: `Your assignment to "${territory.geoZone.name}" has been deactivated.`,
          data: { territoryId: territory.id, geoZoneId: territory.geoZoneId },
        },
      });
    }

    res.json(territory);
  } catch (err) {
    console.error('PUT /territories/:id error:', err);
    res.status(500).json({ error: { message: 'Failed to update territory' } });
  }
});

// ─────────────────────────────────────────────────────────
// DELETE /territories/:id — Remove territory assignment
// ─────────────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const territory = await prisma.dealerTerritory.findUnique({
      where: { id: req.params.id },
      include: { geoZone: true },
    });
    if (!territory) return res.status(404).json({ error: { message: 'Territory not found' } });

    // Soft-delete (deactivate) instead of hard delete
    await prisma.dealerTerritory.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    await prisma.notification.create({
      data: {
        userId: territory.userId,
        type: 'SYSTEM',
        title: 'Territory Removed',
        body: `Your assignment to "${territory.geoZone.name}" has been removed.`,
        data: { geoZoneId: territory.geoZoneId },
      },
    });

    res.json({ message: 'Territory deactivated' });
  } catch (err) {
    console.error('DELETE /territories/:id error:', err);
    res.status(500).json({ error: { message: 'Failed to remove territory' } });
  }
});

// ─────────────────────────────────────────────────────────
// GET /territories/escalation-rules — List escalation rules
// ─────────────────────────────────────────────────────────
router.get('/escalation-rules', authenticate, async (req, res) => {
  try {
    const rules = await prisma.escalationRule.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ data: rules });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch escalation rules' } });
  }
});

// ─────────────────────────────────────────────────────────
// PUT /territories/escalation-rules/:id — Update escalation rule
// ─────────────────────────────────────────────────────────
router.put('/escalation-rules/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { delayHours, notifyRoles, isActive } = req.body;
    const data = {};
    if (delayHours !== undefined) data.delayHours = parseInt(delayHours);
    if (notifyRoles !== undefined) data.notifyRoles = notifyRoles;
    if (isActive !== undefined) data.isActive = isActive;

    const rule = await prisma.escalationRule.update({
      where: { id: req.params.id },
      data,
    });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to update escalation rule' } });
  }
});

module.exports = router;
