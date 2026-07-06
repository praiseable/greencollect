const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { serializeWallet } = require('../services/wallet.service');

const BUSINESS_TYPE_MAP = {
  individual: 'INDIVIDUAL',
  aop: 'AOP',
  private_limited: 'PRIVATE_LIMITED',
  INDIVIDUAL: 'INDIVIDUAL',
  AOP: 'AOP',
  PRIVATE_LIMITED: 'PRIVATE_LIMITED',
};

function stripSensitiveProfile(user, viewer) {
  if (!user) return user;
  const canSee = viewer && (viewer.id === user.id || ['SUPER_ADMIN', 'ADMIN'].includes(viewer.role));
  if (canSee) return user;
  const copy = { ...user };
  delete copy.cnicNumber;
  delete copy.ntnNumber;
  delete copy.strnNumber;
  delete copy.bankName;
  delete copy.bankAccountTitle;
  delete copy.bankAccountNumber;
  delete copy.cnicFrontImage;
  delete copy.cnicBackImage;
  return copy;
}

// GET /users/me — Own profile (spec 2.5; must be before /:id)
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        geoZone: true,
        subscription: { include: { plan: true } },
        wallet: true,
      },
    });
    if (!user) return res.status(404).json({ error: { message: 'User not found' } });
    const out = { ...user };
    if (user.wallet) {
      out.wallet = serializeWallet(user.wallet);
      out.walletBalance = Number(user.wallet.availableBalancePaisa ?? user.wallet.balancePaisa);
    }
    res.json(out);
  } catch (err) {
    console.error('GET /users/me error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch profile' } });
  }
});

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
    res.json(stripSensitiveProfile(user, req.user));
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

    const { firstName, lastName, displayName, city, languageId, phone, avatar, cnicNumber, geoZoneId, ntnNumber, strnNumber, businessType } = req.body;
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
    if (ntnNumber !== undefined) {
      if (ntnNumber && !/^[A-Za-z0-9-]{3,20}$/.test(String(ntnNumber))) {
        return res.status(400).json({ error: { message: 'Invalid NTN format', code: 'VALIDATION_ERROR' } });
      }
      data.ntnNumber = ntnNumber || null;
    }
    if (strnNumber !== undefined) {
      if (strnNumber && !/^[A-Za-z0-9-]{3,20}$/.test(String(strnNumber))) {
        return res.status(400).json({ error: { message: 'Invalid STRN format', code: 'VALIDATION_ERROR' } });
      }
      data.strnNumber = strnNumber || null;
    }
    if (businessType !== undefined) {
      const mapped = BUSINESS_TYPE_MAP[businessType];
      if (businessType && !mapped) return res.status(400).json({ error: { message: 'Invalid business type', code: 'VALIDATION_ERROR' } });
      data.businessType = mapped || null;
    }

    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json(stripSensitiveProfile(user, req.user));
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to update user' } });
  }
});

// PUT /users/:id/role — Change user role (admin only)
router.put('/:id/role', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { role } = req.body;
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
    res.json(stripSensitiveProfile(user, req.user));
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
