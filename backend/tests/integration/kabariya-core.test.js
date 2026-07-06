process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_access_secret_'.padEnd(72, 'x');
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_'.padEnd(72, 'y');
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/greencollect_test?schema=public';
process.env.PORT = process.env.PORT || '0';
process.env.ALLOW_TEST_TOPUP = 'true';
process.env.ALLOW_TEST_HANDSHAKE_OTP = 'true';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, server } = require('../../src/index');
const prisma = require('../../src/services/prisma');
const { creditWallet } = require('../../src/services/wallet.service');

function unique(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function phone(seed = 0) {
  const n = String((Date.now() + seed + Math.floor(Math.random() * 1000)) % 10_000_000).padStart(7, '0');
  return `0300${n}`;
}

async function ensureConfig(key, value) {
  return prisma.platformConfig.upsert({
    where: { key },
    update: { value },
    create: { id: key, key, value, label: key },
  });
}

async function ensureCoreData() {
  await prisma.language.upsert({
    where: { id: 'en' },
    update: { name: 'English', nativeName: 'English', direction: 'LTR', isActive: true, isDefault: true },
    create: { id: 'en', name: 'English', nativeName: 'English', direction: 'LTR', isActive: true, isDefault: true },
  });
  await prisma.currency.upsert({
    where: { id: 'PKR' },
    update: { name: 'Pakistani Rupee', nativeName: 'Pakistani Rupee', symbol: '₨', symbolNative: '₨', decimalDigits: 2, isActive: true, isDefault: true },
    create: { id: 'PKR', name: 'Pakistani Rupee', nativeName: 'Pakistani Rupee', symbol: '₨', symbolNative: '₨', decimalDigits: 2, isActive: true, isDefault: true },
  });
  await prisma.country.upsert({
    where: { id: 'PK' },
    update: { name: 'Pakistan', nativeName: 'پاکستان', phoneCode: '+92', phoneFormat: '3XX-XXXXXXX', defaultCurrencyId: 'PKR', defaultLanguageId: 'en', timezone: 'Asia/Karachi', isActive: true, isDefault: true },
    create: { id: 'PK', name: 'Pakistan', nativeName: 'پاکستان', phoneCode: '+92', phoneFormat: '3XX-XXXXXXX', defaultCurrencyId: 'PKR', defaultLanguageId: 'en', timezone: 'Asia/Karachi', isActive: true, isDefault: true },
  });
  const category = await prisma.category.upsert({
    where: { slug: 'test-metals' },
    update: { isActive: true },
    create: { slug: 'test-metals', icon: 'metal', colorHex: '#777777', sortOrder: 1, isActive: true },
  });
  await prisma.categoryTranslation.upsert({
    where: { categoryId_languageId: { categoryId: category.id, languageId: 'en' } },
    update: { name: 'Test Metals' },
    create: { categoryId: category.id, languageId: 'en', name: 'Test Metals' },
  });
  const unit = await prisma.unit.upsert({
    where: { slug: 'kg-test' },
    update: { isActive: true },
    create: { slug: 'kg-test', type: 'WEIGHT', isBaseUnit: true, conversionFactor: 1, isActive: true, sortOrder: 1 },
  });
  await prisma.unitTranslation.upsert({
    where: { unitId_languageId: { unitId: unit.id, languageId: 'en' } },
    update: { name: 'Kilogram', abbreviation: 'kg' },
    create: { unitId: unit.id, languageId: 'en', name: 'Kilogram', abbreviation: 'kg' },
  });
  const zone = await prisma.geoZone.upsert({
    where: { slug: 'karachi-test-zone' },
    update: { isActive: true, latitude: 24.8607, longitude: 67.0011 },
    create: { name: 'Karachi Test Zone', slug: 'karachi-test-zone', type: 'CITY', countryId: 'PK', latitude: 24.8607, longitude: 67.0011, isActive: true },
  });

  await Promise.all([
    ensureConfig('deposit_percent', '5'),
    ensureConfig('deposit_min_flat_paisa', '50000'),
    ensureConfig('commission_rate_percent', '5'),
    ensureConfig('deposit_hold_expiry_days', '14'),
    ensureConfig('handshake_otp_expiry_min', '30'),
    ensureConfig('disintermediation_ratio_threshold', '0.35'),
    ensureConfig('disintermediation_window_size', '10'),
  ]);

  return { category, unit, zone };
}

async function registerUser(prefix) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      firstName: prefix,
      lastName: 'Tester',
      email: `${unique(prefix)}@example.test`,
      phone: phone(Math.floor(Math.random() * 9999)),
      password: 'Password123!',
    })
    .expect(201);
  return { user: res.body.data.user, token: res.body.data.accessToken };
}

