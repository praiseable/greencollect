/**
 * Customer Routes
 * 
 * Customer-specific routes (protected - require customer portal)
 */

const router = require('express').Router();
const prisma = require('../services/prisma');
const { trustHeaders } = require('../middleware/trustHeaders');

// All customer routes require authentication (trustHeaders already applied in index.js)

// GET /customer/profile
router.get('/profile', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        geoZone: true,
        subscription: { include: { plan: true } },
        wallet: true,
      },
    });
    if (!user) {
      return res.status(404).json({ error: { message: 'User not found', code: 'USER_NOT_FOUND' } });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch profile' } });
  }
});

// Placeholder for more customer routes
// TODO: Extract customer-specific routes from listings, transactions, etc.

module.exports = router;
