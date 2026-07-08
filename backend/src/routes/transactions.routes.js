const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../services/prisma');
const { authenticate } = require('../middleware/auth');
const { addFormattedPrice } = require('../services/currency.service');
const {
  getActiveDeposit,
  getMoneySettings,
  getCommissionCoverage,
  getSettlementPrice,
  captureCommissionForTransaction,
  WalletError,
} = require('../services/wallet.service');

router.use(authenticate);

function isAdmin(user) {
  return ['SUPER_ADMIN', 'ADMIN', 'COLLECTION_MANAGER'].includes(String(user?.role || '').toUpperCase());
}

function isParticipant(transaction, user) {
  return isAdmin(user) || transaction?.buyerId === user.id || transaction?.sellerId === user.id;
}

function assertParticipant(transaction, user, res) {
  if (!transaction) {
    res.status(404).json({ error: { message: 'Transaction not found', code: 'NOT_FOUND' } });
    return false;
  }
  if (!isParticipant(transaction, user)) {
    res.status(403).json({ error: { message: 'Not authorized for this transaction', code: 'FORBIDDEN' } });
    return false;
  }
  return true;
}

function moneyString(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number') return Number.isFinite(value) ? String(Math.trunc(value)) : null;
  if (typeof value === 'string') return value;
  if (value && typeof value.toString === 'function') return value.toString();
  return null;
}

function formatRupeesScalar(value) {
  const raw = moneyString(value);
  if (raw === null || raw === '') return null;
  const neg = raw.startsWith('-');
  const digits = neg ? raw.slice(1) : raw;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `â‚¨ ${neg ? '-' : ''}${grouped}`;
}

function serializeTransaction(t) {
  if (!t) return null;
  const { handshakeOtpHash, ...safe } = t;
  const settlement = t.actualPricePaisa ?? t.totalPaisa ?? t.finalPricePaisa ?? t.amountPaisa;
  return {
    ...safe,
    handshakeOtpHash: undefined,
    amountPaisa: moneyString(t.amountPaisa),
    amountRupees: moneyString(t.amountPaisa),
    offeredPricePaisa: moneyString(t.offeredPricePaisa),
    offeredPriceRupees: moneyString(t.offeredPricePaisa),
    counterPricePaisa: moneyString(t.counterPricePaisa),
    counterPriceRupees: moneyString(t.counterPricePaisa),
    finalPricePaisa: moneyString(t.finalPricePaisa),
    finalPriceRupees: moneyString(t.finalPricePaisa),
    totalPaisa: moneyString(t.totalPaisa),
    totalRupees: moneyString(t.totalPaisa),
    actualPricePaisa: moneyString(t.actualPricePaisa),
    actualPriceRupees: moneyString(t.actualPricePaisa),
    settlementPricePaisa: moneyString(settlement),
    settlementPriceRupees: moneyString(settlement),
    actualQuantity: t.actualQuantity?.toString?.() ?? t.actualQuantity ?? null,
    quantity: t.quantity?.toString?.() ?? t.quantity,
    offeredPriceFormatted: formatRupeesScalar(t.offeredPricePaisa),
    finalPriceFormatted: formatRupeesScalar(t.finalPricePaisa),
    settlementPriceFormatted: formatRupeesScalar(settlement),
    moneyBaseUnit: 'rupees',
  };
}

function serializeBond(bond) {
  if (!bond) return null;
  return {
    ...bond,
    settlementPricePaisa: bond.settlementPricePaisa?.toString() || null,
    commissionPaisa: bond.commissionPaisa?.toString() || null,
    actualQuantity: bond.actualQuantity?.toString?.() ?? bond.actualQuantity ?? null,
  };
}

async function notifyTopupRequired(client, buyerId, data) {
  await client.notification.create({
    data: {
      userId: buyerId,
      type: 'SYSTEM',
      title: 'Top-up required to finalize deal',
      body: 'Insufficient funds to finalize weight adjustments. Please top up.',
      data,
    },
  }).catch(() => null);
}

