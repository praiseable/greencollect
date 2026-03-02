const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize } = require('../middleware/auth');

// GET /currencies — List active currencies
router.get('/', async (req, res) => {
  try {
    const currencies = await prisma.currency.findMany({
      where: { isActive: true },
      orderBy: { isDefault: 'desc' },
    });
    res.json(currencies);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch currencies' } });
  }
});

// GET /currencies/:id — Currency detail + rates
router.get('/:id', async (req, res) => {
  try {
    const currency = await prisma.currency.findUnique({
      where: { id: req.params.id },
      include: {
        exchangeRatesBase: { include: { targetCurrency: true } },
      },
    });
    if (!currency) return res.status(404).json({ error: { message: 'Currency not found' } });
    res.json(currency);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch currency' } });
  }
});

// POST /currencies — Create currency (admin)
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { id, name, nativeName, symbol, symbolNative, symbolPosition, decimalDigits } = req.body;
    const currency = await prisma.currency.create({
      data: { id, name, nativeName, symbol, symbolNative, symbolPosition, decimalDigits },
    });
    res.status(201).json(currency);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to create currency' } });
  }
});

// PUT /currencies/:id/toggle — Enable/disable
router.put('/:id/toggle', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const c = await prisma.currency.findUnique({ where: { id: req.params.id } });
    const updated = await prisma.currency.update({ where: { id: req.params.id }, data: { isActive: !c.isActive } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to toggle currency' } });
  }
});

// POST /currencies/rates — Set exchange rate
router.post('/rates', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { baseCurrencyId, targetCurrencyId, rate } = req.body;
    const exchangeRate = await prisma.exchangeRate.upsert({
      where: { baseCurrencyId_targetCurrencyId: { baseCurrencyId, targetCurrencyId } },
      update: { rate, effectiveAt: new Date() },
      create: { baseCurrencyId, targetCurrencyId, rate, source: 'MANUAL' },
    });
    res.json(exchangeRate);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to set rate' } });
  }
});

module.exports = router;