async function createListing(sellerToken, refs, overrides = {}) {
  const res = await request(app)
    .post('/api/listings')
    .set('Authorization', `Bearer ${sellerToken}`)
    .send({
      title: overrides.title || `Copper Scrap ${unique('listing')}`,
      description: 'Integration test listing',
      categoryId: refs.category.id,
      pricePaisa: overrides.pricePaisa || '1000000',
      quantity: overrides.quantity || 100,
      unitId: refs.unit.id,
      geoZoneId: refs.zone.id,
      latitude: 24.8607,
      longitude: 67.0011,
      address: 'Exact integration-test pickup address',
      contactNumber: '+923001234567',
    })
    .expect(201);
  const listingId = res.body.id;
  await prisma.listing.update({ where: { id: listingId }, data: { visibilityLevel: 'PUBLIC' } });
  return prisma.listing.findUnique({ where: { id: listingId } });
}

async function createFundedDeal({ buyerTopupPaisa = 1_000_000n, listingPricePaisa = 1_000_000n, offerPaisa = 1_000_000n } = {}) {
  const refs = await ensureCoreData();
  const seller = await registerUser('seller');
  const buyer = await registerUser('buyer');
  await request(app).post('/api/payments/wallet/topup').set('Authorization', `Bearer ${buyer.token}`).send({ amountPaisa: buyerTopupPaisa.toString(), gateway: 'JAZZCASH', gatewayRef: unique('gw') }).expect(200);
  const listing = await createListing(seller.token, refs, { pricePaisa: listingPricePaisa.toString() });
  await request(app).post(`/api/listings/${listing.id}/deposit`).set('Authorization', `Bearer ${buyer.token}`).send().expect(201);
  const offer = await request(app).post('/api/transactions').set('Authorization', `Bearer ${buyer.token}`).send({ listingId: listing.id, offeredPricePaisa: offerPaisa.toString(), quantity: 100, message: 'Funded test offer' }).expect(201);
  const transactionId = offer.body.transaction.id;
  await request(app).put(`/api/transactions/${transactionId}/accept`).set('Authorization', `Bearer ${seller.token}`).send().expect(200);
  return { refs, seller, buyer, listing, transactionId };
}

async function createAdminToken() {
  const email = `${unique('admin')}@example.test`;
  const admin = await prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'Tester',
      email,
      phone: `+92${phone(999).slice(1)}`,
      role: 'SUPER_ADMIN',
      isVerified: true,
      isActive: true,
      accountStatus: 'ACTIVE',
      languageId: 'en',
      currencyId: 'PKR',
      countryId: 'PK',
    },
  });
  const token = jwt.sign({ sub: admin.id, email, portal: 'admin', roles: ['SUPER_ADMIN'] }, process.env.JWT_SECRET, { expiresIn: '15m' });
  return { admin, token };
}

beforeAll(async () => {
  await ensureCoreData();
});

afterAll(async () => {
  await prisma.$disconnect();
  if (server && server.listening) server.close();
});