async function assertBuyerCanCoverCommission(transactionId, client = prisma) {
  const coverage = await getCommissionCoverage(transactionId, client);
  if (!coverage.canCover) {
    await notifyTopupRequired(client, coverage.transaction.buyerId, {
      transactionId,
      shortfallPaisa: coverage.shortfallPaisa.toString(),
      availableBalancePaisa: coverage.availableBalancePaisa.toString(),
      commissionPaisa: coverage.commissionPaisa.toString(),
      settlementPricePaisa: coverage.settlementPricePaisa.toString(),
    });
    throw new WalletError('Insufficient funds to finalize weight adjustments. Please top up.', 'INSUFFICIENT_FUNDS_FOR_VARIANCE', 402, {
      shortfallPaisa: coverage.shortfallPaisa.toString(),
      availableBalancePaisa: coverage.availableBalancePaisa.toString(),
      commissionPaisa: coverage.commissionPaisa.toString(),
      settlementPricePaisa: coverage.settlementPricePaisa.toString(),
    });
  }
  return coverage;
}

// GET /transactions — List own transactions
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = isAdmin(req.user) ? {} : { OR: [{ buyerId: req.user.id }, { sellerId: req.user.id }] };
    if (status) where.status = status;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          listing: { select: { id: true, title: true, images: { take: 1 }, sellerId: true } },
          buyer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          seller: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({ transactions: transactions.map(serializeTransaction), total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('GET /transactions error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch transactions', code: 'INTERNAL_ERROR' } });
  }
});

// GET /transactions/:id — Transaction detail
router.get('/:id', async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: {
        listing: { include: { images: { take: 3 }, seller: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
        buyer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        seller: { select: { id: true, firstName: true, lastName: true, phone: true } },
        bond: true,
      },
    });
    if (!assertParticipant(transaction, req.user, res)) return;
    res.json({ transaction: serializeTransaction(transaction) });
  } catch (err) {
    console.error('GET /transactions/:id error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch transaction', code: 'INTERNAL_ERROR' } });
  }
});

// POST /transactions — Buyer submits a structured offer after deposit unlock
router.post('/', async (req, res) => {
  try {
    const { listingId, offeredPricePaisa, quantity, message } = req.body;
    if (!listingId || !offeredPricePaisa) {
      return res.status(400).json({ error: { message: 'listingId and offeredPricePaisa are required', code: 'VALIDATION_ERROR' } });
    }

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: { message: 'Listing not found', code: 'NOT_FOUND' } });
    if (listing.sellerId === req.user.id) return res.status(400).json({ error: { message: 'Cannot make offer on your own listing', code: 'SELF_OFFER_NOT_ALLOWED' } });

    const deposit = await getActiveDeposit(listingId, req.user.id);
    if (!deposit) {
      return res.status(402).json({ error: { message: 'A held buyer deposit is required before submitting an offer', code: 'DEPOSIT_REQUIRED' } });
    }

    const price = BigInt(offeredPricePaisa);
    const transaction = await prisma.transaction.create({
      data: {
        listingId,
        buyerId: req.user.id,
        sellerId: listing.sellerId,
        amountPaisa: price,
        offeredPricePaisa: price,
        finalPricePaisa: null,
        totalPaisa: null,
        quantity: quantity || listing.quantity,
        unitId: listing.unitId,
        currencyId: listing.currencyId || 'PKR',
        status: 'OFFERED',
        verificationStatus: 'PENDING_WEIGHING',
        message,
      },
    });

    await prisma.notification.create({
      data: {
        userId: listing.sellerId,
        type: 'OFFER_RECEIVED',
        title: 'New offer received',
        body: `A funded buyer made an offer on your listing "${listing.title}"`,
        data: { event: 'OFFER_RECEIVED', listingId, transactionId: transaction.id },
      },
    }).catch(() => null);

    res.status(201).json({ transaction: serializeTransaction(transaction) });
  } catch (err) {
    console.error('POST /transactions error:', err);
    res.status(500).json({ error: { message: 'Failed to create offer', code: 'INTERNAL_ERROR' } });
  }
});

