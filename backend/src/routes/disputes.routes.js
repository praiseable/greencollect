const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate } = require('../middleware/auth');
const { ensureWallet, writeLedger } = require('../services/wallet.service');

router.use(authenticate);

function isAdmin(user) {
  return ['SUPER_ADMIN', 'ADMIN', 'COLLECTION_MANAGER'].includes(String(user?.role || '').toUpperCase());
}

function isParticipant(transaction, user) {
  return isAdmin(user) || transaction?.buyerId === user.id || transaction?.sellerId === user.id;
}

function normalizeResolution(value) {
  const normalized = String(value || '').trim().toUpperCase().replace(/-/g, '_');
  if (['AWARD_BUYER', 'AWARD_SELLER', 'MUTUAL_CANCELLATION'].includes(normalized)) return normalized;
  return null;
}

function serializeDispute(dispute) {
  if (!dispute) return null;
  return {
    ...dispute,
    reversalAmountPaisa: dispute.reversalAmountPaisa?.toString?.() ?? String(dispute.reversalAmountPaisa || '0'),
    transaction: dispute.transaction ? {
      ...dispute.transaction,
      amountPaisa: dispute.transaction.amountPaisa?.toString?.() ?? dispute.transaction.amountPaisa,
      offeredPricePaisa: dispute.transaction.offeredPricePaisa?.toString?.() ?? dispute.transaction.offeredPricePaisa ?? null,
      finalPricePaisa: dispute.transaction.finalPricePaisa?.toString?.() ?? dispute.transaction.finalPricePaisa ?? null,
      actualPricePaisa: dispute.transaction.actualPricePaisa?.toString?.() ?? dispute.transaction.actualPricePaisa ?? null,
    } : undefined,
  };
}

async function releaseHeldDepositInTx(tx, deposit, disputeId) {
  if (!deposit || deposit.status !== 'HELD') return { releasedPaisa: 0n, ledgerId: null };

  const wallet = await ensureWallet(deposit.buyerId, tx);
  const available = wallet.availableBalancePaisa ?? wallet.balancePaisa ?? 0n;
  const escrowed = wallet.escrowedBalancePaisa ?? 0n;
  if (escrowed < deposit.amountPaisa) {
    throw Object.assign(new Error('Wallet escrow is inconsistent'), { code: 'ESCROW_INCONSISTENT', status: 500 });
  }

  const updatedWallet = await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      availableBalancePaisa: available + deposit.amountPaisa,
      escrowedBalancePaisa: escrowed - deposit.amountPaisa,
      balancePaisa: available + deposit.amountPaisa,
    },
  });

  await tx.listingDeposit.update({
    where: { id: deposit.id },
    data: { status: 'RELEASED', releasedAt: new Date() },
  });

  const ledger = await writeLedger(tx, updatedWallet, {
    type: 'ESCROW_RELEASE',
    amountPaisa: deposit.amountPaisa,
    referenceType: 'DEPOSIT_REFUND',
    referenceId: deposit.id,
    note: 'Dispute resolution released held buyer deposit',
    metadata: { disputeId, listingId: deposit.listingId, buyerId: deposit.buyerId },
  });

  return { releasedPaisa: deposit.amountPaisa, ledgerId: ledger.id };
}

async function reverseCapturedCommissionInTx(tx, transaction, disputeId) {
  const wallet = await ensureWallet(transaction.buyerId, tx);

  const existingReversal = await tx.walletLedger.findFirst({
    where: { walletId: wallet.id, referenceType: 'REVERSAL', referenceId: disputeId },
  });
  if (existingReversal) return { reversalPaisa: 0n, ledgerId: existingReversal.id, alreadyReversed: true };

  const commissionRows = await tx.walletLedger.findMany({
    where: {
      walletId: wallet.id,
      referenceType: 'COMMISSION_CAPTURE',
      referenceId: transaction.id,
    },
  });

  // captureCommissionForTransaction writes the total commission as ESCROW_CAPTURE.
  // A separate DEBIT row may exist for shortfall; do not double-count it.
  const capturedPaisa = commissionRows
    .filter((row) => row.type === 'ESCROW_CAPTURE')
    .reduce((sum, row) => sum + row.amountPaisa, 0n);

  if (capturedPaisa <= 0n) return { reversalPaisa: 0n, ledgerId: null, alreadyReversed: false };

  const available = wallet.availableBalancePaisa ?? wallet.balancePaisa ?? 0n;
  const escrowed = wallet.escrowedBalancePaisa ?? 0n;
  const updatedWallet = await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      availableBalancePaisa: available + capturedPaisa,
      balancePaisa: available + capturedPaisa,
      escrowedBalancePaisa: escrowed,
    },
  });

  const ledger = await writeLedger(tx, updatedWallet, {
    type: 'CREDIT',
    amountPaisa: capturedPaisa,
    referenceType: 'REVERSAL',
    referenceId: disputeId,
    note: 'Dispute resolution reversed buyer-funded platform commission',
    metadata: { transactionId: transaction.id, buyerId: transaction.buyerId, sellerId: transaction.sellerId },
  });

  return { reversalPaisa: capturedPaisa, ledgerId: ledger.id, alreadyReversed: false };
}

