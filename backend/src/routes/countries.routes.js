const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize } = require('../middleware/auth');

// GET /countries
router.get('/', async (req, res) => {
  try {
    const countries = await prisma.country.findMany({
      where: { isActive: true },
      include: { defaultCurrency: true, defaultLanguage: true },
      orderBy: { isDefault: 'desc' },
    });
    res.json(countries);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch countries' } });
  }
});

// GET /countries/:id
router.get('/:id', async (req, res) => {
  try {
    const country = await prisma.country.findUnique({
      where: { id: req.params.id },
      include: {
        defaultCurrency: true,
        defaultLanguage: true,
        supportedCurrencies: { include: { currency: true } },
        supportedLanguages: { include: { language: true } },
        paymentGateways: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!country) return res.status(404).json({ error: { message: 'Country not found' } });
    res.json(country);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch country' } });
  }
});

// POST /countries (admin)
router.post('/', authenticate, authorize('SUPER_ADMIN'), async (req, res) => {
  try {
    const { id, name, nativeName, phoneCode, phoneFormat, defaultCurrencyId, defaultLanguageId, timezone } = req.body;
    const country = await prisma.country.create({
      data: { id, name, nativeName, phoneCode, phoneFormat, defaultCurrencyId, defaultLanguageId, timezone },
    });
    res.status(201).json(country);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to create country' } });
  }
});

module.exports = router;
