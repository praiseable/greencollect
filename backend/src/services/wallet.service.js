const prisma = require('./prisma');

class WalletError extends Error {
  constructor(message, code, status = 400, details = {}) {
    super(message);
    this.name = 'WalletError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function toBigIntPaisa(value, field = 'amountPaisa') {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new WalletError(`${field} must be a safe integer paisa amount`, 'INVALID_AMOUNT', 400);
    return BigInt(value);
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return BigInt(value.trim());
  throw new WalletError(`${field} must be an integer paisa amount`, 'INVALID_AMOUNT', 400);
}

function percentToBasisPoints(percentValue, fallbackPercent = '5') {
  const raw = String(percentValue ?? fallbackPercent).trim();
  if (!/^\d+(\.\d{1,4})?$/.test(raw)) return percentToBasisPoints(fallbackPercent, '5');
  const [whole, frac = ''] = raw.split('.');
  // basis points are percent * 100. Keep two decimal places and round down.
  return BigInt(whole) * 100n + BigInt((frac + '00').slice(0, 2));
}

function roundPercentOf(amountPaisa, percentValue, fallbackPercent = '5') {
  const amount = toBigIntPaisa(amountPaisa);
  const bps = percentToBasisPoints(percentValue, fallbackPercent);
  // amount * bps / 10_000, rounded half-up to the nearest paisa.
  return (amount * bps + 5000n) / 10000n;
}

async function getPlatformConfig(key, fallback, client = prisma) {
  const row = await client.platformConfig.findUnique({ where: { key } }).catch(() => null);
  return row?.value ?? fallback;
}

async function getMoneySettings(client = prisma) {
  const [depositPercent, depositMinFlatPaisa, commissionRatePercent, depositHoldExpiryDays, handshakeOtpExpiryMin] = await Promise.all([
    getPlatformConfig('deposit_percent', '5', client),
    getPlatformConfig('deposit_min_flat_paisa', '50000', client),
    getPlatformConfig('commission_rate_percent', '5', client),
    getPlatformConfig('deposit_hold_expiry_days', '14', client),
    getPlatformConfig('handshake_otp_expiry_min', '30', client),
  ]);
  return {
    depositPercent,
    depositMinFlatPaisa: toBigIntPaisa(depositMinFlatPaisa, 'deposit_min_flat_paisa'),
    commissionRatePercent,
    depositHoldExpiryDays: Number.parseInt(depositHoldExpiryDays, 10) || 14,
    handshakeOtpExpiryMin: Number.parseInt(handshakeOtpExpiryMin, 10) || 30,
  };
}

async function ensureWallet(userId, client = prisma) {
  let wallet = await client.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    wallet = await client.wallet.create({
      data: {
        userId,
        currencyId: 'PKR',
        availableBalancePaisa: 0n,
        escrowedBalancePaisa: 0n,
        balancePaisa: 0n,
      },
    });
  }

  // Runtime migration bridge: older deployments had only balancePaisa.
  if ((wallet.availableBalancePaisa ?? 0n) === 0n && (wallet.escrowedBalancePaisa ?? 0n) === 0n && (wallet.balancePaisa ?? 0n) > 0n) {
    wallet = await client.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalancePaisa: wallet.balancePaisa,
        escrowedBalancePaisa: 0n,
        balancePaisa: wallet.balancePaisa,
      },
    });
  }
  return wallet;
}

function walletTotals(wallet) {
  const available = wallet.availableBalancePaisa ?? wallet.balancePaisa ?? 0n;
  const escrowed = wallet.escrowedBalancePaisa ?? 0n;
  return { available, escrowed, total: available + escrowed };
}

async function writeLedger(client, wallet, { type, amountPaisa, referenceType, referenceId = null, note = null, metadata = null }) {
  const { available, escrowed, total } = walletTotals(wallet);
  return client.walletLedger.create({
    data: {
      walletId: wallet.id,
      type,
      amountPaisa: toBigIntPaisa(amountPaisa),
      balanceAfterPaisa: total,
      availableAfterPaisa: available,
      escrowedAfterPaisa: escrowed,
      referenceType,
      referenceId,
      note,
      metadata,
    },
  });
}

