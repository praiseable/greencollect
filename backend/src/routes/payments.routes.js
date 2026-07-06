const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate } = require('../middleware/auth');
const { creditWallet, serializeWallet, WalletError } = require('../services/wallet.service');

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

// POST /payments/wallet/topup — Development/manual top-up through the ledger engine.
// Production payment webhooks must call the same creditWallet service after signature verification.
router.post('/wallet/topup', authenticate, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_TEST_TOPUP !== 'true') {
      return res.status(403).json({ error: { message: 'Direct top-up is disabled in production; use verified gateway webhooks', code: 'TOPUP_WEBHOOK_REQUIRED' } });
    }

    const { amountPaisa, gateway = 'WALLET', gatewayRef = null } = req.body;
    const wallet = await creditWallet(req.user.id, amountPaisa, {
      referenceType: 'TOPUP',
      referenceId: gatewayRef,
      note: `Wallet top-up via ${gateway}`,
      metadata: { gateway, gatewayRef },
    });
    res.json({ wallet: serializeWallet(wallet) });
  } catch (err) {
    if (err instanceof WalletError) {
      return res.status(err.status).json({ error: { message: err.message, code: err.code, ...err.details } });
    }
    console.error('Wallet top-up error:', err);
    res.status(500).json({ error: { message: 'Failed to top up wallet', code: 'INTERNAL_ERROR' } });
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