// PUT /transactions/:id/counter — Counter offer by either party before acceptance
router.put('/:id/counter', async (req, res) => {
  try {
    const { counterPricePaisa, message } = req.body;
    if (!counterPricePaisa) return res.status(400).json({ error: { message: 'counterPricePaisa is required', code: 'VALIDATION_ERROR' } });
    const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!assertParticipant(existing, req.user, res)) return;
    if (['FINALIZED', 'CANCELLED', 'REJECTED'].includes(existing.status)) {
      return res.status(409).json({ error: { message: 'Cannot counter a closed transaction', code: 'INVALID_STATUS' } });
    }
    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: { counterPricePaisa: BigInt(counterPricePaisa), status: 'NEGOTIATING', message },
    });
    res.json({ transaction: serializeTransaction(transaction) });
  } catch (err) {
    console.error('PUT /transactions/:id/counter error:', err);
    res.status(500).json({ error: { message: 'Failed to counter offer', code: 'INTERNAL_ERROR' } });
  }
});

// PUT /transactions/:id/accept — Seller accepts offer; no commission captured here
router.put('/:id/accept', async (req, res) => {
  try {
    const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!assertParticipant(existing, req.user, res)) return;
    if (existing.sellerId !== req.user.id && !isAdmin(req.user)) return res.status(403).json({ error: { message: 'Only the seller can accept an offer', code: 'SELLER_ONLY' } });
    if (!['OFFERED', 'OFFER_MADE', 'NEGOTIATING'].includes(existing.status)) return res.status(409).json({ error: { message: 'Transaction is not accept-ready', code: 'INVALID_STATUS' } });

    const finalPrice = existing.counterPricePaisa || existing.offeredPricePaisa || existing.amountPaisa;
    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: { status: 'ACCEPTED', finalPricePaisa: finalPrice, totalPaisa: finalPrice },
    });

    await prisma.notification.create({
      data: { userId: transaction.buyerId, type: 'OFFER_ACCEPTED', title: 'Offer accepted', body: 'Your funded offer was accepted.', data: { event: 'OFFER_ACCEPTED', transactionId: transaction.id } },
    }).catch(() => null);

    res.json({ transaction: serializeTransaction(transaction) });
  } catch (err) {
    console.error('PUT /transactions/:id/accept error:', err);
    res.status(500).json({ error: { message: 'Failed to accept offer', code: 'INTERNAL_ERROR' } });
  }
});

// PUT /transactions/:id/reject — Seller rejects offer; deposit remains held until refund/expiry/buyer release
router.put('/:id/reject', async (req, res) => {
  try {
    const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!assertParticipant(existing, req.user, res)) return;
    if (existing.sellerId !== req.user.id && !isAdmin(req.user)) return res.status(403).json({ error: { message: 'Only the seller can reject an offer', code: 'SELLER_ONLY' } });
    const transaction = await prisma.transaction.update({ where: { id: req.params.id }, data: { status: 'REJECTED' } });
    await prisma.notification.create({
      data: {
        userId: transaction.buyerId,
        type: 'OFFER_REJECTED',
        title: 'Offer rejected',
        body: 'Your funded offer was rejected by the seller.',
        data: { event: 'OFFER_REJECTED', transactionId: transaction.id, listingId: transaction.listingId },
      },
    }).catch(() => null);
    res.json({ transaction: serializeTransaction(transaction) });
  } catch (err) {
    console.error('PUT /transactions/:id/reject error:', err);
    res.status(500).json({ error: { message: 'Failed to reject offer', code: 'INTERNAL_ERROR' } });
  }
});