describe('Kabariya v3 buyer-funded deposit model integration', () => {
  test('core happy path: register → top-up → deposit → offer → variance → handshake → finalization captures commission on actual price', async () => {
    const { seller, buyer, listing, transactionId } = await createFundedDeal({
      buyerTopupPaisa: 1_000_000n,
      listingPricePaisa: 1_000_000n,
      offerPaisa: 1_000_000n,
    });

    const unlocked = await request(app).get(`/api/listings/${listing.id}`).set('Authorization', `Bearer ${buyer.token}`).expect(200);
    expect(unlocked.body.listing.contactUnlocked).toBe(true);
    expect(unlocked.body.listing.seller.phone).toBeTruthy();
    expect(unlocked.body.listing.address).toBeTruthy();

    const amend = await request(app)
      .post(`/api/transactions/${transactionId}/amend-weight`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ actualQuantity: 80, actualPricePaisa: '800000' })
      .expect(200);
    expect(amend.body.transaction.verificationStatus).toBe('AMENDED');
    expect(amend.body.coverage.commissionPaisa).toBe('40000');

    await request(app).post(`/api/transactions/${transactionId}/acknowledge-amendment`).set('Authorization', `Bearer ${seller.token}`).send().expect(200);
    const otpRes = await request(app).post(`/api/transactions/${transactionId}/handshake/generate`).set('Authorization', `Bearer ${seller.token}`).send().expect(200);
    expect(otpRes.body.otp).toMatch(/^\d{6}$/);

    const finalized = await request(app)
      .post(`/api/transactions/${transactionId}/verify-handshake`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ otp: otpRes.body.otp })
      .expect(200);

    expect(finalized.body.transaction.status).toBe('FINALIZED');
    expect(finalized.body.transaction.verificationStatus).toBe('FINALIZED');
    expect(finalized.body.capture.commissionPaisa).toBe('40000');
    expect(finalized.body.capture.refundPaisa).toBe('10000');
    expect(finalized.body.bond.settlementPricePaisa).toBe('800000');

    const wallet = await prisma.wallet.findUnique({ where: { userId: buyer.user.id } });
    expect(wallet.availableBalancePaisa.toString()).toBe('960000');
    expect(wallet.escrowedBalancePaisa.toString()).toBe('0');

    const sellerWallet = await prisma.wallet.findUnique({ where: { userId: seller.user.id } });
    expect(sellerWallet.availableBalancePaisa.toString()).toBe('0');
    expect(sellerWallet.escrowedBalancePaisa.toString()).toBe('0');
  });

  test('insufficient deposit boundary: 1 paisa below required deposit rejects and writes no new ledger row', async () => {
    const refs = await ensureCoreData();
    const seller = await registerUser('seller-lowfund');
    const buyer = await registerUser('buyer-lowfund');
    const listing = await createListing(seller.token, refs, { pricePaisa: '1000000' });
    await request(app).post('/api/payments/wallet/topup').set('Authorization', `Bearer ${buyer.token}`).send({ amountPaisa: '49999', gateway: 'JAZZCASH', gatewayRef: unique('gw') }).expect(200);

    const wallet = await prisma.wallet.findUnique({ where: { userId: buyer.user.id } });
    const before = await prisma.walletLedger.count({ where: { walletId: wallet.id } });

    const res = await request(app).post(`/api/listings/${listing.id}/deposit`).set('Authorization', `Bearer ${buyer.token}`).send().expect(402);
    expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');
    const after = await prisma.walletLedger.count({ where: { walletId: wallet.id } });
    expect(after).toBe(before);
  });

  test('data-leak boundary: seller phone, exact address, and precise coordinates are masked without a deposit', async () => {
    const refs = await ensureCoreData();
    const seller = await registerUser('seller-mask');
    const buyer = await registerUser('buyer-mask');
    const listing = await createListing(seller.token, refs, { pricePaisa: '1000000' });

    const anon = await request(app).get(`/api/listings/${listing.id}`).expect(200);
    expect(anon.body.listing.seller.phone).toBeNull();
    expect(anon.body.listing.contactNumber).toBeNull();
    expect(anon.body.listing.address).toBeNull();
    expect(anon.body.listing.latitude).toBeNull();
    expect(anon.body.listing.longitude).toBeNull();

    const authed = await request(app).get(`/api/listings/${listing.id}`).set('Authorization', `Bearer ${buyer.token}`).expect(200);
    expect(authed.body.listing.seller.phone).toBeNull();
    expect(authed.body.listing.contactNumber).toBeNull();
    expect(authed.body.listing.address).toBeNull();
    expect(authed.body.listing.latitude).toBeNull();
    expect(authed.body.listing.longitude).toBeNull();
  });

  test('variance insufficient-funds boundary blocks handshake/finalization and dispatches top-up notification', async () => {
    const { buyer, transactionId } = await createFundedDeal({ buyerTopupPaisa: 50_000n, listingPricePaisa: 1_000_000n, offerPaisa: 1_000_000n });

    const res = await request(app)
      .post(`/api/transactions/${transactionId}/amend-weight`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ actualQuantity: 300, actualPricePaisa: '2000000' })
      .expect(402);

    expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS_FOR_VARIANCE');
    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    expect(tx.status).not.toBe('FINALIZED');
    expect(tx.verificationStatus).toBe('AMENDED');
    const notification = await prisma.notification.findFirst({ where: { userId: buyer.user.id, title: 'Top-up required to finalize deal' } });
    expect(notification).toBeTruthy();
  });

  test('handshake abuse boundary: five wrong OTPs lock the transaction, then unlock clears after the window', async () => {
    const { seller, buyer, transactionId } = await createFundedDeal({ buyerTopupPaisa: 1_000_000n, listingPricePaisa: 1_000_000n, offerPaisa: 1_000_000n });
    const otpRes = await request(app).post(`/api/transactions/${transactionId}/handshake/generate`).set('Authorization', `Bearer ${seller.token}`).send().expect(200);
    const wrongOtp = otpRes.body.otp === '000000' ? '999999' : '000000';

    for (let i = 0; i < 5; i += 1) {
      await request(app).post(`/api/transactions/${transactionId}/verify-handshake`).set('Authorization', `Bearer ${buyer.token}`).send({ otp: wrongOtp }).expect(400);
    }
    await request(app).post(`/api/transactions/${transactionId}/verify-handshake`).set('Authorization', `Bearer ${buyer.token}`).send({ otp: otpRes.body.otp }).expect(423);

    await prisma.transaction.update({ where: { id: transactionId }, data: { handshakeLockedUntil: new Date(Date.now() - 1000), handshakeAttemptCount: 0 } });
    const cleared = await request(app).post(`/api/transactions/${transactionId}/verify-handshake`).set('Authorization', `Bearer ${buyer.token}`).send({ otp: otpRes.body.otp }).expect(200);
    expect(cleared.body.transaction.status).toBe('FINALIZED');
  });

  test('disintermediation flagging boundary creates review queue entry only, with no automatic penalty', async () => {
    const refs = await ensureCoreData();
    const buyer = await registerUser('buyer-flag');
    const seller = await registerUser('seller-flag');
    await creditWallet(buyer.user.id, 1_000_000n, { referenceType: 'TOPUP', note: 'Test flag funding' });
    await prisma.adminFlaggedUser.deleteMany({ where: { userId: buyer.user.id } });

    const expired = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (let i = 0; i < 4; i += 1) {
      const listing = await createListing(seller.token, refs, { pricePaisa: '1000000', title: `Cancelled source ${i} ${unique('flag')}` });
      await prisma.listingDeposit.create({
        data: {
          listingId: listing.id,
          buyerId: buyer.user.id,
          amountPaisa: 50000n,
          status: 'RELEASED',
          heldAt: new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000),
          releasedAt: expired,
          expiresAt: expired,
        },
      });
    }

    const admin = await createAdminToken();
    const scan = await request(app).post('/api/admin/flagged-users/scan').set('Authorization', `Bearer ${admin.token}`).send().expect(200);
    expect(scan.body.created).toBeGreaterThanOrEqual(1);

    const flag = await prisma.adminFlaggedUser.findFirst({ where: { userId: buyer.user.id, reason: 'SUSPECTED_PLATFORM_DISINTERMEDIATION' } });
    expect(flag).toBeTruthy();
    expect(flag.metrics.cancelCount).toBe(4);
    expect(flag.metrics.unlockCount).toBe(4);

    const buyerAfter = await prisma.user.findUnique({ where: { id: buyer.user.id }, include: { wallet: true } });
    expect(buyerAfter.accountStatus).toBe('ACTIVE');
    expect(buyerAfter.wallet.availableBalancePaisa.toString()).toBe('1000000');
  });
});