async function creditWallet(userId, amountPaisa, options = {}) {
  const amount = toBigIntPaisa(amountPaisa);
  if (amount <= 0n) throw new WalletError('Top-up amount must be greater than zero', 'INVALID_AMOUNT', 400);

  return prisma.$transaction(async (tx) => {
    const wallet = await ensureWallet(userId, tx);
    const available = (wallet.availableBalancePaisa ?? wallet.balancePaisa ?? 0n) + amount;
    const updated = await tx.wallet.update({
      where: { id: wallet.id },
      data: { availableBalancePaisa: available, balancePaisa: available },
    });
    await writeLedger(tx, updated, {
      type: 'CREDIT',
      amountPaisa: amount,
      referenceType: options.referenceType || 'TOPUP',
      referenceId: options.referenceId || null,
      note: options.note || 'Wallet top-up',
      metadata: options.metadata || null,
    });
    return updated;
  });
}

async function debitWallet(userId, amountPaisa, options = {}) {
  const amount = toBigIntPaisa(amountPaisa);
  if (amount <= 0n) throw new WalletError('Debit amount must be greater than zero', 'INVALID_AMOUNT', 400);

  return prisma.$transaction(async (tx) => {
    const wallet = await ensureWallet(userId, tx);
    const available = wallet.availableBalancePaisa ?? wallet.balancePaisa ?? 0n;
    if (available < amount) {
      throw new WalletError('Insufficient available balance', 'INSUFFICIENT_FUNDS', 402, {
        amountPaisa: amount.toString(),
        availableBalancePaisa: available.toString(),
      });
    }
    const nextAvailable = available - amount;
    const updated = await tx.wallet.update({
      where: { id: wallet.id },
      data: { availableBalancePaisa: nextAvailable, balancePaisa: nextAvailable },
    });
    await writeLedger(tx, updated, {
      type: options.type || 'DEBIT',
      amountPaisa: amount,
      referenceType: options.referenceType || 'MANUAL_ADJUSTMENT',
      referenceId: options.referenceId || null,
      note: options.note || 'Wallet debit',
      metadata: options.metadata || null,
    });
    return updated;
  });
}

async function computeDepositAmount(listingPricePaisa, buyerId = null, client = prisma) {
  const settings = await getMoneySettings(client);
  // Base tier deposit is configurable; future buyer subscription overrides can be layered here.
  const percentAmount = roundPercentOf(listingPricePaisa, settings.depositPercent, '5');
  return percentAmount > settings.depositMinFlatPaisa ? percentAmount : settings.depositMinFlatPaisa;
}

async function computeCommissionAmount(settlementPricePaisa, client = prisma) {
  const settings = await getMoneySettings(client);
  return roundPercentOf(settlementPricePaisa, settings.commissionRatePercent, '5');
}

async function getActiveDeposit(listingId, buyerId, client = prisma) {
  if (!buyerId) return null;
  const deposit = await client.listingDeposit.findUnique({
    where: { listingId_buyerId: { listingId, buyerId } },
  }).catch(() => null);
  if (!deposit || !['HELD', 'CAPTURED'].includes(deposit.status)) return null;
  return deposit;
}

async function getUnlockMapForListings(listingIds, buyerId, client = prisma) {
  const ids = [...new Set((listingIds || []).filter(Boolean))];
  const map = new Map();
  if (!buyerId || ids.length === 0) return map;
  const deposits = await client.listingDeposit.findMany({
    where: { listingId: { in: ids }, buyerId, status: { in: ['HELD', 'CAPTURED'] } },
    select: { listingId: true, status: true },
  }).catch(() => []);
  deposits.forEach((d) => map.set(d.listingId, true));
  return map;
}

