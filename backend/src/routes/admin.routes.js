const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { portalCheck } = require('../middleware/portalCheck');
const { Portal } = require('../../../packages/shared/src/constants');
const { runDisintermediationScan } = require('../services/disintermediation.service');

// Admin-only routes - require admin portal token
router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN'), portalCheck(Portal.ADMIN));

// GET /admin/dashboard — Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers, activeListings, totalTransactions,
      totalCategories, usersByRole, recentListings,
      listingsByStatus, recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.listing.count({ where: { status: 'ACTIVE' } }),
      prisma.transaction.count(),
      prisma.category.count({ where: { isActive: true } }),
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.listing.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { select: { firstName: true, lastName: true } },
          category: { include: { translations: { where: { languageId: 'en' } } } },
        },
      }),
      prisma.listing.groupBy({ by: ['status'], _count: true }),
      prisma.user.findMany({ take: 10, orderBy: { createdAt: 'desc' }, select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true } }),
    ]);

    res.json({
      stats: { totalUsers, activeListings, totalTransactions, totalCategories },
      usersByRole,
      listingsByStatus,
      recentListings: recentListings.map(l => ({ ...l, pricePaisa: l.pricePaisa?.toString() })),
      recentUsers,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch dashboard' } });
  }
});

// GET /admin/audit-logs — Audit log viewer
router.get('/audit-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, entity, userId } = req.query;
    const where = {};
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ data: logs, total });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch audit logs' } });
  }
});

// GET /admin/platform-config
router.get('/platform-config', async (req, res) => {
  try {
    const configs = await prisma.platformConfig.findMany();
    const map = {};
    configs.forEach(c => { map[c.key] = c.value; });
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch config' } });
  }
});

// PUT /admin/platform-config
router.put('/platform-config', async (req, res) => {
  try {
    const updates = req.body; // { key: value, key: value }
    for (const [key, value] of Object.entries(updates)) {
      await prisma.platformConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { id: key, key, value: String(value) },
      });
    }
    res.json({ message: 'Config updated' });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to update config' } });
  }
});

// GET /admin/all-listings — All listings (admin view)
router.get('/all-listings', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const where = {};
    if (status) where.status = status;

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { select: { id: true, firstName: true, lastName: true, email: true } },
          category: { include: { translations: { where: { languageId: 'en' } } } },
          geoZone: { select: { name: true } },
          images: { take: 1 },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      data: listings.map(l => ({ ...l, pricePaisa: l.pricePaisa?.toString() })),
      total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch listings' } });
  }
});

// PUT /admin/listings/:id/status — Change listing status
router.put('/listings/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const listing = await prisma.listing.update({ where: { id: req.params.id }, data: { status } });
    res.json({ ...listing, pricePaisa: listing.pricePaisa?.toString() });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to update listing status' } });
  }
});


// GET /admin/flagged-users — Anti-disintermediation review queue
router.get('/flagged-users', async (req, res) => {
  try {
    const { status = 'open', page = 1, limit = 50 } = req.query;
    const where = status ? { status } : {};
    const [flags, total] = await Promise.all([
      prisma.adminFlaggedUser.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: { user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, isActive: true, accountStatus: true } }, reviewer: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.adminFlaggedUser.count({ where }),
    ]);
    res.json({ data: flags, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('GET /admin/flagged-users error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch flagged users', code: 'INTERNAL_ERROR' } });
  }
});

// POST /admin/flagged-users/scan — manual trigger for the automated flagging engine
router.post('/flagged-users/scan', async (req, res) => {
  try {
    const flags = await runDisintermediationScan();
    res.json({ created: flags.length, flags });
  } catch (err) {
    console.error('POST /admin/flagged-users/scan error:', err);
    res.status(500).json({ error: { message: 'Failed to run scan', code: 'INTERNAL_ERROR' } });
  }
});

// PATCH /admin/flagged-users/:id — review/dismiss/action a flag without automatic penalties
router.patch('/flagged-users/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['reviewed', 'dismissed', 'actioned'].includes(status)) {
      return res.status(400).json({ error: { message: 'Invalid flag status', code: 'VALIDATION_ERROR' } });
    }
    const flag = await prisma.adminFlaggedUser.update({
      where: { id: req.params.id },
      data: { status, reviewedBy: req.user.id, reviewedAt: new Date() },
    });
    res.json(flag);
  } catch (err) {
    console.error('PATCH /admin/flagged-users/:id error:', err);
    res.status(500).json({ error: { message: 'Failed to update flag', code: 'INTERNAL_ERROR' } });
  }
});

