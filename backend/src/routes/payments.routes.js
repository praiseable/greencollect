const crypto = require('crypto');
const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate } = require('../middleware/auth');
const {
  ensureWallet,
  writeLedger,
  creditWallet,
  serializeWallet,
  toBigIntPaisa,
  WalletError,
} = require('../services/wallet.service');

const VALID_GATEWAYS = new Set(['JAZZCASH', 'EASYPAISA', 'STRIPE', 'BANK_TRANSFER', 'WALLET']);
const VALID_PURPOSES = new Set(['SUBSCRIPTION', 'TRANSACTION', 'WALLET_TOPUP']);

function serializePayment(payment) {
  if (!payment) return null;
  return {
    ...payment,
    amountPaisa: payment.amountPaisa?.toString?.() ?? String(payment.amountPaisa),
  };
}

function normalizeGateway(value) {
  const gateway = String(value || '').trim().toUpperCase().replace(/-/g, '_');
  if (!VALID_GATEWAYS.has(gateway)) {
    throw new WalletError('Unsupported payment gateway', 'UNSUPPORTED_GATEWAY', 400, { gateway });
  }
  return gateway;
}

function pick(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function getWebhookSecret(gateway) {
  return process.env[`${gateway}_WEBHOOK_SECRET`]
    || process.env.PAYMENT_WEBHOOK_SECRET
    || process.env.WEBHOOK_SECRET
    || process.env.JWT_SECRET;
}

function safeCompare(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function getSignature(req, gateway) {
  const headers = req.headers || {};
  return headers['x-kabariya-signature']
    || headers['x-webhook-signature']
    || headers[`x-${gateway.toLowerCase()}-signature`]
    || headers['x-jazzcash-signature']
    || headers['x-easypaisa-signature']
    || headers['stripe-signature']
    || headers['x-stripe-signature'];
}

function verifyWebhookSignature(req, gateway) {
  const secret = getWebhookSecret(gateway);
  if (!secret) {
    return { ok: false, status: 500, code: 'PAYMENT_WEBHOOK_SECRET_MISSING', message: 'Payment webhook secret is not configured' };
  }

  const supplied = String(getSignature(req, gateway) || '').trim();
  if (!supplied) {
    return { ok: false, status: 400, code: 'WEBHOOK_SIGNATURE_REQUIRED', message: 'Webhook signature header is required' };
  }

  const raw = req.rawBody || JSON.stringify(req.body || {});
  const hex = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const expected = `sha256=${hex}`;
  const suppliedHex = supplied.startsWith('sha256=') ? supplied.slice('sha256='.length) : supplied;

  if (!safeCompare(supplied, expected) && !safeCompare(suppliedHex, hex)) {
    return { ok: false, status: 400, code: 'INVALID_WEBHOOK_SIGNATURE', message: 'Invalid payment webhook signature' };
  }

  return { ok: true };
}

function normalizeStatus(gateway, body, object) {
  const raw = String(pick(
    body.status,
    body.paymentStatus,
    body.pp_ResponseCode === '000' ? 'COMPLETED' : undefined,
    body.pp_ResponseCode ? 'FAILED' : undefined,
    body.event,
    body.type,
    object.status,
  ) || '').toUpperCase();

  if (['COMPLETED', 'SUCCESS', 'SUCCEEDED', 'PAID', 'PAYMENT_INTENT.SUCCEEDED'].includes(raw)) return 'COMPLETED';
  if (['PROCESSING', 'PENDING', 'REQUIRES_CAPTURE'].includes(raw)) return 'PROCESSING';
  if (['FAILED', 'FAILURE', 'CANCELLED', 'CANCELED', 'PAYMENT_INTENT.PAYMENT_FAILED'].includes(raw)) return 'FAILED';
  if (gateway === 'STRIPE' && body.type === 'payment_intent.succeeded') return 'COMPLETED';
  if (gateway === 'STRIPE' && body.type === 'payment_intent.payment_failed') return 'FAILED';
  return raw || 'COMPLETED';
}

function normalizeWebhookPayload(gateway, body = {}) {
  const object = body?.data?.object && typeof body.data.object === 'object' ? body.data.object : body;
  const metadata = {
    ...(body.metadata && typeof body.metadata === 'object' ? body.metadata : {}),
    ...(object.metadata && typeof object.metadata === 'object' ? object.metadata : {}),
  };

  const gatewayRef = String(pick(
    body.gatewayRef,
    body.gateway_ref,
    body.txnRefNo,
    body.transactionRef,
    body.transactionId,
    body.pp_TxnRefNo,
    object.gatewayRef,
    object.id,
    body.id,
  ) || '').trim();

  const userId = String(pick(body.userId, body.user_id, metadata.userId, metadata.user_id, object.userId) || '').trim();
  const rawAmount = pick(body.amountPaisa, body.amount_paisa, metadata.amountPaisa, metadata.amount_paisa, object.amountPaisa, object.amount_received, object.amount);
  const currencyId = String(pick(body.currencyId, body.currency_id, body.currency, object.currency, 'PKR')).toUpperCase();
  const purposeRaw = String(pick(body.purpose, metadata.purpose, 'WALLET_TOPUP')).toUpperCase();
  const purpose = VALID_PURPOSES.has(purposeRaw) ? purposeRaw : 'WALLET_TOPUP';
  const status = normalizeStatus(gateway, body, object);
  const exchangeRateSnapshot = pick(body.exchangeRateSnapshot, body.exchange_rate_snapshot, body.exchangeRate, metadata.exchangeRate, object.exchange_rate);

  return {
    gateway,
    gatewayRef,
    userId,
    amountPaisa: rawAmount,
    currencyId,
    purpose,
    status,
    exchangeRateSnapshot,
    metadata: {
      ...metadata,
      gatewayPayloadType: body.type || body.event || null,
      receivedAt: new Date().toISOString(),
    },
  };
}

async function recordFailedOrProcessingPayment(normalized) {
  const existing = normalized.gatewayRef
    ? await prisma.payment.findFirst({ where: { gateway: normalized.gateway, gatewayRef: normalized.gatewayRef } })
    : null;

  if (existing?.status === 'COMPLETED') {
    return { payment: existing, idempotent: true, credited: false };
  }

  if (existing) {
    const payment = await prisma.payment.update({
      where: { id: existing.id },
      data: {
        status: normalized.status === 'FAILED' ? 'FAILED' : 'PROCESSING',
        metadata: { ...(existing.metadata || {}), ...normalized.metadata, webhookStatus: normalized.status },
      },
    });
    return { payment, idempotent: false, credited: false };
  }

  if (!normalized.userId || !normalized.amountPaisa || !normalized.gatewayRef) {
    return { payment: null, idempotent: false, credited: false };
  }

  const payment = await prisma.payment.create({
    data: {
      userId: normalized.userId,
      gateway: normalized.gateway,
      gatewayRef: normalized.gatewayRef,
      amountPaisa: toBigIntPaisa(normalized.amountPaisa),
      currencyId: normalized.currencyId,
      status: normalized.status === 'FAILED' ? 'FAILED' : 'PROCESSING',
      purpose: normalized.purpose,
      metadata: { ...normalized.metadata, webhookStatus: normalized.status, exchangeRateSnapshot: normalized.exchangeRateSnapshot || null },
    },
  });
  return { payment, idempotent: false, credited: false };
}

async function creditWalletFromVerifiedPayment(normalized) {
  const amount = toBigIntPaisa(normalized.amountPaisa);
  if (!normalized.gatewayRef) throw new WalletError('gatewayRef is required', 'GATEWAY_REF_REQUIRED', 400);
  if (!normalized.userId) throw new WalletError('userId is required for wallet top-up webhooks', 'USER_ID_REQUIRED', 400);
  if (amount <= 0n) throw new WalletError('amountPaisa must be greater than zero', 'INVALID_AMOUNT', 400);

  return prisma.$transaction(async (tx) => {
    let payment = await tx.payment.findFirst({
      where: { gateway: normalized.gateway, gatewayRef: normalized.gatewayRef },
    });

    if (payment?.status === 'COMPLETED') {
      const wallet = await ensureWallet(payment.userId, tx);
      return { payment, wallet, idempotent: true, credited: false };
    }

    if (payment) {
      if (payment.userId !== normalized.userId) {
        throw new WalletError('Payment webhook user mismatch', 'PAYMENT_USER_MISMATCH', 409);
      }
      if (payment.amountPaisa !== amount) {
        throw new WalletError('Payment webhook amount mismatch', 'PAYMENT_AMOUNT_MISMATCH', 409, {
          expectedAmountPaisa: payment.amountPaisa.toString(),
          receivedAmountPaisa: amount.toString(),
        });
      }
      payment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PROCESSING',
          metadata: { ...(payment.metadata || {}), ...normalized.metadata, exchangeRateSnapshot: normalized.exchangeRateSnapshot || null },
        },
      });
    } else {
      payment = await tx.payment.create({
        data: {
          userId: normalized.userId,
          gateway: normalized.gateway,
          gatewayRef: normalized.gatewayRef,
          amountPaisa: amount,
          currencyId: normalized.currencyId,
          status: 'PROCESSING',
          purpose: normalized.purpose,
          metadata: { ...normalized.metadata, exchangeRateSnapshot: normalized.exchangeRateSnapshot || null },
        },
      });
    }

    const wallet = await ensureWallet(normalized.userId, tx);
    const available = (wallet.availableBalancePaisa ?? wallet.balancePaisa ?? 0n) + amount;
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { availableBalancePaisa: available, balancePaisa: available },
    });

    await writeLedger(tx, updatedWallet, {
      type: 'CREDIT',
      amountPaisa: amount,
      referenceType: 'TOPUP',
      referenceId: payment.id,
      note: `Verified ${normalized.gateway} wallet top-up webhook`,
      metadata: {
        gateway: normalized.gateway,
        gatewayRef: normalized.gatewayRef,
        paymentId: payment.id,
        purpose: normalized.purpose,
        exchangeRateSnapshot: normalized.exchangeRateSnapshot || null,
      },
    });

    payment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        metadata: { ...(payment.metadata || {}), ...normalized.metadata, exchangeRateSnapshot: normalized.exchangeRateSnapshot || null, creditedAt: new Date().toISOString() },
      },
    });

    return { payment, wallet: updatedWallet, idempotent: false, credited: true };
  });
}