function isAdminUser(user) {
  return !!user && ['SUPER_ADMIN', 'ADMIN', 'COLLECTION_MANAGER'].includes(String(user.role || '').toUpperCase());
}

async function canUnlockListing(listing, user, client = prisma) {
  if (!listing || !user) return false;
  if (listing.sellerId === user.id || isAdminUser(user)) return true;
  return !!(await getActiveDeposit(listing.id, user.id, client));
}

function maskListingContact(listing, unlocked) {
  const item = { ...listing, contactUnlocked: !!unlocked };
  const seller = item.seller ? { ...item.seller } : null;
  if (!unlocked) {
    if (seller) seller.phone = null;
    item.seller = seller;
    item.contactNumber = null;
    item.sellerPhone = null;
    item.exactAddress = null;
    item.address = null;
    item.latitude = null;
    item.longitude = null;
    item.exactLatitude = null;
    item.exactLongitude = null;
  } else {
    item.seller = seller;
    item.sellerPhone = seller?.phone || item.contactNumber || null;
    item.exactAddress = item.address || null;
    item.exactLatitude = item.latitude ?? null;
    item.exactLongitude = item.longitude ?? null;
  }
  return item;
}

async function placeListingDeposit(listingId, buyerId) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({
      where: { id: listingId },
      include: { seller: { select: { id: true, firstName: true, lastName: true, phone: true } } },
    });
    if (!listing) throw new WalletError('Listing not found', 'LISTING_NOT_FOUND', 404);
    if (listing.sellerId === buyerId) throw new WalletError('Cannot place a deposit on your own listing', 'SELF_DEPOSIT_NOT_ALLOWED', 400);
    if (listing.status !== 'ACTIVE') throw new WalletError('Listing is not active', 'LISTING_NOT_ACTIVE', 409);

    const existing = await tx.listingDeposit.findUnique({ where: { listingId_buyerId: { listingId, buyerId } } }).catch(() => null);
    if (existing && ['HELD', 'CAPTURED'].includes(existing.status)) {
      return { deposit: existing, requiredDepositPaisa: existing.amountPaisa, alreadyHeld: true };
    }

    const amount = await computeDepositAmount(listing.pricePaisa, buyerId, tx);
    const settings = await getMoneySettings(tx);
    const wallet = await ensureWallet(buyerId, tx);
    const available = wallet.availableBalancePaisa ?? wallet.balancePaisa ?? 0n;
    const escrowed = wallet.escrowedBalancePaisa ?? 0n;
    if (available < amount) {
      throw new WalletError('Insufficient wallet balance to place deposit', 'INSUFFICIENT_FUNDS', 402, {
        requiredDepositPaisa: amount.toString(),
        availableBalancePaisa: available.toString(),
      });
    }

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalancePaisa: available - amount,
        escrowedBalancePaisa: escrowed + amount,
        balancePaisa: available - amount,
      },
    });

    const expiresAt = new Date(Date.now() + settings.depositHoldExpiryDays * 24 * 60 * 60 * 1000);
    const deposit = existing
      ? await tx.listingDeposit.update({
          where: { id: existing.id },
          data: { amountPaisa: amount, status: 'HELD', heldAt: new Date(), releasedAt: null, capturedAt: null, expiresAt },
        })
      : await tx.listingDeposit.create({ data: { listingId, buyerId, amountPaisa: amount, status: 'HELD', expiresAt } });

    await writeLedger(tx, updatedWallet, {
      type: 'ESCROW_HOLD',
      amountPaisa: amount,
      referenceType: 'DEPOSIT_HOLD',
      referenceId: deposit.id,
      note: `Deposit hold for listing ${listingId}`,
      metadata: { listingId, buyerId },
    });

    await tx.listing.update({ where: { id: listingId }, data: { interestedCount: { increment: 1 } } }).catch(() => null);
    await tx.notification.create({
      data: {
        userId: listing.sellerId,
        type: 'SYSTEM',
        title: 'Buyer deposit placed',
        body: 'A funded buyer unlocked your listing contact details.',
        data: { listingId, buyerId, depositId: deposit.id },
      },
    }).catch(() => null);

    return { deposit, requiredDepositPaisa: amount, alreadyHeld: false };
  });
}

