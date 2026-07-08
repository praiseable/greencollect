const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { formatCurrency, toBigIntRupees } = require('../services/currency.service');

// GET /currencies â€” List active currencies
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


// GET /currencies/:id/format?amountRupees=150000&lang=ur â€” Exact integer-paisa formatter
router.get('/:id/format', async (req, res) => {
  try {
    const { amountRupees, lang = 'en' } = req.query;
    if (amountRupees === undefined || !/^-?\d+$/.test(String(amountRupees))) {
      return res.status(400).json({ error: { message: 'amountRupees must be an integer rupee value', code: 'INVALID_AMOUNT' } });
    }

    const currency = await prisma.currency.findUnique({ where: { id: req.params.id } });
    if (!currency || !currency.isActive) {
      return res.status(404).json({ error: { message: 'Currency not found', code: 'NOT_FOUND' } });
    }

    const raw = toBigIntRupees(String(amountRupees));
    res.json({
      currencyId: currency.id,
      amountRupees: raw.toString(),
      amountFormatted: formatCurrency(raw, currency, lang),
      lang,
      integerRupees: true,
    });
  } catch (err) {
    console.error('Format currency error:', err);
    res.status(500).json({ error: { message: 'Failed to format currency' } });
  }
});

// GET /currencies/:id â€” Currency detail + rates
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

// POST /currencies â€” Create currency (admin)
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

// PUT /currencies/:id/toggle â€” Enable/disable
router.put('/:id/toggle', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const c = await prisma.currency.findUnique({ where: { id: req.params.id } });
    const updated = await prisma.currency.update({ where: { id: req.params.id }, data: { isActive: !c.isActive } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to toggle currency' } });
  }
});

// POST /currencies/rates â€” Set exchange rate
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