// PUT /transactions/:id/in-progress — either party marks logistics in progress
router.put('/:id/in-progress', async (req, res) => {
  try {
    const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!assertParticipant(existing, req.user, res)) return;
    if (!['ACCEPTED', 'IN_PROGRESS'].includes(existing.status)) return res.status(409).json({ error: { message: 'Only accepted transactions can move in progress', code: 'INVALID_STATUS' } });
    const transaction = await prisma.transaction.update({ where: { id: req.params.id }, data: { status: 'IN_PROGRESS' } });
    res.json({ transaction: serializeTransaction(transaction) });
  } catch (err) {
    console.error('PUT /transactions/:id/in-progress error:', err);
    res.status(500).json({ error: { message: 'Failed to update transaction', code: 'INTERNAL_ERROR' } });
  }
});

// PUT /transactions/:id/cancel — Cancel before finalization and refund held deposit
router.put('/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!assertParticipant(existing, req.user, res)) return;
    if (existing.status === 'FINALIZED') return res.status(409).json({ error: { message: 'Finalized transactions cannot be cancelled', code: 'ALREADY_FINALIZED' } });

    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED', notes: reason || existing.notes },
    });

    const { releaseDeposit } = require('../services/wallet.service');
    const deposit = await getActiveDeposit(existing.listingId, existing.buyerId);
    let refund = null;
    if (deposit && deposit.status === 'HELD') refund = await releaseDeposit(deposit.id, { note: 'Transaction cancelled before finalization' });

    await prisma.notification.createMany({
      data: [
        { userId: existing.buyerId, type: 'SYSTEM', title: 'Transaction cancelled', body: 'The transaction was cancelled before finalization.', data: { event: 'TRANSACTION_CANCELLED', transactionId: existing.id, listingId: existing.listingId } },
        { userId: existing.sellerId, type: 'SYSTEM', title: 'Transaction cancelled', body: 'The transaction was cancelled before finalization.', data: { event: 'TRANSACTION_CANCELLED', transactionId: existing.id, listingId: existing.listingId } },
      ],
    }).catch(() => null);

    res.json({ transaction: serializeTransaction(transaction), refund: refund ? { released: refund.released } : null });
  } catch (err) {
    console.error('PUT /transactions/:id/cancel error:', err);
    res.status(500).json({ error: { message: 'Failed to cancel transaction', code: 'INTERNAL_ERROR' } });
  }
});

// POST /transactions/:id/amend-weight — Buyer records actual weighed quantity/price before handshake
router.post('/:id/amend-weight', async (req, res) => {
  try {
    const { actualQuantity, actualPricePaisa } = req.body;
    if (!actualQuantity || !actualPricePaisa) {
      return res.status(400).json({ error: { message: 'actualQuantity and actualPricePaisa are required', code: 'VALIDATION_ERROR' } });
    }
    const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!assertParticipant(existing, req.user, res)) return;
    if (existing.buyerId !== req.user.id && !isAdmin(req.user)) return res.status(403).json({ error: { message: 'Only the buyer can submit weight amendments', code: 'BUYER_ONLY' } });
    if (!['ACCEPTED', 'IN_PROGRESS'].includes(existing.status)) return res.status(409).json({ error: { message: 'Transaction is not amendable', code: 'INVALID_STATUS' } });

    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: {
        actualQuantity: Number(actualQuantity),
        actualPricePaisa: BigInt(actualPricePaisa),
        verificationStatus: 'AMENDED',
        amendmentAcknowledgedAt: null,
        amendmentAcknowledgedBy: null,
      },
    });

    await prisma.notification.create({
      data: { userId: transaction.sellerId, type: 'SYSTEM', title: 'Weight amendment submitted', body: 'Buyer submitted actual weighed quantity/price. Please acknowledge before handshake.', data: { event: 'WEIGHT_AMENDMENT', transactionId: transaction.id } },
    }).catch(() => null);

    try {
      const coverage = await assertBuyerCanCoverCommission(transaction.id);
      return res.json({ transaction: serializeTransaction(transaction), coverage: {
        canCover: true,
        commissionPaisa: coverage.commissionPaisa.toString(),
        shortfallPaisa: coverage.shortfallPaisa.toString(),
      } });
    } catch (err) {
      if (err instanceof WalletError) {
        return res.status(err.status).json({ transaction: serializeTransaction(transaction), error: { message: err.message, code: err.code, ...err.details } });
      }
      throw err;
    }
  } catch (err) {
    console.error('POST /transactions/:id/amend-weight error:', err);
    res.status(500).json({ error: { message: 'Failed to amend transaction', code: 'INTERNAL_ERROR' } });
  }
});