// GET /admin/reconciliation-report — UC-ADM-07 ledger-backed financial reconciliation
router.get('/reconciliation-report', async (req, res) => {
  try {
    const { from, to, format } = req.query;
    const createdAt = {};
    if (from) createdAt.gte = new Date(from);
    if (to) createdAt.lte = new Date(to);
    const ledgerWhere = Object.keys(createdAt).length ? { createdAt } : {};

    const [ledgerRows, wallets, heldDeposits, payments] = await Promise.all([
      prisma.walletLedger.findMany({
        where: ledgerWhere,
        select: {
          id: true,
          walletId: true,
          type: true,
          amountPaisa: true,
          referenceType: true,
          referenceId: true,
          availableAfterPaisa: true,
          escrowedAfterPaisa: true,
          balanceAfterPaisa: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.wallet.findMany({
        select: {
          id: true,
          userId: true,
          availableBalancePaisa: true,
          escrowedBalancePaisa: true,
          balancePaisa: true,
          currencyId: true,
        },
      }),
      prisma.listingDeposit.findMany({
        where: { status: 'HELD' },
        select: { id: true, amountPaisa: true, buyerId: true, listingId: true },
      }),
      prisma.payment.findMany({
        where: Object.keys(createdAt).length ? { createdAt } : {},
        select: { id: true, amountPaisa: true, gateway: true, gatewayRef: true, status: true, purpose: true, createdAt: true },
      }).catch(() => []),
    ]);

    const big = (value) => BigInt(value || 0);
    const str = (value) => big(value).toString();
    const sum = (rows, predicate = () => true, field = 'amountPaisa') => rows.reduce((acc, row) => predicate(row) ? acc + big(row[field]) : acc, 0n);

    const totals = {
      topUpsPaisa: sum(ledgerRows, r => r.type === 'CREDIT' && r.referenceType === 'TOPUP').toString(),
      commissionCapturedPaisa: sum(ledgerRows, r => r.type === 'ESCROW_CAPTURE' && r.referenceType === 'COMMISSION_CAPTURE').toString(),
      refundsPaisa: sum(ledgerRows, r => r.type === 'ESCROW_RELEASE' && r.referenceType === 'DEPOSIT_REFUND').toString(),
      reversalsPaisa: sum(ledgerRows, r => r.referenceType === 'REVERSAL').toString(),
      withdrawalsPaisa: sum(ledgerRows, r => r.type === 'DEBIT' && r.referenceType === 'WITHDRAWAL').toString(),
      forfeituresPaisa: sum(ledgerRows, r => r.referenceType === 'FORFEITURE').toString(),
      manualAdjustmentsPaisa: sum(ledgerRows, r => r.referenceType === 'MANUAL_ADJUSTMENT').toString(),
      heldDepositsPaisa: sum(heldDeposits).toString(),
      walletAvailablePaisa: wallets.reduce((acc, w) => acc + big(w.availableBalancePaisa), 0n).toString(),
      walletEscrowedPaisa: wallets.reduce((acc, w) => acc + big(w.escrowedBalancePaisa), 0n).toString(),
      walletTotalPaisa: wallets.reduce((acc, w) => acc + big(w.availableBalancePaisa) + big(w.escrowedBalancePaisa), 0n).toString(),
      completedPaymentTopUpsPaisa: sum(payments, p => p.status === 'COMPLETED' && p.purpose === 'WALLET_TOPUP').toString(),
      ledgerRowCount: String(ledgerRows.length),
      walletCount: String(wallets.length),
      heldDepositCount: String(heldDeposits.length),
      completedPaymentCount: String(payments.filter(p => p.status === 'COMPLETED').length),
    };

    const latestLedgerByWallet = new Map();
    for (const row of ledgerRows) {
      if (!latestLedgerByWallet.has(row.walletId)) latestLedgerByWallet.set(row.walletId, row);
    }

    const latestLedgerWalletMismatches = [];
    for (const wallet of wallets) {
      const latest = latestLedgerByWallet.get(wallet.id);
      if (!latest) continue;
      const availableMatches = big(wallet.availableBalancePaisa) === big(latest.availableAfterPaisa);
      const escrowMatches = big(wallet.escrowedBalancePaisa) === big(latest.escrowedAfterPaisa);
      if (!availableMatches || !escrowMatches) {
        latestLedgerWalletMismatches.push({
          walletId: wallet.id,
          userId: wallet.userId,
          walletAvailablePaisa: str(wallet.availableBalancePaisa),
          latestAvailableAfterPaisa: str(latest.availableAfterPaisa),
          walletEscrowedPaisa: str(wallet.escrowedBalancePaisa),
          latestEscrowedAfterPaisa: str(latest.escrowedAfterPaisa),
        });
      }
    }

    const heldDepositEscrowDelta = big(totals.walletEscrowedPaisa) - big(totals.heldDepositsPaisa);
    const discrepancies = [];
    if (latestLedgerWalletMismatches.length > 0) {
      discrepancies.push({
        code: 'LATEST_LEDGER_WALLET_MISMATCH',
        count: latestLedgerWalletMismatches.length,
        sample: latestLedgerWalletMismatches.slice(0, 10),
      });
    }
    if (heldDepositEscrowDelta !== 0n) {
      discrepancies.push({
        code: 'HELD_DEPOSIT_ESCROW_DELTA',
        deltaPaisa: heldDepositEscrowDelta.toString(),
        walletEscrowedPaisa: totals.walletEscrowedPaisa,
        heldDepositsPaisa: totals.heldDepositsPaisa,
      });
    }

    const report = {
      success: true,
      generatedAt: new Date().toISOString(),
      period: { from: from || null, to: to || null },
      currencyId: 'PKR',
      totals,
      reconciliation: {
        balanced: discrepancies.length === 0,
        discrepancyCount: discrepancies.length,
        discrepancies,
      },
    };

    if (String(format || '').toLowerCase() === 'csv') {
      const lines = ['metric,amountPaisa'];
      for (const [key, value] of Object.entries(totals)) {
        lines.push(`${key},${String(value).replace(/,/g, '')}`);
      }
      lines.push(`balanced,${report.reconciliation.balanced}`);
      lines.push(`discrepancyCount,${report.reconciliation.discrepancyCount}`);
      res.type('text/csv').send(lines.join('\n'));
      return;
    }

    res.json(report);
  } catch (err) {
    console.error('GET /admin/reconciliation-report error:', err);
    res.status(500).json({ error: { message: 'Failed to build reconciliation report', code: 'INTERNAL_ERROR' } });
  }
});

module.exports = router;