async function releaseDeposit(depositId, options = {}) {
  return prisma.$transaction(async (tx) => {
    const deposit = await tx.listingDeposit.findUnique({ where: { id: depositId } });
    if (!deposit) throw new WalletError('Deposit not found', 'DEPOSIT_NOT_FOUND', 404);
    if (deposit.status !== 'HELD') return { deposit, released: false };
    const wallet = await ensureWallet(deposit.buyerId, tx);
    const available = wallet.availableBalancePaisa ?? wallet.balancePaisa ?? 0n;
    const escrowed = wallet.escrowedBalancePaisa ?? 0n;
    if (escrowed < deposit.amountPaisa) throw new WalletError('Wallet escrow is inconsistent', 'ESCROW_INCONSISTENT', 500);
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalancePaisa: available + deposit.amountPaisa,
        escrowedBalancePaisa: escrowed - deposit.amountPaisa,
        balancePaisa: available + deposit.amountPaisa,
      },
    });
    const updatedDeposit = await tx.listingDeposit.update({
      where: { id: deposit.id },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });
    await writeLedger(tx, updatedWallet, {
      type: 'ESCROW_RELEASE',
      amountPaisa: deposit.amountPaisa,
      referenceType: 'DEPOSIT_REFUND',
      referenceId: deposit.id,
      note: options.note || 'Deposit refunded',
      metadata: { listingId: deposit.listingId, buyerId: deposit.buyerId },
    });
    return { deposit: updatedDeposit, released: true };
  });
}

function getSettlementPrice(transaction) {
  return transaction.actualPricePaisa ?? transaction.totalPaisa ?? transaction.finalPricePaisa ?? transaction.amountPaisa;
}

async function getCommissionCoverage(transactionId, client = prisma) {
  const transaction = await client.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction) throw new WalletError('Transaction not found', 'TRANSACTION_NOT_FOUND', 404);
  const deposit = await getActiveDeposit(transaction.listingId, transaction.buyerId, client);
  if (!deposit) throw new WalletError('Active buyer deposit is required', 'DEPOSIT_REQUIRED', 402);
  const wallet = await ensureWallet(transaction.buyerId, client);
  const settlementPricePaisa = getSettlementPrice(transaction);
  const commissionPaisa = await computeCommissionAmount(settlementPricePaisa, client);
  const shortfallPaisa = commissionPaisa > deposit.amountPaisa ? commissionPaisa - deposit.amountPaisa : 0n;
  const available = wallet.availableBalancePaisa ?? wallet.balancePaisa ?? 0n;
  return {
    transaction,
    deposit,
    wallet,
    settlementPricePaisa,
    commissionPaisa,
    shortfallPaisa,
    availableBalancePaisa: available,
    canCover: available >= shortfallPaisa,
  };
}

