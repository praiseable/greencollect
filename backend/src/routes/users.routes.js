const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// GET /users — List users (admin)
router.get('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, phone: true, firstName: true, lastName: true,
          displayName: true, role: true, isActive: true, isVerified: true,
          city: true, countryId: true, createdAt: true, lastLoginAt: true,
          geoZone: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ data: users, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch users' } });
  }
});

// GET /users/:id — Get user details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        geoZone: true,
        subscription: { include: { plan: true } },
        wallet: true,
        _count: { select: { listings: true, transactions: true, notifications: true } },
      },
    });
    if (!user) return res.status(404).json({ error: { message: 'User not found' } });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch user' } });
  }
});

// PUT /users/:id — Update user
router.put('/:id', authenticate, async (req, res) => {
  try {
    // Only allow self-update or admin
    if (req.user.id !== req.params.id && !['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Cannot update other users' } });
    }

    const { firstName, lastName, displayName, city, languageId, phone, avatar, cnicNumber, geoZoneId } = req.body;
    const data = {};
    if (firstName) data.firstName = firstName;
    if (lastName) data.lastName = lastName;
    if (displayName) data.displayName = displayName;
    if (city) data.city = city;
    if (languageId) data.languageId = languageId;
    if (phone) data.phone = phone;
    if (avatar) data.avatar = avatar;
    if (cnicNumber) data.cnicNumber = cnicNumber;
    if (geoZoneId) data.geoZoneId = geoZoneId;

    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to update user' } });
  }
});

// PUT /users/:id/role — Change user role (admin only)
router.put('/:id/role', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { role } = req.body;
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to change role' } });
  }
});

// PUT /users/:id/toggle — Activate/deactivate user
router.put('/:id/toggle', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: { message: 'User not found' } });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to toggle user' } });
  }
});

module.exports = router;