// POST /transactions/:id/acknowledge-amendment — Seller acknowledges post-weighing amendment
router.post('/:id/acknowledge-amendment', async (req, res) => {
  try {
    const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!assertParticipant(existing, req.user, res)) return;
    if (existing.sellerId !== req.user.id && !isAdmin(req.user)) return res.status(403).json({ error: { message: 'Only the seller can acknowledge amendments', code: 'SELLER_ONLY' } });
    if (!existing.actualPricePaisa || existing.verificationStatus !== 'AMENDED') return res.status(409).json({ error: { message: 'No pending amendment to acknowledge', code: 'NO_PENDING_AMENDMENT' } });

    const coverage = await assertBuyerCanCoverCommission(existing.id);
    const transaction = await prisma.transaction.update({
      where: { id: existing.id },
      data: { verificationStatus: 'HANDSHAKE_PENDING', amendmentAcknowledgedAt: new Date(), amendmentAcknowledgedBy: req.user.id },
    });
    res.json({ transaction: serializeTransaction(transaction), coverage: { canCover: true, commissionPaisa: coverage.commissionPaisa.toString(), shortfallPaisa: coverage.shortfallPaisa.toString() } });
  } catch (err) {
    if (err instanceof WalletError) return res.status(err.status).json({ error: { message: err.message, code: err.code, ...err.details } });
    console.error('POST /transactions/:id/acknowledge-amendment error:', err);
    res.status(500).json({ error: { message: 'Failed to acknowledge amendment', code: 'INTERNAL_ERROR' } });
  }
});

// POST /transactions/:id/handshake/generate — Seller generates OTP sent only to seller
router.post('/:id/handshake/generate', async (req, res) => {
  try {
    const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!assertParticipant(existing, req.user, res)) return;
    if (existing.sellerId !== req.user.id && !isAdmin(req.user)) return res.status(403).json({ error: { message: 'Only the seller can generate the handshake OTP', code: 'SELLER_ONLY' } });
    if (!['ACCEPTED', 'IN_PROGRESS'].includes(existing.status)) return res.status(409).json({ error: { message: 'Only accepted/in-progress transactions can generate handshake OTP', code: 'INVALID_STATUS' } });
    if (existing.actualPricePaisa && !existing.amendmentAcknowledgedAt) return res.status(409).json({ error: { message: 'Seller must acknowledge the amendment before generating OTP', code: 'AMENDMENT_ACK_REQUIRED' } });

    const coverage = await assertBuyerCanCoverCommission(existing.id);
    const settings = await getMoneySettings();
    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const hash = await bcrypt.hash(otp, 12);
    const expiresAt = new Date(Date.now() + settings.handshakeOtpExpiryMin * 60 * 1000);

    const transaction = await prisma.transaction.update({
      where: { id: existing.id },
      data: {
        verificationStatus: 'HANDSHAKE_PENDING',
        handshakeOtpHash: hash,
        handshakeOtpExpiresAt: expiresAt,
        handshakeAttemptCount: 0,
        handshakeLockedUntil: null,
      },
    });

    // Seller-only delivery. This is intentionally not sent to the buyer.
    await prisma.notification.create({
      data: {
        userId: existing.sellerId,
        type: 'SYSTEM',
        title: 'Secure Handshake OTP',
        body: `Your pickup OTP is ${otp}. Share it with the buyer only at physical pickup.`,
        data: { event: 'SECURE_HANDSHAKE_OTP', transactionId: existing.id, expiresAt: expiresAt.toISOString() },
      },
    }).catch(() => null);

    const payload = {
      transaction: serializeTransaction(transaction),
      expiresAt,
      message: 'Secure handshake OTP sent to seller',
      coverage: { commissionPaisa: coverage.commissionPaisa.toString(), shortfallPaisa: coverage.shortfallPaisa.toString() },
    };
    if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_TEST_HANDSHAKE_OTP === 'true') payload.otp = otp;
    res.json(payload);
  } catch (err) {
    if (err instanceof WalletError) return res.status(err.status).json({ error: { message: err.message, code: err.code, ...err.details } });
    console.error('POST /transactions/:id/handshake/generate error:', err);
    res.status(500).json({ error: { message: 'Failed to generate handshake OTP', code: 'INTERNAL_ERROR' } });
  }
});

