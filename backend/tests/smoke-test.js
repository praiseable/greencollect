#!/usr/bin/env node
/*
 * Kabariya v3 smoke test.
 * Runs against the configured runtime database. It does not mock Prisma or wallet services.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke_access_secret_'.padEnd(72, 'x');
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'smoke_refresh_secret_'.padEnd(72, 'y');
process.env.PORT = process.env.PORT || '0';

const prisma = require('../src/services/prisma');
const { ensureWallet, creditWallet, placeListingDeposit } = require('../src/services/wallet.service');

const mark = {
  pass: '\x1b[32mPASSED\x1b[0m',
  fail: '\x1b[31mFAILED\x1b[0m',
};

function unique(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function smokePhone(seed = 0) {
  const n = String((Date.now() + seed + Math.floor(Math.random() * 1000)) % 10_000_000).padStart(7, '0');
  return `+92300${n}`;
}

async function ensureConfig(key, value) {
  await prisma.platformConfig.upsert({ where: { key }, update: { value }, create: { id: key, key, value, label: key } });
}

async function ensureCoreData() {
  await prisma.language.upsert({ where: { id: 'en' }, update: { name: 'English', nativeName: 'English', direction: 'LTR', isActive: true, isDefault: true }, create: { id: 'en', name: 'English', nativeName: 'English', direction: 'LTR', isActive: true, isDefault: true } });
  await prisma.currency.upsert({ where: { id: 'PKR' }, update: { name: 'Pakistani Rupee', nativeName: 'Pakistani Rupee', symbol: '₨', symbolNative: '₨', isActive: true, isDefault: true }, create: { id: 'PKR', name: 'Pakistani Rupee', nativeName: 'Pakistani Rupee', symbol: '₨', symbolNative: '₨', isActive: true, isDefault: true } });
  await prisma.country.upsert({ where: { id: 'PK' }, update: { name: 'Pakistan', nativeName: 'پاکستان', phoneCode: '+92', phoneFormat: '3XX-XXXXXXX', defaultCurrencyId: 'PKR', defaultLanguageId: 'en', timezone: 'Asia/Karachi', isActive: true, isDefault: true }, create: { id: 'PK', name: 'Pakistan', nativeName: 'پاکستان', phoneCode: '+92', phoneFormat: '3XX-XXXXXXX', defaultCurrencyId: 'PKR', defaultLanguageId: 'en', timezone: 'Asia/Karachi', isActive: true, isDefault: true } });
  const category = await prisma.category.upsert({ where: { slug: 'smoke-metals' }, update: { isActive: true }, create: { slug: 'smoke-metals', icon: 'metal', colorHex: '#777777', isActive: true } });
  await prisma.categoryTranslation.upsert({ where: { categoryId_languageId: { categoryId: category.id, languageId: 'en' } }, update: { name: 'Smoke Metals' }, create: { categoryId: category.id, languageId: 'en', name: 'Smoke Metals' } });
  const unit = await prisma.unit.upsert({ where: { slug: 'smoke-kg' }, update: { isActive: true }, create: { slug: 'smoke-kg', type: 'WEIGHT', isBaseUnit: true, conversionFactor: 1, isActive: true } });
  await prisma.unitTranslation.upsert({ where: { unitId_languageId: { unitId: unit.id, languageId: 'en' } }, update: { name: 'Kilogram', abbreviation: 'kg' }, create: { unitId: unit.id, languageId: 'en', name: 'Kilogram', abbreviation: 'kg' } });
  const zone = await prisma.geoZone.upsert({ where: { slug: 'smoke-karachi' }, update: { isActive: true, latitude: 24.8607, longitude: 67.0011 }, create: { name: 'Smoke Karachi', slug: 'smoke-karachi', type: 'CITY', countryId: 'PK', latitude: 24.8607, longitude: 67.0011, isActive: true } });
  await Promise.all([
    ensureConfig('deposit_percent', '5'),
    ensureConfig('deposit_min_flat_paisa', '50000'),
    ensureConfig('commission_rate_percent', '5'),
    ensureConfig('deposit_hold_expiry_days', '14'),
  ]);
  return { category, unit, zone };
}

async function createUser(kind, seed) {
  const user = await prisma.user.create({
    data: {
      firstName: `Smoke ${kind}`,
      lastName: 'User',
      displayName: `Smoke ${kind} User`,
      email: `${unique(kind)}@smoke.test`,
      phone: smokePhone(seed),
      role: 'CUSTOMER',
      isVerified: true,
      isActive: true,
      accountStatus: 'ACTIVE',
      countryId: 'PK',
      currencyId: 'PKR',
      languageId: 'en',
    },
  });
  await ensureWallet(user.id);
  return user;
}

async function step(name, fn) {
  try {
    const result = await fn();
    console.log(`${mark.pass} ${name}`);
    return result;
  } catch (err) {
    console.error(`${mark.fail} ${name}`);
    console.error(err?.stack || err?.message || err);
    process.exitCode = 1;
    throw err;
  }
}

(async () => {
  const refs = await ensureCoreData();
  let buyer;
  let seller;
  let listing;

  await step('1. Onboard smoke buyer and seller with zero-balance wallets', async () => {
    buyer = await createUser('buyer', 1);
    seller = await createUser('seller', 2);
    const buyerWallet = await prisma.wallet.findUnique({ where: { userId: buyer.id } });
    const sellerWallet = await prisma.wallet.findUnique({ where: { userId: seller.id } });
    if (!buyerWallet || !sellerWallet) throw new Error('Wallet auto-creation failed');
  });

  await step('2. Create a free seller listing', async () => {
    listing = await prisma.listing.create({
      data: {
        title: `Smoke Copper Scrap ${unique('listing')}`,
        description: 'Smoke test listing',
        categoryId: refs.category.id,
        pricePaisa: 1_000_000n,
        currencyId: 'PKR',
        quantity: 100,
        unitId: refs.unit.id,
        sellerId: seller.id,
        geoZoneId: refs.zone.id,
        latitude: 24.8607,
        longitude: 67.0011,
        address: 'Smoke exact address',
        cityName: refs.zone.name,
        countryId: 'PK',
        contactNumber: seller.phone,
        visibilityLevel: 'PUBLIC',
        status: 'ACTIVE',
      },
    });
    if (!listing.id) throw new Error('Listing creation returned no id');
  });

  await step('3. Top up buyer wallet and place buyer-funded deposit', async () => {
    await creditWallet(buyer.id, 100_000n, { referenceType: 'TOPUP', note: 'Smoke test top-up' });
    const { deposit, requiredDepositPaisa } = await placeListingDeposit(listing.id, buyer.id);
    if (deposit.status !== 'HELD') throw new Error(`Expected HELD deposit, received ${deposit.status}`);
    if (requiredDepositPaisa !== 50_000n) throw new Error(`Expected 50,000 paisa deposit, received ${requiredDepositPaisa}`);
    const wallet = await prisma.wallet.findUnique({ where: { userId: buyer.id } });
    if (wallet.availableBalancePaisa !== 50_000n || wallet.escrowedBalancePaisa !== 50_000n) {
      throw new Error(`Unexpected wallet balances: available=${wallet.availableBalancePaisa}, escrow=${wallet.escrowedBalancePaisa}`);
    }
  });

  if (!process.exitCode) {
    console.log('\nSmoke test summary: PASSED 3/3 steps');
  }
})()
  .catch(() => {})
  .finally(async () => {
    await prisma.$disconnect();
  });