async function handlePaymentWebhook(req, res) {
  let gateway;
  try {
    gateway = normalizeGateway(req.params.gateway);
  } catch (err) {
    return res.status(err.status || 400).json({ error: { message: err.message, code: err.code || 'UNSUPPORTED_GATEWAY' } });
  }

  const signature = verifyWebhookSignature(req, gateway);
  if (!signature.ok) {
    return res.status(signature.status).json({ error: { message: signature.message, code: signature.code } });
  }

  try {
    const normalized = normalizeWebhookPayload(gateway, req.body || {});
    if (normalized.status !== 'COMPLETED') {
      const result = await recordFailedOrProcessingPayment(normalized);
      return res.json({
        success: true,
        gateway,
        status: normalized.status,
        credited: false,
        idempotent: result.idempotent,
        payment: serializePayment(result.payment),
      });
    }

    const result = await creditWalletFromVerifiedPayment(normalized);
    return res.json({
      success: true,
      gateway,
      status: 'COMPLETED',
      credited: result.credited,
      idempotent: result.idempotent,
      payment: serializePayment(result.payment),
      wallet: serializeWallet(result.wallet),
    });
  } catch (err) {
    if (err instanceof WalletError) {
      return res.status(err.status).json({ error: { message: err.message, code: err.code, ...err.details } });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ error: { message: 'Duplicate payment gateway reference', code: 'DUPLICATE_GATEWAY_REF' } });
    }
    console.error('Payment webhook error:', err);
    return res.status(500).json({ error: { message: 'Failed to process payment webhook', code: 'INTERNAL_ERROR' } });
  }
}

