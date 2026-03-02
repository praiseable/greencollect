const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate } = require('../middleware/auth');

// GET /payments/history — Payment history
router.get('/history', authenticate, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(payments.map(p => ({ ...p, amountPaisa: p.amountPaisa.toString() })));
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch payments' } });
  }
});

// POST /payments/jazzcash/initiate — JazzCash payment stub
router.post('/jazzcash/initiate', authenticate, async (req, res) => {
  try {
    const { amountPaisa, purpose, phone } = req.body;
    // JazzCash integration stub
    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        gateway: 'JAZZCASH',
        amountPaisa: BigInt(amountPaisa),
        currencyId: 'PKR',
        status: 'PENDING',
        purpose: purpose || 'TRANSACTION',
        metadata: { phone },
      },
    });
    res.json({ payment: { ...payment, amountPaisa: payment.amountPaisa.toString() }, redirectUrl: null, message: 'JazzCash integration pending configuration' });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to initiate JazzCash payment' } });
  }
});

// POST /payments/easypaisa/initiate — Easypaisa payment stub
router.post('/easypaisa/initiate', authenticate, async (req, res) => {
  try {
    const { amountPaisa, purpose, msisdn } = req.body;
    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        gateway: 'EASYPAISA',
        amountPaisa: BigInt(amountPaisa),
        currencyId: 'PKR',
        status: 'PENDING',
        purpose: purpose || 'TRANSACTION',
        metadata: { msisdn },
      },
    });
    res.json({ payment: { ...payment, amountPaisa: payment.amountPaisa.toString() }, message: 'Easypaisa integration pending configuration' });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to initiate Easypaisa payment' } });
  }
});

// POST /payments/wallet/topup — Top-up wallet
router.post('/wallet/topup', authenticate, async (req, res) => {
  try {
    const { amountPaisa, gateway = 'WALLET' } = req.body;
    const wallet = await prisma.wallet.upsert({
      where: { userId: req.user.id },
      update: { balancePaisa: { increment: BigInt(amountPaisa) } },
      create: { userId: req.user.id, balancePaisa: BigInt(amountPaisa), currencyId: 'PKR' },
    });
    res.json({ ...wallet, balancePaisa: wallet.balancePaisa.toString() });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to top up wallet' } });
  }
});

// GET /payments/gateways — Available payment gateways for country
router.get('/gateways', async (req, res) => {
  try {
    const { countryId = 'PK' } = req.query;
    const gateways = await prisma.countryPaymentGateway.findMany({
      where: { countryId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(gateways);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch gateways' } });
  }
});

module.exports = router;
