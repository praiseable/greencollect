const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Geo-Franchise Marketplace (Pakistan-first)...\n');

  // ═══════════════════════════════════════════════
  // 1. LANGUAGES
  // ═══════════════════════════════════════════════
  console.log('  1/17 Languages...');
  const languages = [
    { id: 'en', name: 'English', nativeName: 'English', direction: 'LTR', isDefault: false, isActive: true, flagEmoji: '🇬🇧' },
    { id: 'ur', name: 'Urdu', nativeName: 'اردو', direction: 'RTL', isDefault: true, isActive: true, flagEmoji: '🇵🇰' },
    { id: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'RTL', isDefault: false, isActive: false, flagEmoji: '🇸🇦' },
  ];
  for (const l of languages) {
    await prisma.language.upsert({ where: { id: l.id }, update: l, create: l });
  }

  // ═══════════════════════════════════════════════
  // 2. CURRENCIES
  // ═══════════════════════════════════════════════
  console.log('  2/17 Currencies...');
  const currencies = [
    { id: 'PKR', name: 'Pakistani Rupee', nativeName: 'روپیہ', symbol: '₨', symbolNative: 'ر', symbolPosition: 'PREFIX', decimalDigits: 0, isDefault: true, isActive: true },
    { id: 'USD', name: 'US Dollar', nativeName: 'امریکی ڈالر', symbol: '$', symbolNative: '$', symbolPosition: 'PREFIX', decimalDigits: 2, isDefault: false, isActive: false },
    { id: 'AED', name: 'UAE Dirham', nativeName: 'درہم', symbol: 'د.إ', symbolNative: 'د.إ', symbolPosition: 'PREFIX', decimalDigits: 2, isDefault: false, isActive: false },
    { id: 'SAR', name: 'Saudi Riyal', nativeName: 'ریال', symbol: '﷼', symbolNative: '﷼', symbolPosition: 'PREFIX', decimalDigits: 2, isDefault: false, isActive: false },
    { id: 'GBP', name: 'British Pound', nativeName: 'پاؤنڈ', symbol: '£', symbolNative: '£', symbolPosition: 'PREFIX', decimalDigits: 2, isDefault: false, isActive: false },
  ];
  for (const c of currencies) {
    await prisma.currency.upsert({ where: { id: c.id }, update: c, create: c });
  }

  // ═══════════════════════════════════════════════
  // 3. COUNTRIES
  // ═══════════════════════════════════════════════
  console.log('  3/17 Countries...');
  const countries = [
    { id: 'PK', name: 'Pakistan', nativeName: 'پاکستان', phoneCode: '+92', phoneFormat: '3XX-XXXXXXX', defaultCurrencyId: 'PKR', defaultLanguageId: 'ur', timezone: 'Asia/Karachi', isDefault: true, isActive: true },
    { id: 'AE', name: 'UAE', nativeName: 'الإمارات', phoneCode: '+971', phoneFormat: 'XX-XXXXXXX', defaultCurrencyId: 'AED', defaultLanguageId: 'ar', timezone: 'Asia/Dubai', isDefault: false, isActive: false },
    { id: 'SA', name: 'Saudi Arabia', nativeName: 'السعودية', phoneCode: '+966', phoneFormat: 'XX-XXXXXXX', defaultCurrencyId: 'SAR', defaultLanguageId: 'ar', timezone: 'Asia/Riyadh', isDefault: false, isActive: false },
  ];
  for (const c of countries) {
    await prisma.country.upsert({ where: { id: c.id }, update: c, create: c });
  }

  // ═══════════════════════════════════════════════
  // 4. COUNTRY-CURRENCY + COUNTRY-LANGUAGE LINKS
  // ═══════════════════════════════════════════════
  console.log('  4/17 Country links...');
  const ccLinks = [
    { countryId: 'PK', currencyId: 'PKR', isPrimary: true },
    { countryId: 'PK', currencyId: 'USD', isPrimary: false },
  ];
  for (const l of ccLinks) {
    await prisma.countryCurrency.upsert({
      where: { countryId_currencyId: { countryId: l.countryId, currencyId: l.currencyId } },
      update: l, create: l,
    });
  }
  const clLinks = [
    { countryId: 'PK', languageId: 'ur', isPrimary: true },
    { countryId: 'PK', languageId: 'en', isPrimary: false },
  ];
  for (const l of clLinks) {
    await prisma.countryLanguage.upsert({
      where: { countryId_languageId: { countryId: l.countryId, languageId: l.languageId } },
      update: l, create: l,
    });
  }

  // ═══════════════════════════════════════════════
  // 5. UNITS + TRANSLATIONS
  // ═══════════════════════════════════════════════
  console.log('  5/17 Units...');
  const unitsSeed = [
    { slug: 'kg', type: 'WEIGHT', isBaseUnit: true, en: { name: 'Kilogram', abbr: 'kg' }, ur: { name: 'کلوگرام', abbr: 'کلو' } },
    { slug: 'ton', type: 'WEIGHT', en: { name: 'Ton', abbr: 't' }, ur: { name: 'ٹن', abbr: 'ٹن' } },
    { slug: 'gram', type: 'WEIGHT', en: { name: 'Gram', abbr: 'g' }, ur: { name: 'گرام', abbr: 'گرام' } },
    { slug: 'piece', type: 'COUNT', en: { name: 'Piece', abbr: 'pcs' }, ur: { name: 'عدد', abbr: 'عدد' } },
    { slug: 'liter', type: 'VOLUME', en: { name: 'Liter', abbr: 'L' }, ur: { name: 'لیٹر', abbr: 'لٹر' } },
    { slug: 'bundle', type: 'COUNT', en: { name: 'Bundle', abbr: 'bdl' }, ur: { name: 'گٹھا', abbr: 'گٹھا' } },
    { slug: 'bag', type: 'COUNT', en: { name: 'Bag', abbr: 'bag' }, ur: { name: 'بوری', abbr: 'بوری' } },
    { slug: 'truck-load', type: 'COUNT', en: { name: 'Truck Load', abbr: 'truck' }, ur: { name: 'ٹرک بھر', abbr: 'ٹرک' } },
  ];
  const unitIds = {};
  for (const u of unitsSeed) {
    const unit = await prisma.unit.upsert({
      where: { slug: u.slug },
      update: { type: u.type, isBaseUnit: u.isBaseUnit || false },
      create: { slug: u.slug, type: u.type, isBaseUnit: u.isBaseUnit || false, sortOrder: unitsSeed.indexOf(u) },
    });
    unitIds[u.slug] = unit.id;
    // Translations
    for (const lang of ['en', 'ur']) {
      if (u[lang]) {
        await prisma.unitTranslation.upsert({
          where: { unitId_languageId: { unitId: unit.id, languageId: lang } },
          update: { name: u[lang].name, abbreviation: u[lang].abbr },
          create: { unitId: unit.id, languageId: lang, name: u[lang].name, abbreviation: u[lang].abbr },
        });
      }
    }
  }

  // ═══════════════════════════════════════════════
  // 6. CATEGORIES + TRANSLATIONS (Pakistan Catalog)
  // ═══════════════════════════════════════════════
  console.log('  6/17 Categories...');
  const catalogSeed = [
    { slug: 'metals', en: 'Metals', ur: 'دھاتیں', colorHex: '#F59E0B', children: [
      { slug: 'copper', en: 'Copper', ur: 'تانبا', types: [
        { slug: 'copper-wire', en: 'Copper Wire', ur: 'تانبے کی تار' },
        { slug: 'copper-sheet', en: 'Copper Sheet', ur: 'تانبے کی چادر' },
      ]},
      { slug: 'silver', en: 'Silver', ur: 'چاندی' },
      { slug: 'iron', en: 'Iron', ur: 'لوہا', types: [
        { slug: 'iron-scrap', en: 'Iron Scrap', ur: 'لوہے کا کباڑ' },
        { slug: 'steel-rods', en: 'Steel Rods', ur: 'سریا' },
      ]},
      { slug: 'aluminum', en: 'Aluminum', ur: 'ایلومینیم' },
      { slug: 'brass', en: 'Brass', ur: 'پیتل' },
    ]},
    { slug: 'plastics', en: 'Plastics', ur: 'پلاسٹک', colorHex: '#3B82F6', children: [
      { slug: 'plastic-bags', en: 'Plastic Bags', ur: 'پلاسٹک کے تھیلے' },
      { slug: 'plastic-bottles', en: 'Plastic Bottles', ur: 'پلاسٹک کی بوتلیں' },
      { slug: 'plastic-scrap', en: 'Plastic Scrap', ur: 'پلاسٹک کا کچرا' },
    ]},
    { slug: 'paper', en: 'Paper & Cardboard', ur: 'کاغذ اور گتہ', colorHex: '#10B981', children: [
      { slug: 'paper-waste', en: 'Paper Waste', ur: 'ردی کاغذ' },
      { slug: 'hardboard', en: 'Hardboard', ur: 'گتہ' },
      { slug: 'newspapers', en: 'Newspapers', ur: 'اخبارات' },
    ]},
    { slug: 'electronics', en: 'Electronics', ur: 'الیکٹرانکس', colorHex: '#8B5CF6', children: [
      { slug: 'electronic-scrap', en: 'Electronic Scrap', ur: 'الیکٹرانک کباڑ' },
      { slug: 'waste-wires', en: 'Waste Wires', ur: 'بیکار تاریں' },
      { slug: 'batteries', en: 'Batteries', ur: 'بیٹریاں' },
    ]},
    { slug: 'organic', en: 'Organic', ur: 'نامیاتی', colorHex: '#EF4444', children: [
      { slug: 'bones', en: 'Bones', ur: 'ہڈیاں' },
      { slug: 'hairs', en: 'Hair', ur: 'بال' },
    ]},
    { slug: 'furniture', en: 'Furniture', ur: 'فرنیچر', colorHex: '#F97316' },
    { slug: 'household', en: 'Household Items', ur: 'گھریلو اشیاء', colorHex: '#06B6D4', children: [
      { slug: 'home-items', en: 'Home Items', ur: 'گھر کی اشیاء' },
      { slug: 'office-items', en: 'Office Items', ur: 'دفتری اشیاء' },
    ]},
    { slug: 'glass', en: 'Glass', ur: 'شیشہ', colorHex: '#64748B' },
    { slug: 'rubber', en: 'Rubber & Tires', ur: 'ربڑ اور ٹائر', colorHex: '#78716C' },
    { slug: 'textiles', en: 'Textiles & Fabric', ur: 'کپڑے اور تانے بانے', colorHex: '#EC4899' },
  ];

  const categoryIds = {};

  async function seedCategory(cat, parentId = null, order = 0) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { colorHex: cat.colorHex, parentId, sortOrder: order },
      create: { slug: cat.slug, colorHex: cat.colorHex || null, parentId, sortOrder: order },
    });
    categoryIds[cat.slug] = category.id;

    // Translations
    for (const lang of ['en', 'ur']) {
      if (cat[lang]) {
        await prisma.categoryTranslation.upsert({
          where: { categoryId_languageId: { categoryId: category.id, languageId: lang } },
          update: { name: cat[lang] },
          create: { categoryId: category.id, languageId: lang, name: cat[lang] },
        });
      }
    }

    // Product types
    if (cat.types) {
      for (let i = 0; i < cat.types.length; i++) {
        const t = cat.types[i];
        const pt = await prisma.productType.upsert({
          where: { slug: t.slug },
          update: { categoryId: category.id, sortOrder: i },
          create: { slug: t.slug, categoryId: category.id, sortOrder: i },
        });
        for (const lang of ['en', 'ur']) {
          if (t[lang]) {
            await prisma.productTypeTranslation.upsert({
              where: { productTypeId_languageId: { productTypeId: pt.id, languageId: lang } },
              update: { name: t[lang] },
              create: { productTypeId: pt.id, languageId: lang, name: t[lang] },
            });
          }
        }
      }
    }

    // Children
    if (cat.children) {
      for (let i = 0; i < cat.children.length; i++) {
        await seedCategory(cat.children[i], category.id, i);
      }
    }
  }

  for (let i = 0; i < catalogSeed.length; i++) {
    await seedCategory(catalogSeed[i], null, i);
  }

  // ═══════════════════════════════════════════════
  // 7. GEO-ZONES (Pakistan)
  // ═══════════════════════════════════════════════
  console.log('  7/17 Geo-Zones (Pakistan)...');
  const provinces = {
    'Punjab': { lat: 31.1704, lng: 72.7097, cities: [
      { name: 'Lahore', slug: 'lahore', lat: 31.5204, lng: 74.3587, areas: ['Johar Town', 'Gulberg', 'Model Town', 'DHA', 'Iqbal Town'] },
      { name: 'Faisalabad', slug: 'faisalabad', lat: 31.4504, lng: 73.1350 },
      { name: 'Rawalpindi', slug: 'rawalpindi', lat: 33.5651, lng: 73.0169 },
      { name: 'Multan', slug: 'multan', lat: 30.1575, lng: 71.5249 },
      { name: 'Gujranwala', slug: 'gujranwala', lat: 32.1877, lng: 74.1945 },
      { name: 'Sialkot', slug: 'sialkot', lat: 32.4945, lng: 74.5229 },
    ]},
    'Sindh': { lat: 25.8943, lng: 68.5247, cities: [
      { name: 'Karachi', slug: 'karachi', lat: 24.8607, lng: 67.0011, areas: ['Korangi', 'SITE', 'Lyari', 'Saddar', 'Orangi Town', 'Landhi', 'North Karachi', 'Gulshan-e-Iqbal', 'Malir', 'Baldia Town', 'Clifton', 'DHA Karachi'] },
      { name: 'Hyderabad', slug: 'hyderabad', lat: 25.3960, lng: 68.3578 },
      { name: 'Sukkur', slug: 'sukkur', lat: 27.7052, lng: 68.8574 },
    ]},
    'KPK': { lat: 34.9526, lng: 72.3311, cities: [
      { name: 'Peshawar', slug: 'peshawar', lat: 34.0151, lng: 71.5249 },
      { name: 'Abbottabad', slug: 'abbottabad', lat: 34.1688, lng: 73.2215 },
      { name: 'Mardan', slug: 'mardan', lat: 34.1986, lng: 72.0404 },
    ]},
    'Balochistan': { lat: 28.4907, lng: 65.0958, cities: [
      { name: 'Quetta', slug: 'quetta', lat: 30.1798, lng: 66.9750 },
      { name: 'Gwadar', slug: 'gwadar', lat: 25.1264, lng: 62.3225 },
    ]},
    'Islamabad Capital': { lat: 33.6844, lng: 73.0479, cities: [
      { name: 'Islamabad', slug: 'islamabad', lat: 33.6844, lng: 73.0479, areas: ['Bara Kahu', 'G-6', 'G-8', 'F-6', 'F-7', 'F-8', 'G-9', 'G-10', 'G-11', 'I-8', 'I-9', 'I-10', 'Blue Area'] },
    ]},
    'Gilgit-Baltistan': { lat: 35.8026, lng: 74.9832, cities: [
      { name: 'Gilgit', slug: 'gilgit', lat: 35.9208, lng: 74.3144 },
    ]},
    'AJK': { lat: 33.9259, lng: 73.7811, cities: [
      { name: 'Muzaffarabad', slug: 'muzaffarabad', lat: 34.3700, lng: 73.4711 },
    ]},
  };

  // Country zone
  const pkZone = await prisma.geoZone.upsert({
    where: { slug: 'pakistan' },
    update: {},
    create: { name: 'Pakistan', slug: 'pakistan', type: 'COUNTRY', countryId: 'PK', latitude: 30.3753, longitude: 69.3451 },
  });

  for (const [provName, provData] of Object.entries(provinces)) {
    const provSlug = provName.toLowerCase().replace(/\s+/g, '-');
    const province = await prisma.geoZone.upsert({
      where: { slug: provSlug },
      update: {},
      create: { name: provName, slug: provSlug, type: 'PROVINCE', parentId: pkZone.id, countryId: 'PK', latitude: provData.lat, longitude: provData.lng },
    });

    for (const city of provData.cities) {
      const cityZone = await prisma.geoZone.upsert({
        where: { slug: city.slug },
        update: {},
        create: { name: city.name, slug: city.slug, type: 'CITY', parentId: province.id, countryId: 'PK', latitude: city.lat, longitude: city.lng, radiusKm: 30 },
      });

      if (city.areas) {
        for (const area of city.areas) {
          const areaSlug = `${city.slug}-${area.toLowerCase().replace(/[\s-]+/g, '-')}`;
          await prisma.geoZone.upsert({
            where: { slug: areaSlug },
            update: {},
            create: { name: area, slug: areaSlug, type: 'LOCAL_AREA', parentId: cityZone.id, countryId: 'PK', latitude: city.lat, longitude: city.lng, radiusKm: 5 },
          });
        }
      }
    }
  }

  // ═══════════════════════════════════════════════
  // 8. PLATFORM CONFIG
  // ═══════════════════════════════════════════════
  console.log('  8/17 Platform Config...');
  const configs = {
    default_country: 'PK', default_currency: 'PKR', default_language: 'ur',
    default_timezone: 'Asia/Karachi', price_storage_unit: 'paisa',
    primary_payment_gateway: 'JAZZCASH', secondary_payment_gateway: 'EASYPAISA',
    phone_country_code: '+92', kyc_document_type: 'CNIC',
    cnic_validation_enabled: 'true', supported_languages: 'ur,en',
    escalation_phase2_days: '3', escalation_phase3_days: '7',
    escalation_phase4_days: '14', interest_threshold: '5',
    local_dealer_capacity_kg: '500', max_images_per_listing: '5',
    bond_expiry_hours: '24', otp_expiry_seconds: '300',
    subscription_grace_days: '2', price_suggestion_enabled: 'true',
    catalog_version_hash: 'v1',
  };
  for (const [key, value] of Object.entries(configs)) {
    await prisma.platformConfig.upsert({
      where: { key },
      update: { value },
      create: { id: key, key, value, label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
    });
  }

  // ═══════════════════════════════════════════════
  // 9. TRANSLATION STRINGS (EN + UR)
  // ═══════════════════════════════════════════════
  console.log('  9/17 Translation Strings...');
  const translationData = {
    common: {
      'app.name': { en: 'Marketplace', ur: 'مارکیٹ پلیس' },
      'app.tagline': { en: 'Trade Recyclables', ur: 'ری سائیکل تجارت' },
      'nav.home': { en: 'Home', ur: 'ہوم' },
      'nav.listings': { en: 'Listings', ur: 'فہرستیں' },
      'nav.categories': { en: 'Categories', ur: 'زمرے' },
      'nav.profile': { en: 'Profile', ur: 'پروفائل' },
      'nav.notifications': { en: 'Notifications', ur: 'اطلاعات' },
      'action.save': { en: 'Save', ur: 'محفوظ کریں' },
      'action.cancel': { en: 'Cancel', ur: 'منسوخ' },
      'action.delete': { en: 'Delete', ur: 'حذف کریں' },
      'action.edit': { en: 'Edit', ur: 'ترمیم' },
      'action.search': { en: 'Search', ur: 'تلاش' },
      'action.filter': { en: 'Filter', ur: 'فلٹر' },
    },
    auth: {
      'auth.login': { en: 'Login', ur: 'لاگ ان' },
      'auth.register': { en: 'Register', ur: 'رجسٹر کریں' },
      'auth.phone': { en: 'Phone Number', ur: 'فون نمبر' },
      'auth.email': { en: 'Email', ur: 'ای میل' },
      'auth.password': { en: 'Password', ur: 'پاسورڈ' },
      'auth.logout': { en: 'Logout', ur: 'لاگ آؤٹ' },
      'auth.otp': { en: 'Enter OTP', ur: 'OTP درج کریں' },
    },
    listings: {
      'listing.create': { en: 'Create Listing', ur: 'فہرست بنائیں' },
      'listing.price': { en: 'Price', ur: 'قیمت' },
      'listing.quantity': { en: 'Quantity', ur: 'مقدار' },
      'listing.category': { en: 'Category', ur: 'زمرہ' },
      'listing.description': { en: 'Description', ur: 'تفصیل' },
      'listing.location': { en: 'Location', ur: 'مقام' },
      'listing.contact': { en: 'Contact', ur: 'رابطہ' },
      'listing.negotiable': { en: 'Negotiable', ur: 'گفت و شنید' },
    },
    notifications: {
      'notification.new_listing': { en: 'New Listing Posted', ur: 'نئی فہرست شائع ہوئی' },
      'notification.offer_received': { en: 'Offer Received', ur: 'پیشکش موصول ہوئی' },
      'notification.offer_accepted': { en: 'Offer Accepted', ur: 'پیشکش قبول ہوئی' },
      'notification.payment': { en: 'Payment Update', ur: 'ادائیگی اپ ڈیٹ' },
    },
  };

  for (const [namespace, keys] of Object.entries(translationData)) {
    for (const [key, values] of Object.entries(keys)) {
      for (const [lang, value] of Object.entries(values)) {
        await prisma.translation.upsert({
          where: { languageId_namespace_key: { languageId: lang, namespace, key } },
          update: { value, isRTL: lang === 'ur' },
          create: { languageId: lang, namespace, key, value, isRTL: lang === 'ur' },
        });
      }
    }
  }

  // ═══════════════════════════════════════════════
  // 10. SUBSCRIPTION PLANS (PKR)
  // ═══════════════════════════════════════════════
  console.log('  10/17 Subscription Plans...');
  const plans = [
    { name: 'Free', slug: 'free', description: 'Basic free plan', maxListings: 3, maxZones: 1, price: 0 },
    { name: 'Basic Dealer', slug: 'basic-dealer', description: 'For small dealers', maxListings: 20, maxZones: 3, price: 500 },
    { name: 'Pro Dealer', slug: 'pro-dealer', description: 'For active dealers', maxListings: 100, maxZones: 10, price: 2000 },
    { name: 'Franchise', slug: 'franchise', description: 'Franchise package', maxListings: 500, maxZones: 50, price: 10000 },
    { name: 'Enterprise', slug: 'enterprise', description: 'Unlimited access', maxListings: 9999, maxZones: 9999, price: 50000 },
  ];
  for (const p of plans) {
    const plan = await prisma.subscriptionPlan.upsert({
      where: { slug: p.slug },
      update: { name: p.name, description: p.description, maxListings: p.maxListings, maxZones: p.maxZones },
      create: { name: p.name, slug: p.slug, description: p.description, maxListings: p.maxListings, maxZones: p.maxZones, countryId: 'PK' },
    });
    await prisma.subscriptionPrice.upsert({
      where: { planId_currencyId_interval: { planId: plan.id, currencyId: 'PKR', interval: 'MONTHLY' } },
      update: { pricePaisa: BigInt(p.price) },
      create: { planId: plan.id, currencyId: 'PKR', pricePaisa: BigInt(p.price), interval: 'MONTHLY' },
    });
  }

  // ═══════════════════════════════════════════════
  // 11. PAYMENT GATEWAYS
  // ═══════════════════════════════════════════════
  console.log('  11/17 Payment Gateways...');
  const gateways = [
    { gateway: 'JAZZCASH', displayName: 'JazzCash', sortOrder: 0 },
    { gateway: 'EASYPAISA', displayName: 'Easypaisa', sortOrder: 1 },
    { gateway: 'BANK_TRANSFER', displayName: 'Bank Transfer', sortOrder: 2 },
    { gateway: 'STRIPE', displayName: 'Credit/Debit Card', sortOrder: 3 },
    { gateway: 'WALLET', displayName: 'Platform Wallet', sortOrder: 4 },
  ];
  for (const g of gateways) {
    const existing = await prisma.countryPaymentGateway.findFirst({
      where: { countryId: 'PK', gateway: g.gateway },
    });
    if (!existing) {
      await prisma.countryPaymentGateway.create({
        data: { countryId: 'PK', gateway: g.gateway, displayName: g.displayName, sortOrder: g.sortOrder, isActive: true },
      });
    }
  }

  // ═══════════════════════════════════════════════
  // 12. EXCHANGE RATES
  // ═══════════════════════════════════════════════
  console.log('  12/17 Exchange Rates...');
  const rates = [
    { base: 'PKR', target: 'USD', rate: 0.0036 },
    { base: 'PKR', target: 'AED', rate: 0.0132 },
    { base: 'PKR', target: 'SAR', rate: 0.0135 },
    { base: 'PKR', target: 'GBP', rate: 0.0028 },
    { base: 'USD', target: 'PKR', rate: 278.50 },
  ];
  for (const r of rates) {
    await prisma.exchangeRate.upsert({
      where: { baseCurrencyId_targetCurrencyId: { baseCurrencyId: r.base, targetCurrencyId: r.target } },
      update: { rate: r.rate },
      create: { baseCurrencyId: r.base, targetCurrencyId: r.target, rate: r.rate, source: 'MANUAL' },
    });
  }

  // ═══════════════════════════════════════════════
  // 13. USERS (Admin + Test accounts)
  // ═══════════════════════════════════════════════
  console.log('  13/17 Users...');
  // Get Karachi zone for sample users
  const karachiZone = await prisma.geoZone.findUnique({ where: { slug: 'karachi' } });
  const lahoreZone = await prisma.geoZone.findUnique({ where: { slug: 'lahore' } });
  const islamabadZone = await prisma.geoZone.findUnique({ where: { slug: 'islamabad' } });

  const users = [
    { email: 'admin@marketplace.pk', phone: '+929999990001', firstName: 'Super', lastName: 'Admin', role: 'SUPER_ADMIN', password: 'Admin@123456', city: 'Karachi', geoZoneId: karachiZone?.id },
    { email: 'manager@marketplace.pk', phone: '+929999990002', firstName: 'Collection', lastName: 'Manager', role: 'COLLECTION_MANAGER', password: 'Manager@123', city: 'Lahore', geoZoneId: lahoreZone?.id },
    { email: 'regional@marketplace.pk', phone: '+929999990003', firstName: 'Regional', lastName: 'Manager', role: 'REGIONAL_MANAGER', password: 'Regional@123', city: 'Islamabad', geoZoneId: islamabadZone?.id },
    { email: 'dealer@marketplace.pk', phone: '+929999990004', firstName: 'Ahmed', lastName: 'Dealer', role: 'DEALER', password: 'Dealer@123', city: 'Karachi', geoZoneId: karachiZone?.id },
    { email: 'franchise@marketplace.pk', phone: '+929999990005', firstName: 'Ali', lastName: 'Franchise', role: 'FRANCHISE_OWNER', password: 'Franchise@123', city: 'Lahore', geoZoneId: lahoreZone?.id },
    { email: 'customer@marketplace.pk', phone: '+929999990006', firstName: 'Muhammad', lastName: 'Customer', role: 'CUSTOMER', password: 'Customer@123', city: 'Islamabad', geoZoneId: islamabadZone?.id },
    { email: 'wholesale@marketplace.pk', phone: '+929999990007', firstName: 'Imran', lastName: 'Wholesale', role: 'WHOLESALE_BUYER', password: 'Wholesale@123', city: 'Faisalabad' },
    // ── Islamabad Test Accounts (4 bounded area dealers) ──
    { email: 'barakahu@marketplace.pk', phone: '+923001110001', firstName: 'Usman', lastName: 'BaraKahu', role: 'DEALER', password: 'BaraKahu@123', city: 'Islamabad', geoZoneId: null },  // Will be set below
    { email: 'g6dealer@marketplace.pk', phone: '+923001110002', firstName: 'Tariq', lastName: 'G6-Dealer', role: 'DEALER', password: 'G6Dealer@123', city: 'Islamabad', geoZoneId: null },
    { email: 'g8dealer@marketplace.pk', phone: '+923001110003', firstName: 'Kashif', lastName: 'G8-Dealer', role: 'DEALER', password: 'G8Dealer@123', city: 'Islamabad', geoZoneId: null },
    { email: 'isb.franchise@marketplace.pk', phone: '+923001110004', firstName: 'Zubair', lastName: 'Islamabad-Franchise', role: 'FRANCHISE_OWNER', password: 'IsbFranchise@123', city: 'Islamabad', geoZoneId: islamabadZone?.id },
  ];

  const userIds = {};
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash, phone: u.phone, firstName: u.firstName, lastName: u.lastName, role: u.role },
      create: {
        email: u.email, phone: u.phone, passwordHash: hash,
        firstName: u.firstName, lastName: u.lastName,
        displayName: `${u.firstName} ${u.lastName}`,
        role: u.role, isActive: true, isVerified: true,
        countryId: 'PK', currencyId: 'PKR', languageId: 'en',
        city: u.city || null, geoZoneId: u.geoZoneId || null,
      },
    });
    userIds[u.email] = user.id;
  }

  // ═══════════════════════════════════════════════
  // 14. SAMPLE LISTINGS
  // ═══════════════════════════════════════════════
  console.log('  14/17 Sample Listings...');
  const metalsCat = await prisma.category.findUnique({ where: { slug: 'metals' } });
  const copperCat = await prisma.category.findUnique({ where: { slug: 'copper' } });
  const ironCat = await prisma.category.findUnique({ where: { slug: 'iron' } });
  const plasticsCat = await prisma.category.findUnique({ where: { slug: 'plastics' } });
  const paperCat = await prisma.category.findUnique({ where: { slug: 'paper' } });
  const electronicsCat = await prisma.category.findUnique({ where: { slug: 'electronics' } });
  const furnitureCat = await prisma.category.findUnique({ where: { slug: 'furniture' } });

  const sampleListings = [
    { title: 'Copper Wire Scrap - 50kg Available', desc: 'High quality copper wire scrap from industrial waste. Good purity.', catId: copperCat?.id || metalsCat?.id, price: 125000, qty: 50, unit: 'kg', city: 'Karachi', lat: 24.8607, lng: 67.0011, zone: karachiZone?.id, seller: userIds['dealer@marketplace.pk'] },
    { title: 'Iron Scrap - 500kg Lot', desc: 'Mixed iron scrap from construction site. Ready for pickup.', catId: ironCat?.id || metalsCat?.id, price: 85000, qty: 500, unit: 'kg', city: 'Lahore', lat: 31.5204, lng: 74.3587, zone: lahoreZone?.id, seller: userIds['franchise@marketplace.pk'] },
    { title: 'Plastic Bottles - 100 Bags', desc: 'Clean PET plastic bottles, compressed in bags. Ideal for recycling.', catId: plasticsCat?.id, price: 15000, qty: 100, unit: 'bag', city: 'Karachi', lat: 24.8700, lng: 67.0200, zone: karachiZone?.id, seller: userIds['dealer@marketplace.pk'] },
    { title: 'Old Newspapers - 200kg', desc: 'Clean old newspapers and magazines for recycling.', catId: paperCat?.id, price: 6000, qty: 200, unit: 'kg', city: 'Islamabad', lat: 33.6844, lng: 73.0479, zone: islamabadZone?.id, seller: userIds['customer@marketplace.pk'] },
    { title: 'E-Waste Computer Parts', desc: 'Old computer motherboards, RAM, and other electronic components.', catId: electronicsCat?.id, price: 45000, qty: 30, unit: 'kg', city: 'Lahore', lat: 31.5100, lng: 74.3500, zone: lahoreZone?.id, seller: userIds['franchise@marketplace.pk'] },
    { title: 'Steel Rods - 2 Ton', desc: 'Used steel reinforcement rods from demolished building.', catId: ironCat?.id || metalsCat?.id, price: 350000, qty: 2, unit: 'ton', city: 'Karachi', lat: 24.9000, lng: 67.0800, zone: karachiZone?.id, seller: userIds['wholesale@marketplace.pk'] || userIds['dealer@marketplace.pk'] },
    { title: 'Used Office Furniture Set', desc: 'Complete office furniture including desks, chairs, and cabinets.', catId: furnitureCat?.id, price: 25000, qty: 1, unit: 'piece', city: 'Islamabad', lat: 33.7000, lng: 73.0500, zone: islamabadZone?.id, seller: userIds['customer@marketplace.pk'] },
    { title: 'Aluminum Cans - 50kg', desc: 'Crushed aluminum beverage cans ready for melting.', catId: metalsCat?.id, price: 18000, qty: 50, unit: 'kg', city: 'Lahore', lat: 31.5300, lng: 74.3600, zone: lahoreZone?.id, seller: userIds['dealer@marketplace.pk'] },
    { title: 'Cardboard Boxes - Truckload', desc: 'Large quantity of used cardboard boxes in good condition.', catId: paperCat?.id, price: 12000, qty: 1, unit: 'truck-load', city: 'Faisalabad', lat: 31.4504, lng: 73.1350, zone: null, seller: userIds['franchise@marketplace.pk'] },
    { title: 'Used Tires - 200 Pieces', desc: 'Mixed size used tires suitable for recycling or retreading.', catId: metalsCat?.id, price: 40000, qty: 200, unit: 'piece', city: 'Karachi', lat: 24.8800, lng: 67.0100, zone: karachiZone?.id, seller: userIds['wholesale@marketplace.pk'] || userIds['dealer@marketplace.pk'] },
    // ── Islamabad Area-Specific Listings (for testing area-bounded dealers) ──
    { title: 'Copper Cable Waste - Bara Kahu', desc: 'Old copper cables from telecom tower maintenance in Bara Kahu.', catId: copperCat?.id || metalsCat?.id, price: 78000, qty: 120, unit: 'kg', city: 'Islamabad', lat: 33.7632, lng: 73.1217, zone: null, seller: userIds['customer@marketplace.pk'], areaSlug: 'islamabad-bara-kahu' },
    { title: 'Office Furniture Scrap - G-6', desc: 'Used office furniture from a government building in G-6.', catId: furnitureCat?.id, price: 10000, qty: 50, unit: 'piece', city: 'Islamabad', lat: 33.7215, lng: 73.0578, zone: null, seller: userIds['customer@marketplace.pk'], areaSlug: 'islamabad-g-6' },
    { title: 'Electronic Waste PCBs - G-8', desc: 'PCB boards and old computer parts from IT office in G-8.', catId: electronicsCat?.id, price: 36000, qty: 80, unit: 'kg', city: 'Islamabad', lat: 33.6960, lng: 73.0478, zone: null, seller: userIds['regional@marketplace.pk'], areaSlug: 'islamabad-g-8' },
    { title: 'Newspaper Bundle - F-6 Library', desc: 'Old newspapers and magazines from library in F-6, Islamabad.', catId: paperCat?.id, price: 17500, qty: 500, unit: 'kg', city: 'Islamabad', lat: 33.7294, lng: 73.0753, zone: islamabadZone?.id, seller: userIds['regional@marketplace.pk'] },
    { title: 'Iron Gate Scrap - Bara Kahu', desc: 'Old iron gates and grills collected from renovation in Bara Kahu.', catId: ironCat?.id || metalsCat?.id, price: 45000, qty: 300, unit: 'kg', city: 'Islamabad', lat: 33.7680, lng: 73.1150, zone: null, seller: userIds['customer@marketplace.pk'], areaSlug: 'islamabad-bara-kahu' },
    { title: 'Plastic Crates - G-6 Market', desc: 'Used plastic vegetable crates from wholesale market in G-6.', catId: plasticsCat?.id, price: 8000, qty: 100, unit: 'piece', city: 'Islamabad', lat: 33.7200, lng: 73.0600, zone: null, seller: userIds['customer@marketplace.pk'], areaSlug: 'islamabad-g-6' },
  ];

  const kgUnit = await prisma.unit.findUnique({ where: { slug: 'kg' } });
  for (const l of sampleListings) {
    if (!l.catId) continue;
    const unitRecord = await prisma.unit.findUnique({ where: { slug: l.unit } });
    if (!unitRecord) continue;

    // Resolve geoZoneId — use areaSlug if provided, otherwise use zone
    let resolvedZone = l.zone;
    if (l.areaSlug) {
      const areaZone = await prisma.geoZone.findUnique({ where: { slug: l.areaSlug } });
      resolvedZone = areaZone?.id || islamabadZone?.id;
    }

    const existingListing = await prisma.listing.findFirst({ where: { title: l.title } });
    if (!existingListing) {
      await prisma.listing.create({
        data: {
          title: l.title,
          description: l.desc,
          categoryId: l.catId,
          pricePaisa: BigInt(l.price),
          currencyId: 'PKR',
          priceNegotiable: true,
          quantity: l.qty,
          unitId: unitRecord.id,
          sellerId: l.seller,
          geoZoneId: resolvedZone || karachiZone?.id,
          latitude: l.lat,
          longitude: l.lng,
          cityName: l.city,
          countryId: 'PK',
          status: 'ACTIVE',
          visibilityLevel: 'LOCAL',
        },
      });
    }
  }

  // ═══════════════════════════════════════════════
  // 15. WALLETS FOR DEALERS
  // ═══════════════════════════════════════════════
  console.log('  15/17 Wallets...');
  for (const email of ['dealer@marketplace.pk', 'franchise@marketplace.pk', 'barakahu@marketplace.pk', 'g6dealer@marketplace.pk', 'g8dealer@marketplace.pk', 'isb.franchise@marketplace.pk']) {
    if (userIds[email]) {
      await prisma.wallet.upsert({
        where: { userId: userIds[email] },
        update: {},
        create: { userId: userIds[email], balancePaisa: BigInt(0), currencyId: 'PKR' },
      });
    }
  }

  // ═══════════════════════════════════════════════
  // 16. SAMPLE NOTIFICATIONS
  // ═══════════════════════════════════════════════
  console.log('  16/17 Sample Notifications...');
  if (userIds['admin@marketplace.pk']) {
    await prisma.notification.createMany({
      data: [
        { userId: userIds['admin@marketplace.pk'], type: 'SYSTEM', title: 'Welcome!', body: 'Welcome to the Geo-Franchise Marketplace Admin Panel.' },
        { userId: userIds['admin@marketplace.pk'], type: 'NEW_LISTING', title: 'New Listings Available', body: '10 sample listings have been created.', data: {} },
      ],
      skipDuplicates: true,
    });
  }

  // ═══════════════════════════════════════════════
  // 17. PRODUCT ATTRIBUTES (Sample for Copper Wire)
  // ═══════════════════════════════════════════════
  console.log('  17/17 Product Attributes...');
  const copperWireType = await prisma.productType.findUnique({ where: { slug: 'copper-wire' } });
  if (copperWireType) {
    // Purity attribute
    const existingAttr = await prisma.productAttribute.findFirst({ where: { productTypeId: copperWireType.id, slug: 'purity' } });
    if (!existingAttr) {
      await prisma.productAttribute.create({
        data: {
          productTypeId: copperWireType.id,
          slug: 'purity',
          inputType: 'SELECT',
          isRequired: true,
          isFilterable: true,
          sortOrder: 0,
          translations: { create: [
            { languageId: 'en', label: 'Purity' },
            { languageId: 'ur', label: 'خلوص' },
          ]},
          options: { create: [
            { slug: 'high-purity', sortOrder: 0, translations: { create: [
              { languageId: 'en', label: 'High Purity (99%+)' },
              { languageId: 'ur', label: 'اعلی خلوص (99%+)' },
            ]}},
            { slug: 'medium-purity', sortOrder: 1, translations: { create: [
              { languageId: 'en', label: 'Medium Purity (90-99%)' },
              { languageId: 'ur', label: 'درمیانی خلوص (90-99%)' },
            ]}},
            { slug: 'low-purity', sortOrder: 2, translations: { create: [
              { languageId: 'en', label: 'Low Purity (<90%)' },
              { languageId: 'ur', label: 'کم خلوص (<90%)' },
            ]}},
          ]},
        },
      });
    }

    // Condition attribute
    const existingCond = await prisma.productAttribute.findFirst({ where: { productTypeId: copperWireType.id, slug: 'condition' } });
    if (!existingCond) {
      await prisma.productAttribute.create({
        data: {
          productTypeId: copperWireType.id,
          slug: 'condition',
          inputType: 'SELECT',
          isRequired: false,
          sortOrder: 1,
          translations: { create: [
            { languageId: 'en', label: 'Condition' },
            { languageId: 'ur', label: 'حالت' },
          ]},
          options: { create: [
            { slug: 'new', sortOrder: 0, translations: { create: [{ languageId: 'en', label: 'New' }, { languageId: 'ur', label: 'نیا' }]}},
            { slug: 'used-good', sortOrder: 1, translations: { create: [{ languageId: 'en', label: 'Used - Good' }, { languageId: 'ur', label: 'استعمال شدہ - اچھا' }]}},
            { slug: 'scrap', sortOrder: 2, translations: { create: [{ languageId: 'en', label: 'Scrap' }, { languageId: 'ur', label: 'کباڑ' }]}},
          ]},
        },
      });
    }
  }

  // ═══════════════════════════════════════════════
  // 18. ESCALATION RULES
  // ═══════════════════════════════════════════════
  console.log('  18/20 Escalation Rules...');
  const escalationRules = [
    {
      fromLevel: 'LOCAL', toLevel: 'NEIGHBOR', delayHours: 24,
      notifyRoles: ['DEALER'], sortOrder: 0,
    },
    {
      fromLevel: 'NEIGHBOR', toLevel: 'CITY', delayHours: 48,
      notifyRoles: ['DEALER', 'FRANCHISE_OWNER'], sortOrder: 1,
    },
    {
      fromLevel: 'CITY', toLevel: 'PROVINCE', delayHours: 72,
      notifyRoles: ['FRANCHISE_OWNER', 'REGIONAL_MANAGER'], sortOrder: 2,
    },
    {
      fromLevel: 'PROVINCE', toLevel: 'NATIONAL', delayHours: 120,
      notifyRoles: ['REGIONAL_MANAGER', 'WHOLESALE_BUYER'], sortOrder: 3,
    },
    {
      fromLevel: 'NATIONAL', toLevel: 'PUBLIC', delayHours: 168,
      notifyRoles: ['SUPER_ADMIN'], sortOrder: 4,
    },
  ];
  for (const rule of escalationRules) {
    await prisma.escalationRule.upsert({
      where: { fromLevel_toLevel: { fromLevel: rule.fromLevel, toLevel: rule.toLevel } },
      update: { delayHours: rule.delayHours, notifyRoles: rule.notifyRoles, sortOrder: rule.sortOrder },
      create: rule,
    });
  }

  // ═══════════════════════════════════════════════
  // 19. DEALER TERRITORY ASSIGNMENTS
  // ═══════════════════════════════════════════════
  console.log('  19/20 Dealer Territories...');

  // Fetch area zones for Karachi
  const korangiZone = await prisma.geoZone.findUnique({ where: { slug: 'karachi-korangi' } });
  const siteZone = await prisma.geoZone.findUnique({ where: { slug: 'karachi-site' } });
  const lyariZone = await prisma.geoZone.findUnique({ where: { slug: 'karachi-lyari' } });
  const saddarZone = await prisma.geoZone.findUnique({ where: { slug: 'karachi-saddar' } });
  const cliftonZone = await prisma.geoZone.findUnique({ where: { slug: 'karachi-clifton' } });
  const dhaKarachiZone = await prisma.geoZone.findUnique({ where: { slug: 'karachi-dha-karachi' } });

  // Fetch area zones for Lahore
  const joharTownZone = await prisma.geoZone.findUnique({ where: { slug: 'lahore-johar-town' } });
  const gulbergZone = await prisma.geoZone.findUnique({ where: { slug: 'lahore-gulberg' } });
  const modelTownZone = await prisma.geoZone.findUnique({ where: { slug: 'lahore-model-town' } });

  // Fetch province zones
  const sindhZone = await prisma.geoZone.findUnique({ where: { slug: 'sindh' } });
  const punjabZone = await prisma.geoZone.findUnique({ where: { slug: 'punjab' } });

  const dealerUserId = userIds['dealer@marketplace.pk'];
  const franchiseUserId = userIds['franchise@marketplace.pk'];
  const regionalUserId = userIds['regional@marketplace.pk'];
  const wholesaleUserId = userIds['wholesale@marketplace.pk'];

  // Ahmed Dealer (DEALER role) → assigned to Korangi, SITE local areas in Karachi
  const dealerZones = [korangiZone, siteZone, lyariZone].filter(Boolean);
  for (const zone of dealerZones) {
    if (dealerUserId && zone) {
      await prisma.dealerTerritory.upsert({
        where: { userId_geoZoneId: { userId: dealerUserId, geoZoneId: zone.id } },
        update: { isActive: true, isExclusive: true },
        create: { userId: dealerUserId, geoZoneId: zone.id, isExclusive: true, assignedBy: userIds['admin@marketplace.pk'] },
      });
    }
  }

  // Ali Franchise (FRANCHISE_OWNER) → assigned to Lahore city + some Lahore areas
  if (franchiseUserId && lahoreZone) {
    await prisma.dealerTerritory.upsert({
      where: { userId_geoZoneId: { userId: franchiseUserId, geoZoneId: lahoreZone.id } },
      update: { isActive: true, isExclusive: true },
      create: { userId: franchiseUserId, geoZoneId: lahoreZone.id, isExclusive: true, assignedBy: userIds['admin@marketplace.pk'] },
    });
  }
  const franchiseAreaZones = [joharTownZone, gulbergZone, modelTownZone].filter(Boolean);
  for (const zone of franchiseAreaZones) {
    if (franchiseUserId && zone) {
      await prisma.dealerTerritory.upsert({
        where: { userId_geoZoneId: { userId: franchiseUserId, geoZoneId: zone.id } },
        update: { isActive: true },
        create: { userId: franchiseUserId, geoZoneId: zone.id, isExclusive: false, assignedBy: userIds['admin@marketplace.pk'] },
      });
    }
  }

  // Regional Manager → assigned to Islamabad Capital province
  const icpZone = await prisma.geoZone.findUnique({ where: { slug: 'islamabad-capital' } });
  if (regionalUserId && icpZone) {
    await prisma.dealerTerritory.upsert({
      where: { userId_geoZoneId: { userId: regionalUserId, geoZoneId: icpZone.id } },
      update: { isActive: true },
      create: { userId: regionalUserId, geoZoneId: icpZone.id, isExclusive: true, assignedBy: userIds['admin@marketplace.pk'] },
    });
  }

  // Wholesale Buyer → assigned to Punjab province (wider reach)
  if (wholesaleUserId && punjabZone) {
    await prisma.dealerTerritory.upsert({
      where: { userId_geoZoneId: { userId: wholesaleUserId, geoZoneId: punjabZone.id } },
      update: { isActive: true },
      create: { userId: wholesaleUserId, geoZoneId: punjabZone.id, isExclusive: false, assignedBy: userIds['admin@marketplace.pk'] },
    });
  }

  // ── Islamabad Area Dealers + City Franchise ──
  const baraKahuZone = await prisma.geoZone.findUnique({ where: { slug: 'islamabad-bara-kahu' } });
  const g6Zone = await prisma.geoZone.findUnique({ where: { slug: 'islamabad-g-6' } });
  const g8Zone = await prisma.geoZone.findUnique({ where: { slug: 'islamabad-g-8' } });

  const baraKahuUserId = userIds['barakahu@marketplace.pk'];
  const g6UserId = userIds['g6dealer@marketplace.pk'];
  const g8UserId = userIds['g8dealer@marketplace.pk'];
  const isbFranchiseUserId = userIds['isb.franchise@marketplace.pk'];

  // Update geoZoneId on the user records
  if (baraKahuUserId && baraKahuZone) {
    await prisma.user.update({ where: { id: baraKahuUserId }, data: { geoZoneId: baraKahuZone.id } });
  }
  if (g6UserId && g6Zone) {
    await prisma.user.update({ where: { id: g6UserId }, data: { geoZoneId: g6Zone.id } });
  }
  if (g8UserId && g8Zone) {
    await prisma.user.update({ where: { id: g8UserId }, data: { geoZoneId: g8Zone.id } });
  }

  // Usman BaraKahu (DEALER) → exclusive territory: Bara Kahu
  if (baraKahuUserId && baraKahuZone) {
    await prisma.dealerTerritory.upsert({
      where: { userId_geoZoneId: { userId: baraKahuUserId, geoZoneId: baraKahuZone.id } },
      update: { isActive: true, isExclusive: true },
      create: { userId: baraKahuUserId, geoZoneId: baraKahuZone.id, isExclusive: true, assignedBy: userIds['admin@marketplace.pk'] },
    });
  }

  // Tariq G6-Dealer (DEALER) → exclusive territory: G-6
  if (g6UserId && g6Zone) {
    await prisma.dealerTerritory.upsert({
      where: { userId_geoZoneId: { userId: g6UserId, geoZoneId: g6Zone.id } },
      update: { isActive: true, isExclusive: true },
      create: { userId: g6UserId, geoZoneId: g6Zone.id, isExclusive: true, assignedBy: userIds['admin@marketplace.pk'] },
    });
  }

  // Kashif G8-Dealer (DEALER) → exclusive territory: G-8
  if (g8UserId && g8Zone) {
    await prisma.dealerTerritory.upsert({
      where: { userId_geoZoneId: { userId: g8UserId, geoZoneId: g8Zone.id } },
      update: { isActive: true, isExclusive: true },
      create: { userId: g8UserId, geoZoneId: g8Zone.id, isExclusive: true, assignedBy: userIds['admin@marketplace.pk'] },
    });
  }

  // Zubair Islamabad-Franchise (FRANCHISE_OWNER) → city-level: Islamabad + all Islamabad areas
  if (isbFranchiseUserId && islamabadZone) {
    await prisma.dealerTerritory.upsert({
      where: { userId_geoZoneId: { userId: isbFranchiseUserId, geoZoneId: islamabadZone.id } },
      update: { isActive: true, isExclusive: true },
      create: { userId: isbFranchiseUserId, geoZoneId: islamabadZone.id, isExclusive: true, assignedBy: userIds['admin@marketplace.pk'] },
    });
  }
  // Also give franchise all sub-areas of Islamabad for wider reach
  const isbSubAreas = [baraKahuZone, g6Zone, g8Zone].filter(Boolean);
  for (const zone of isbSubAreas) {
    if (isbFranchiseUserId && zone) {
      await prisma.dealerTerritory.upsert({
        where: { userId_geoZoneId: { userId: isbFranchiseUserId, geoZoneId: zone.id } },
        update: { isActive: true },
        create: { userId: isbFranchiseUserId, geoZoneId: zone.id, isExclusive: false, assignedBy: userIds['admin@marketplace.pk'] },
      });
    }
  }

  // ═══════════════════════════════════════════════
  // 20. TERRITORY NOTIFICATIONS SAMPLE
  // ═══════════════════════════════════════════════
  console.log('  20/20 Territory Notifications...');
  if (dealerUserId) {
    const existingTerritoryNotif = await prisma.notification.findFirst({
      where: { userId: dealerUserId, type: 'SYSTEM', title: 'Territory Assigned' },
    });
    if (!existingTerritoryNotif) {
      await prisma.notification.create({
        data: {
          userId: dealerUserId,
          type: 'SYSTEM',
          title: 'Territory Assigned',
          body: 'You have been assigned to manage Korangi, SITE, and Lyari areas in Karachi.',
          data: { zones: ['Korangi', 'SITE', 'Lyari'] },
        },
      });
    }
  }

  // Islamabad territory notifications
  const isbTerritoryNotifs = [
    { userId: baraKahuUserId, area: 'Bara Kahu' },
    { userId: g6UserId, area: 'G-6' },
    { userId: g8UserId, area: 'G-8' },
    { userId: isbFranchiseUserId, area: 'Islamabad (City) + Bara Kahu, G-6, G-8' },
  ];
  for (const n of isbTerritoryNotifs) {
    if (n.userId) {
      const existing = await prisma.notification.findFirst({
        where: { userId: n.userId, type: 'SYSTEM', title: 'Territory Assigned' },
      });
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: n.userId,
            type: 'SYSTEM',
            title: 'Territory Assigned',
            body: `You have been assigned to manage ${n.area} area in Islamabad.`,
            data: { area: n.area },
          },
        });
      }
    }
  }

  console.log('\n✅ Seeding complete! Pakistan marketplace is ready.\n');
  console.log('  Default Logins:');
  console.log('    Admin:         admin@marketplace.pk / Admin@123456');
  console.log('    Manager:       manager@marketplace.pk / Manager@123');
  console.log('    Regional:      regional@marketplace.pk / Regional@123');
  console.log('    Dealer:        dealer@marketplace.pk / Dealer@123');
  console.log('    Franchise:     franchise@marketplace.pk / Franchise@123');
  console.log('    Customer:      customer@marketplace.pk / Customer@123');
  console.log('    Wholesale:     wholesale@marketplace.pk / Wholesale@123');
  console.log('');
  console.log('  ── Islamabad Test Accounts ──');
  console.log('    Bara Kahu Dealer:   barakahu@marketplace.pk / BaraKahu@123   (Ph: +923001110001)');
  console.log('    G-6 Dealer:         g6dealer@marketplace.pk / G6Dealer@123   (Ph: +923001110002)');
  console.log('    G-8 Dealer:         g8dealer@marketplace.pk / G8Dealer@123   (Ph: +923001110003)');
  console.log('    ISB Franchise:      isb.franchise@marketplace.pk / IsbFranchise@123 (Ph: +923001110004)');
  console.log('');
  console.log('  Escalation Timeline:');
  console.log('    LOCAL → 24h → NEIGHBOR → 48h → CITY → 72h → PROVINCE → 120h → NATIONAL → 168h → PUBLIC');
  console.log('');
  console.log('  Territory Assignments:');
  console.log('    Ahmed Dealer     → Korangi, SITE, Lyari (Karachi LOCAL_AREA)');
  console.log('    Ali Franchise    → Lahore (CITY) + Johar Town, Gulberg, Model Town');
  console.log('    Regional Mgr     → Islamabad Capital (PROVINCE)');
  console.log('    Wholesale        → Punjab (PROVINCE)');
  console.log('    Usman BaraKahu   → Bara Kahu (Islamabad LOCAL_AREA) [EXCLUSIVE]');
  console.log('    Tariq G6-Dealer  → G-6 (Islamabad LOCAL_AREA) [EXCLUSIVE]');
  console.log('    Kashif G8-Dealer → G-8 (Islamabad LOCAL_AREA) [EXCLUSIVE]');
  console.log('    Zubair ISB-Fran  → Islamabad (CITY) + Bara Kahu, G-6, G-8');
  console.log('');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Seed error:', e);
    prisma.$disconnect();
    process.exit(1);
  });