// POST /transactions/:id/verify-handshake — Buyer verifies OTP; this is the only finalization path
router.post('/:id/verify-handshake', async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp || !/^\d{6}$/.test(String(otp))) return res.status(400).json({ error: { message: 'A 6-digit OTP is required', code: 'VALIDATION_ERROR' } });

    const existing = await prisma.transaction.findUnique({ where: { id: req.params.id }, include: { bond: true } });
    if (!assertParticipant(existing, req.user, res)) return;
    if (existing.buyerId !== req.user.id && !isAdmin(req.user)) return res.status(403).json({ error: { message: 'Only the buyer can verify the handshake OTP', code: 'BUYER_ONLY' } });

    if (existing.status === 'FINALIZED') {
      return res.json({ transaction: serializeTransaction(existing), bond: serializeBond(existing.bond), alreadyFinalized: true });
    }

    if (existing.handshakeLockedUntil && existing.handshakeLockedUntil > new Date()) {
      return res.status(423).json({ error: { message: 'Handshake OTP attempts are locked', code: 'HANDSHAKE_LOCKED', lockedUntil: existing.handshakeLockedUntil.toISOString() } });
    }
    if (!existing.handshakeOtpHash) return res.status(409).json({ error: { message: 'No active handshake OTP. Ask seller to generate a new one.', code: 'HANDSHAKE_OTP_REQUIRED' } });
    if (!existing.handshakeOtpExpiresAt || existing.handshakeOtpExpiresAt <= new Date()) return res.status(410).json({ error: { message: 'Handshake OTP expired', code: 'HANDSHAKE_OTP_EXPIRED' } });

    const ok = await bcrypt.compare(String(otp), existing.handshakeOtpHash);
    if (!ok) {
      const nextAttempts = (existing.handshakeAttemptCount || 0) + 1;
      const update = { handshakeAttemptCount: nextAttempts };
      if (nextAttempts >= 5) update.handshakeLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      await prisma.transaction.update({ where: { id: existing.id }, data: update });
      return res.status(400).json({ error: { message: 'Incorrect handshake OTP', code: 'HANDSHAKE_OTP_INVALID', attemptsLeft: Math.max(0, 5 - nextAttempts) } });
    }

    const result = await prisma.$transaction(async (tx) => {
      const latest = await tx.transaction.findUnique({
        where: { id: existing.id },
        include: {
          buyer: { select: { id: true, firstName: true, lastName: true, ntnNumber: true, strnNumber: true, businessType: true } },
          seller: { select: { id: true, firstName: true, lastName: true, ntnNumber: true, strnNumber: true, businessType: true } },
          listing: true,
          bond: true,
        },
      });
      if (latest.status === 'FINALIZED') return { transaction: latest, bond: latest.bond, alreadyFinalized: true };
      if (latest.actualPricePaisa && !latest.amendmentAcknowledgedAt) throw new WalletError('Seller must acknowledge the amendment before finalization', 'AMENDMENT_ACK_REQUIRED', 409);

      const capture = await captureCommissionForTransaction(latest.id, { tx });
      const settlementPricePaisa = getSettlementPrice(latest);
      const now = new Date();
      const transaction = await tx.transaction.update({
        where: { id: latest.id },
        data: {
          status: 'FINALIZED',
          verificationStatus: 'FINALIZED',
          handshakeVerifiedAt: now,
          finalizedAt: now,
          handshakeOtpHash: null,
          handshakeAttemptCount: 0,
          handshakeLockedUntil: null,
        },
        include: {
          buyer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          seller: { select: { id: true, firstName: true, lastName: true, phone: true } },
          listing: true,
          bond: true,
        },
      });

      await tx.listing.update({ where: { id: latest.listingId }, data: { status: 'SOLD' } }).catch(() => null);

      const hasTax = !!(latest.buyer.ntnNumber || latest.buyer.strnNumber || latest.seller.ntnNumber || latest.seller.strnNumber);
      const taxSnapshot = hasTax ? {
        buyer: { ntnNumber: latest.buyer.ntnNumber || null, strnNumber: latest.buyer.strnNumber || null, businessType: latest.buyer.businessType || 'INDIVIDUAL' },
        seller: { ntnNumber: latest.seller.ntnNumber || null, strnNumber: latest.seller.strnNumber || null, businessType: latest.seller.businessType || 'INDIVIDUAL' },
        note: 'Commercial receipt section rendered only for parties with supplied tax identifiers. Withholding tax adjustments depend on party-specific compliance handling.',
      } : null;

      const bond = await tx.bond.upsert({
        where: { transactionId: latest.id },
        update: {
          settlementPricePaisa,
          commissionPaisa: capture.commissionPaisa,
          actualQuantity: latest.actualQuantity || null,
          taxSnapshot,
          issuedAt: now,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        create: {
          transactionId: latest.id,
          bondNumber: `BND-${Date.now()}-${latest.id.slice(0, 8)}`,
          settlementPricePaisa,
          commissionPaisa: capture.commissionPaisa,
          actualQuantity: latest.actualQuantity || null,
          taxSnapshot,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      await tx.notification.createMany({
        data: [
          { userId: latest.buyerId, type: 'SYSTEM', title: 'Deal finalized', body: 'Secure handshake verified. Commission captured from buyer deposit.', data: { event: 'DEAL_FINALIZED', transactionId: latest.id, bondId: bond.id } },
          { userId: latest.sellerId, type: 'SYSTEM', title: 'Deal finalized', body: 'Secure handshake verified. Seller wallet was not charged.', data: { event: 'DEAL_FINALIZED', transactionId: latest.id, bondId: bond.id } },
          { userId: latest.buyerId, type: 'SYSTEM', title: 'Bond ready', body: 'Your finalized deal bond is ready.', data: { event: 'BOND_READY', transactionId: latest.id, bondId: bond.id } },
          { userId: latest.sellerId, type: 'SYSTEM', title: 'Bond ready', body: 'Your finalized deal bond is ready.', data: { event: 'BOND_READY', transactionId: latest.id, bondId: bond.id } },
        ],
      }).catch(() => null);

      return { transaction, bond, capture, alreadyFinalized: false };
    });

    res.json({
      transaction: serializeTransaction(result.transaction),
      bond: serializeBond(result.bond),
      capture: result.capture ? {
        commissionPaisa: result.capture.commissionPaisa.toString(),
        refundPaisa: result.capture.refundPaisa?.toString?.() || '0',
        shortfallPaisa: result.capture.shortfallPaisa.toString(),
      } : null,
      alreadyFinalized: result.alreadyFinalized,
    });
  } catch (err) {
    if (err instanceof WalletError) return res.status(err.status).json({ error: { message: err.message, code: err.code, ...err.details } });
    console.error('POST /transactions/:id/verify-handshake error:', err);
    res.status(500).json({ error: { message: 'Failed to verify handshake', code: 'INTERNAL_ERROR' } });
  }
});

// PUT /transactions/:id/finalize — intentionally blocked; handshake verification is the only finalization path
router.put('/:id/finalize', async (req, res) => {
  res.status(409).json({ error: { message: 'Direct finalization is disabled. Use Secure Handshake OTP verification.', code: 'HANDSHAKE_REQUIRED' } });
});


// POST /transactions/:id/dispute — participant raises dispute; delegates to /api/disputes contract
router.post('/:id/dispute', async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!assertParticipant(transaction, req.user, res)) return;
    req.body = { ...req.body, transactionId: req.params.id };
    // Mirror the public disputes contract for legacy clients.
    const open = await prisma.dispute.findFirst({ where: { transactionId: req.params.id, status: { in: ['OPEN', 'UNDER_REVIEW'] } } });
    if (open) return res.status(409).json({ error: { message: 'An open dispute already exists for this transaction', code: 'DISPUTE_ALREADY_OPEN', disputeId: open.id } });
    if (!req.body.reason) return res.status(400).json({ error: { message: 'reason is required', code: 'VALIDATION_ERROR' } });
    if (['CANCELLED', 'REJECTED', 'OFFER_REJECTED'].includes(transaction.status)) return res.status(409).json({ error: { message: 'Closed/cancelled transactions cannot be disputed', code: 'INVALID_STATUS' } });

    const dispute = await prisma.$transaction(async (tx) => {
      const created = await tx.dispute.create({
        data: {
          transactionId: transaction.id,
          raisedById: req.user.id,
          buyerId: transaction.buyerId,
          sellerId: transaction.sellerId,
          reason: String(req.body.reason).slice(0, 120),
          description: req.body.description ? String(req.body.description).slice(0, 2000) : null,
          evidence: req.body.evidence || null,
          transactionStatusAtOpen: transaction.status,
        },
      });
      await tx.transaction.update({ where: { id: transaction.id }, data: { status: 'DISPUTED' } }).catch(() => null);
      await tx.notification.createMany({
        data: [
          { userId: transaction.buyerId, type: 'SYSTEM', title: 'Dispute opened', body: 'A dispute has been opened for your transaction.', data: { event: 'DISPUTE_OPENED', disputeId: created.id, transactionId: transaction.id } },
          { userId: transaction.sellerId, type: 'SYSTEM', title: 'Dispute opened', body: 'A dispute has been opened for your transaction.', data: { event: 'DISPUTE_OPENED', disputeId: created.id, transactionId: transaction.id } },
        ],
      }).catch(() => null);
      return created;
    });
    res.status(201).json({ dispute: { ...dispute, reversalAmountPaisa: dispute.reversalAmountPaisa?.toString?.() || '0' } });
  } catch (err) {
    console.error('POST /transactions/:id/dispute error:', err);
    res.status(500).json({ error: { message: 'Failed to create dispute', code: 'INTERNAL_ERROR' } });
  }
});

// GET /transactions/:id/bond — Get bond for finalized transaction, restricted to parties/admin
router.get('/:id/bond', async (req, res) => {
  try {
    const bond = await prisma.bond.findFirst({
      where: { transactionId: req.params.id },
      include: {
        transaction: {
          include: {
            listing: { include: { seller: { select: { id: true, firstName: true, lastName: true } } } },
            buyer: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!bond) return res.status(404).json({ error: { message: 'Bond not found', code: 'NOT_FOUND' } });
    if (!isParticipant(bond.transaction, req.user)) return res.status(403).json({ error: { message: 'Not authorized for this bond', code: 'FORBIDDEN' } });
    res.json({ bond: serializeBond(bond) });
  } catch (err) {
    console.error('GET /transactions/:id/bond error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch bond', code: 'INTERNAL_ERROR' } });
  }
});

module.exports = router;