// POST /payments/webhook/:gateway — signed gateway webhook endpoint.
router.post('/webhook/:gateway', handlePaymentWebhook);
router.post('/:gateway/webhook', handlePaymentWebhook);

// GET /payments/history — Payment history
router.get('/history', authenticate, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(payments.map(serializePayment));
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch payments' } });
  }
});

// POST /payments/jazzcash/initiate — JazzCash payment stub
router.post('/jazzcash/initiate', authenticate, async (req, res) => {
  try {
    const { amountPaisa, purpose, phone } = req.body;
    const amount = toBigIntPaisa(amountPaisa);
    if (amount <= 0n) return res.status(400).json({ error: { message: 'amountPaisa must be greater than zero', code: 'INVALID_AMOUNT' } });
    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        gateway: 'JAZZCASH',
        amountPaisa: amount,
        currencyId: 'PKR',
        status: 'PENDING',
        purpose: VALID_PURPOSES.has(String(purpose || '').toUpperCase()) ? String(purpose).toUpperCase() : 'WALLET_TOPUP',
        metadata: { phone },
      },
    });
    res.json({ payment: serializePayment(payment), redirectUrl: null, message: 'JazzCash integration pending configuration' });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to initiate JazzCash payment' } });
  }
});

// POST /payments/easypaisa/initiate — Easypaisa payment stub
router.post('/easypaisa/initiate', authenticate, async (req, res) => {
  try {
    const { amountPaisa, purpose, msisdn } = req.body;
    const amount = toBigIntPaisa(amountPaisa);
    if (amount <= 0n) return res.status(400).json({ error: { message: 'amountPaisa must be greater than zero', code: 'INVALID_AMOUNT' } });
    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        gateway: 'EASYPAISA',
        amountPaisa: amount,
        currencyId: 'PKR',
        status: 'PENDING',
        purpose: VALID_PURPOSES.has(String(purpose || '').toUpperCase()) ? String(purpose).toUpperCase() : 'WALLET_TOPUP',
        metadata: { msisdn },
      },
    });
    res.json({ payment: serializePayment(payment), message: 'Easypaisa integration pending configuration' });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to initiate Easypaisa payment' } });
  }
});

// POST /payments/stripe/initiate — Stripe fallback payment-intent stub.
router.post('/stripe/initiate', authenticate, async (req, res) => {
  try {
    const { amountPaisa, purpose = 'WALLET_TOPUP', currencyId = 'PKR' } = req.body;
    const amount = toBigIntPaisa(amountPaisa);
    if (amount <= 0n) return res.status(400).json({ error: { message: 'amountPaisa must be greater than zero', code: 'INVALID_AMOUNT' } });
    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        gateway: 'STRIPE',
        amountPaisa: amount,
        currencyId: String(currencyId || 'PKR').toUpperCase(),
        status: 'PENDING',
        purpose: VALID_PURPOSES.has(String(purpose || '').toUpperCase()) ? String(purpose).toUpperCase() : 'WALLET_TOPUP',
        metadata: { provider: 'stripe', mode: 'payment_intent_stub' },
      },
    });
    res.json({ payment: serializePayment(payment), clientSecret: null, message: 'Stripe payment intent integration pending configuration' });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to initiate Stripe payment' } });
  }
});

// POST /payments/wallet/topup — Development/manual top-up through the ledger engine.
// Production payment webhooks must call the same ledger engine after signature verification.
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