// GET /disputes — participants see their disputes; admins see all
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 25 } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 25));
    const where = {};
    if (status) where.status = String(status).toUpperCase();
    if (!isAdmin(req.user)) where.OR = [{ buyerId: req.user.id }, { sellerId: req.user.id }, { raisedById: req.user.id }];

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          transaction: { select: { id: true, status: true, amountPaisa: true, actualPricePaisa: true, listingId: true } },
          buyer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          seller: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          raisedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.dispute.count({ where }),
    ]);

    res.json({ data: disputes.map(serializeDispute), total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('GET /disputes error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch disputes', code: 'INTERNAL_ERROR' } });
  }
});

// POST /disputes — buyer/seller/admin raises dispute for a transaction
router.post('/', async (req, res) => {
  try {
    const { transactionId, reason, description, evidence } = req.body;
    if (!transactionId || !reason) {
      return res.status(400).json({ error: { message: 'transactionId and reason are required', code: 'VALIDATION_ERROR' } });
    }

    const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction) return res.status(404).json({ error: { message: 'Transaction not found', code: 'NOT_FOUND' } });
    if (!isParticipant(transaction, req.user)) return res.status(403).json({ error: { message: 'Not authorized for this transaction', code: 'FORBIDDEN' } });
    if (['CANCELLED', 'REJECTED', 'OFFER_REJECTED'].includes(transaction.status)) {
      return res.status(409).json({ error: { message: 'Closed/cancelled transactions cannot be disputed', code: 'INVALID_STATUS' } });
    }

    const open = await prisma.dispute.findFirst({ where: { transactionId, status: { in: ['OPEN', 'UNDER_REVIEW'] } } });
    if (open) return res.status(409).json({ error: { message: 'An open dispute already exists for this transaction', code: 'DISPUTE_ALREADY_OPEN', disputeId: open.id } });

    const dispute = await prisma.$transaction(async (tx) => {
      const created = await tx.dispute.create({
        data: {
          transactionId,
          raisedById: req.user.id,
          buyerId: transaction.buyerId,
          sellerId: transaction.sellerId,
          reason: String(reason).slice(0, 120),
          description: description ? String(description).slice(0, 2000) : null,
          evidence: evidence || null,
          transactionStatusAtOpen: transaction.status,
        },
      });

      await tx.transaction.update({ where: { id: transactionId }, data: { status: 'DISPUTED' } }).catch(() => null);
      await tx.notification.createMany({
        data: [
          { userId: transaction.buyerId, type: 'SYSTEM', title: 'Dispute opened', body: 'A dispute has been opened for your transaction.', data: { disputeId: created.id, transactionId } },
          { userId: transaction.sellerId, type: 'SYSTEM', title: 'Dispute opened', body: 'A dispute has been opened for your transaction.', data: { disputeId: created.id, transactionId } },
        ],
      }).catch(() => null);

      return created;
    });

    res.status(201).json({ dispute: serializeDispute(dispute) });
  } catch (err) {
    console.error('POST /disputes error:', err);
    res.status(500).json({ error: { message: 'Failed to create dispute', code: 'INTERNAL_ERROR' } });
  }
});

// GET /disputes/:id — participants/admin can view dispute detail
router.get('/:id', async (req, res) => {
  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id: req.params.id },
      include: {
        transaction: { include: { listing: { select: { id: true, title: true } } } },
        buyer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        seller: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        raisedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!dispute) return res.status(404).json({ error: { message: 'Dispute not found', code: 'NOT_FOUND' } });
    if (!isAdmin(req.user) && ![dispute.buyerId, dispute.sellerId, dispute.raisedById].includes(req.user.id)) {
      return res.status(403).json({ error: { message: 'Not authorized for this dispute', code: 'FORBIDDEN' } });
    }
    res.json({ dispute: serializeDispute(dispute) });
  } catch (err) {
    console.error('GET /disputes/:id error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch dispute', code: 'INTERNAL_ERROR' } });
  }
});