async function captureCommissionForTransaction(transactionId, options = {}) {
  const runner = async (tx) => {
    const coverage = await getCommissionCoverage(transactionId, tx);
    const { transaction, deposit, wallet, settlementPricePaisa, commissionPaisa, shortfallPaisa } = coverage;

    if (deposit.status === 'CAPTURED') {
      return { ...coverage, captured: false, alreadyCaptured: true };
    }
    if (deposit.status !== 'HELD') throw new WalletError('Deposit is not held', 'DEPOSIT_NOT_HELD', 409);

    const available = wallet.availableBalancePaisa ?? wallet.balancePaisa ?? 0n;
    const escrowed = wallet.escrowedBalancePaisa ?? 0n;
    if (escrowed < deposit.amountPaisa) throw new WalletError('Wallet escrow is inconsistent', 'ESCROW_INCONSISTENT', 500);
    if (available < shortfallPaisa) throw new WalletError('Insufficient funds at commission capture', 'INSUFFICIENT_FUNDS_AT_CAPTURE', 409, {
      shortfallPaisa: shortfallPaisa.toString(),
      availableBalancePaisa: available.toString(),
    });

    const refundPaisa = commissionPaisa < deposit.amountPaisa ? deposit.amountPaisa - commissionPaisa : 0n;
    const nextAvailable = available + refundPaisa - shortfallPaisa;
    const nextEscrowed = escrowed - deposit.amountPaisa;

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalancePaisa: nextAvailable,
        escrowedBalancePaisa: nextEscrowed,
        balancePaisa: nextAvailable,
      },
    });

    const updatedDeposit = await tx.listingDeposit.update({
      where: { id: deposit.id },
      data: { status: 'CAPTURED', capturedAt: new Date(), releasedAt: refundPaisa > 0n ? new Date() : null },
    });

    await writeLedger(tx, updatedWallet, {
      type: 'ESCROW_CAPTURE',
      amountPaisa: commissionPaisa,
      referenceType: 'COMMISSION_CAPTURE',
      referenceId: transactionId,
      note: 'Platform commission captured from buyer-funded deposit',
      metadata: {
        listingId: transaction.listingId,
        buyerId: transaction.buyerId,
        sellerId: transaction.sellerId,
        depositId: deposit.id,
        settlementPricePaisa: settlementPricePaisa.toString(),
      },
    });

    if (refundPaisa > 0n) {
      await writeLedger(tx, updatedWallet, {
        type: 'ESCROW_RELEASE',
        amountPaisa: refundPaisa,
        referenceType: 'DEPOSIT_REFUND',
        referenceId: deposit.id,
        note: 'Unused deposit remainder released after commission capture',
        metadata: { transactionId, listingId: transaction.listingId },
      });
    }

    if (shortfallPaisa > 0n) {
      await writeLedger(tx, updatedWallet, {
        type: 'DEBIT',
        amountPaisa: shortfallPaisa,
        referenceType: 'COMMISSION_CAPTURE',
        referenceId: transactionId,
        note: 'Commission shortfall debited from available buyer balance',
        metadata: { transactionId, listingId: transaction.listingId },
      });
    }

    return {
      ...coverage,
      deposit: updatedDeposit,
      wallet: updatedWallet,
      refundPaisa,
      captured: true,
      alreadyCaptured: false,
    };
  };

  if (options.tx) return runner(options.tx);
  return prisma.$transaction(runner);
}

function serializeWallet(wallet) {
  if (!wallet) return null;
  const available = wallet.availableBalancePaisa ?? wallet.balancePaisa ?? 0n;
  const escrowed = wallet.escrowedBalancePaisa ?? 0n;
  return {
    ...wallet,
    availableBalancePaisa: available.toString(),
    escrowedBalancePaisa: escrowed.toString(),
    balancePaisa: (wallet.balancePaisa ?? available).toString(),
    totalBalancePaisa: (available + escrowed).toString(),
    amountFormatted: `₨ ${Number(available).toLocaleString('en-PK')}`,
  };
}

function serializeDeposit(deposit) {
  if (!deposit) return null;
  return {
    ...deposit,
    amountPaisa: deposit.amountPaisa.toString(),
  };
}

module.exports = {
  WalletError,
  toBigIntPaisa,
  percentToBasisPoints,
  roundPercentOf,
  getMoneySettings,
  ensureWallet,
  creditWallet,
  debitWallet,
  computeDepositAmount,
  computeCommissionAmount,
  getActiveDeposit,
  getUnlockMapForListings,
  canUnlockListing,
  maskListingContact,
  placeListingDeposit,
  releaseDeposit,
  getSettlementPrice,
  getCommissionCoverage,
  captureCommissionForTransaction,
  serializeWallet,
  serializeDeposit,
};
