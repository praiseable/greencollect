const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate } = require('../middleware/auth');
const {
  ensureWallet,
  serializeWallet,
  serializeDeposit,
  releaseDeposit,
  WalletError,
} = require('../services/wallet.service');

router.use(authenticate);

// GET /wallet — current buyer wallet, active deposits, and ledger history
router.get('/', async (req, res) => {
  try {
    const wallet = await ensureWallet(req.user.id);
    const [deposits, ledger] = await Promise.all([
      prisma.listingDeposit.findMany({
        where: { buyerId: req.user.id },
        orderBy: { createdAt: 'desc' },
        include: { listing: { select: { id: true, title: true, pricePaisa: true, status: true } } },
      }),
      prisma.walletLedger.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    res.json({
      wallet: serializeWallet(wallet),
      deposits: deposits.map((d) => ({
        ...serializeDeposit(d),
        listing: d.listing ? { ...d.listing, pricePaisa: d.listing.pricePaisa.toString() } : null,
      })),
      ledger: ledger.map((l) => ({
        ...l,
        amountPaisa: l.amountPaisa.toString(),
        balanceAfterPaisa: l.balanceAfterPaisa.toString(),
        availableAfterPaisa: l.availableAfterPaisa.toString(),
        escrowedAfterPaisa: l.escrowedAfterPaisa.toString(),
      })),
    });
  } catch (err) {
    console.error('GET /wallet error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch wallet', code: 'INTERNAL_ERROR' } });
  }
});

// POST /wallet/deposits/:id/release — buyer withdraws interest before a deal is finalized
router.post('/deposits/:id/release', async (req, res) => {
  try {
    const deposit = await prisma.listingDeposit.findUnique({ where: { id: req.params.id } });
    if (!deposit) return res.status(404).json({ error: { message: 'Deposit not found', code: 'NOT_FOUND' } });
    if (deposit.buyerId !== req.user.id) return res.status(403).json({ error: { message: 'Not authorized', code: 'FORBIDDEN' } });
    const result = await releaseDeposit(deposit.id, { note: 'Buyer withdrew interest before finalization' });
    res.json({ deposit: serializeDeposit(result.deposit), released: result.released });
  } catch (err) {
    if (err instanceof WalletError) {
      return res.status(err.status).json({ error: { message: err.message, code: err.code, ...err.details } });
    }
    console.error('POST /wallet/deposits/:id/release error:', err);
    res.status(500).json({ error: { message: 'Failed to release deposit', code: 'INTERNAL_ERROR' } });
  }
});

module.exports = router;