// PATCH /disputes/:id/resolve — admin resolves and performs auditable wallet reversal if required
router.patch('/:id/resolve', async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ error: { message: 'Admin access required', code: 'FORBIDDEN' } });

    const resolution = normalizeResolution(req.body.resolution);
    if (!resolution) return res.status(400).json({ error: { message: 'resolution must be award_buyer, award_seller, or mutual_cancellation', code: 'VALIDATION_ERROR' } });

    const result = await prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.findUnique({
        where: { id: req.params.id },
        include: { transaction: true },
      });
      if (!dispute) throw Object.assign(new Error('Dispute not found'), { status: 404, code: 'NOT_FOUND' });
      if (['RESOLVED', 'DISMISSED'].includes(dispute.status)) {
        throw Object.assign(new Error('Dispute is already closed'), { status: 409, code: 'DISPUTE_CLOSED' });
      }

      const deposit = await tx.listingDeposit.findUnique({
        where: { listingId_buyerId: { listingId: dispute.transaction.listingId, buyerId: dispute.transaction.buyerId } },
      }).catch(() => null);

      let reversalAmountPaisa = 0n;
      let reversalLedgerId = null;
      let releasedDepositPaisa = 0n;

      if (resolution === 'AWARD_BUYER' || resolution === 'MUTUAL_CANCELLATION') {
        if (deposit?.status === 'HELD') {
          const released = await releaseHeldDepositInTx(tx, deposit, dispute.id);
          releasedDepositPaisa = released.releasedPaisa;
          reversalLedgerId = released.ledgerId;
        } else {
          const reversed = await reverseCapturedCommissionInTx(tx, dispute.transaction, dispute.id);
          reversalAmountPaisa = reversed.reversalPaisa;
          reversalLedgerId = reversed.ledgerId;
        }
      }

      const nextTransactionStatus = resolution === 'AWARD_SELLER'
        ? (dispute.transactionStatusAtOpen === 'FINALIZED' || dispute.transaction.finalizedAt ? 'FINALIZED' : dispute.transactionStatusAtOpen || 'ACCEPTED')
        : 'CANCELLED';

      await tx.transaction.update({
        where: { id: dispute.transactionId },
        data: { status: nextTransactionStatus, notes: req.body.note ? String(req.body.note).slice(0, 2000) : dispute.transaction.notes },
      }).catch(() => null);

      const updated = await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status: 'RESOLVED',
          resolution,
          resolutionNote: req.body.note ? String(req.body.note).slice(0, 2000) : null,
          resolvedById: req.user.id,
          resolvedAt: new Date(),
          reversalAmountPaisa: reversalAmountPaisa + releasedDepositPaisa,
          reversalLedgerId,
        },
        include: { transaction: true },
      });

      await tx.notification.createMany({
        data: [
          { userId: dispute.buyerId, type: 'SYSTEM', title: 'Dispute resolved', body: `Resolution: ${resolution}`, data: { disputeId: dispute.id, transactionId: dispute.transactionId, reversalAmountPaisa: (reversalAmountPaisa + releasedDepositPaisa).toString() } },
          { userId: dispute.sellerId, type: 'SYSTEM', title: 'Dispute resolved', body: `Resolution: ${resolution}`, data: { disputeId: dispute.id, transactionId: dispute.transactionId } },
        ],
      }).catch(() => null);

      return { dispute: updated, reversalAmountPaisa, releasedDepositPaisa, reversalLedgerId };
    });

    res.json({
      dispute: serializeDispute(result.dispute),
      reversal: {
        reversalAmountPaisa: result.reversalAmountPaisa.toString(),
        releasedDepositPaisa: result.releasedDepositPaisa.toString(),
        totalReturnedPaisa: (result.reversalAmountPaisa + result.releasedDepositPaisa).toString(),
        ledgerId: result.reversalLedgerId,
      },
    });
  } catch (err) {
    console.error('PATCH /disputes/:id/resolve error:', err);
    res.status(err.status || 500).json({ error: { message: err.message || 'Failed to resolve dispute', code: err.code || 'INTERNAL_ERROR' } });
  }
});

module.exports = router;
