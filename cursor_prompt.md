# 🧠 CursorAI Master Development Prompt
## Geo-Controlled Franchise Marketplace Platform — Full Stack, End to End
### 🇵🇰 Primary Market: Pakistan | Extensible for Multi-Country, Multi-Currency, Multi-Language

---

## 📌 PROJECT IDENTITY

You are building a **production-grade, geo-fenced, franchise-based B2B/B2C marketplace platform** for trading recyclable and reusable goods (scrap, waste, furniture, electronics, etc.).

The platform includes:
- **Android & iOS Mobile App** (Flutter)
- **Client Web Portal** (React.js — for dealers/franchises/customers)
- **Admin Web Portal** (React.js — for super admin & platform management)
- **Backend API** (Node.js + NestJS — RESTful + WebSocket)
- **Database** (PostgreSQL + PostGIS)
- **Cloud Infrastructure** (AWS)

**Primary deployment country: Pakistan**
- Default currency: **PKR (Pakistani Rupee ₨)**
- Default languages: **Urdu (ur) + English (en)**
- Default timezone: **Asia/Karachi (PKT, UTC+5)**
- Default phone format: **+92 (Pakistan)**
- Payment gateways: **JazzCash + Easypaisa + Stripe (international)**
- Maps: Google Maps API (Pakistan region bias)

This is NOT a simple CRUD app. It is a **controlled supply-chain digitization system** with geo-fencing, role-based access, subscription enforcement, escalation logic, digital transaction bonding, and full internationalization support.

---

## 🗂️ MONOREPO PROJECT STRUCTURE

```
/geo-franchise-marketplace
│
├── /apps
│   ├── /mobile              → Flutter app (Android + iOS)
│   ├── /web-admin           → React.js Admin Portal
│   └── /web-client          → React.js Client/Dealer Portal
│
├── /backend
│   ├── /src
│   │   ├── /modules
│   │   │   ├── auth
│   │   │   ├── users
│   │   │   ├── roles
│   │   │   ├── listings
│   │   │   ├── categories           ← DYNAMIC (admin-managed table)
│   │   │   ├── product-types        ← DYNAMIC (admin-managed table)
│   │   │   ├── product-attributes   ← DYNAMIC (EAV per category)
│   │   │   ├── units                ← DYNAMIC (admin-managed table)
│   │   │   ├── geo-zones
│   │   │   ├── dealers
│   │   │   ├── franchises
│   │   │   ├── wholesale
│   │   │   ├── subscriptions
│   │   │   ├── payments
│   │   │   ├── transactions
│   │   │   ├── bonds
│   │   │   ├── notifications
│   │   │   ├── escalation-engine
│   │   │   ├── chat
│   │   │   ├── analytics
│   │   │   ├── audit-logs
│   │   │   ├── currencies           ← NEW: Multi-currency module
│   │   │   ├── languages            ← NEW: Multi-language module
│   │   │   ├── translations         ← NEW: Translation strings table
│   │   │   ├── countries            ← NEW: Country/region config
│   │   │   └── admin
│   │   ├── /common
│   │   ├── /guards
│   │   ├── /interceptors
│   │   ├── /pipes
│   │   ├── /decorators
│   │   └── /config
│   ├── /prisma
│   └── /test
│
├── /shared                  → Shared TypeScript types/interfaces
├── /infrastructure          → Docker, Terraform, AWS configs
├── docker-compose.yml
└── README.md
```

---

## ⚙️ TECH STACK (STRICT)

| Layer | Technology |
|---|---|
| Mobile | Flutter 3.x (Dart) |
| Web Portals | React.js 18 + TypeScript + TailwindCSS + shadcn/ui |
| Backend | Node.js + NestJS + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 15 + PostGIS |
| Cache | Redis |
| File Storage | AWS S3 |
| Auth | JWT + Refresh Tokens + OTP (Twilio/Firebase) |
| Payments | JazzCash + Easypaisa + Stripe |
| PDF Generation | Puppeteer |
| Real-time | Socket.io |
| Email | Nodemailer + SendGrid |
| SMS/OTP | Twilio (Pakistan number support) |
| Background Jobs | Bull + Redis |
| Maps | Google Maps API (Pakistan region bias) |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| i18n Backend | i18next (NestJS) |
| i18n Web | react-i18next |
| i18n Mobile | easy_localization (Flutter) |
| Currency Conversion | Open Exchange Rates API (stub, extensible) |
| Containerization | Docker + Docker Compose |
| State Mgmt (Web) | Zustand |
| State Mgmt (Mobile) | Riverpod |
| API Docs | Swagger |
| Testing | Jest + Flutter Test |

---

## 🌐 MODULE A — COUNTRY & REGION CONFIGURATION

This module controls which countries the platform is deployed in. Each country has its own currency, language, timezone, phone format, and payment gateways. Pakistan is country ID `PK` and is the **default**.

### Prisma Schema:

```prisma
model Country {
  id                String      @id           // ISO 3166-1 alpha-2: "PK", "AE", "US"
  name              String                    // "Pakistan"
  nativeName        String                    // "پاکستان"
  phoneCode         String                    // "+92"
  phoneFormat       String                    // "3XX-XXXXXXX"
  defaultCurrencyId String
  defaultCurrency   Currency    @relation(fields: [defaultCurrencyId], references: [id])
  defaultLanguageId String
  defaultLanguage   Language    @relation(fields: [defaultLanguageId], references: [id])
  timezone          String                    // "Asia/Karachi"
  isActive          Boolean     @default(true)
  isDefault         Boolean     @default(false)  // Only PK = true initially
  geoZones          GeoZone[]
  supportedCurrencies CountryCurrency[]
  supportedLanguages  CountryLanguage[]
  paymentGateways   CountryPaymentGateway[]
  subscriptionPlans SubscriptionPlan[]
  createdAt         DateTime    @default(now())
}
```

### Seed Pakistan as default:

```typescript
// prisma/seed.ts — Country seed
await prisma.country.create({
  data: {
    id: 'PK',
    name: 'Pakistan',
    nativeName: 'پاکستان',
    phoneCode: '+92',
    phoneFormat: '3XX-XXXXXXX',
    defaultCurrencyId: 'PKR',
    defaultLanguageId: 'ur',
    timezone: 'Asia/Karachi',
    isActive: true,
    isDefault: true,
  }
});
```

### Endpoints:

```
GET    /countries                   → List active countries
GET    /countries/:id               → Country detail
POST   /admin/countries             → Add new country
PUT    /admin/countries/:id         → Update country config
PUT    /admin/countries/:id/toggle  → Enable/disable country
```

---

## 💱 MODULE B — CURRENCY MODULE (Multi-Currency, PKR Default)

### Design Principles:
- All **monetary values stored in the database as integers (paisa/cents)** to avoid floating point errors
- All **display conversions** happen at the API response layer via a `CurrencyService`
- Default currency is **PKR**; admin can add new currencies without code changes
- Exchange rates are stored in DB and can be updated manually or via scheduled job (Open Exchange Rates API stub)

### Prisma Schema:

```prisma
model Currency {
  id              String    @id           // ISO 4217: "PKR", "USD", "AED", "SAR"
  name            String                  // "Pakistani Rupee"
  nativeName      String                  // "روپیہ"
  symbol          String                  // "₨"
  symbolNative    String                  // "ر"
  symbolPosition  SymbolPosition @default(PREFIX)  // PREFIX or SUFFIX
  decimalDigits   Int       @default(2)
  rounding        Float     @default(0)
  isActive        Boolean   @default(true)
  isDefault       Boolean   @default(false)  // Only PKR = true
  exchangeRates   ExchangeRate[] @relation("BaseCurrency")
  targetRates     ExchangeRate[] @relation("TargetCurrency")
  countries       Country[]
  countryLinks    CountryCurrency[]
  listings        Listing[]
  transactions    Transaction[]
  wallets         Wallet[]
  subscriptionPrices SubscriptionPrice[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model ExchangeRate {
  id              String    @id @default(uuid())
  baseCurrencyId  String                  // "PKR"
  baseCurrency    Currency  @relation("BaseCurrency", fields: [baseCurrencyId], references: [id])
  targetCurrencyId String                 // "USD"
  targetCurrency  Currency  @relation("TargetCurrency", fields: [targetCurrencyId], references: [id])
  rate            Decimal   @db.Decimal(18,8)   // 1 PKR = 0.00360 USD
  source          String    @default("MANUAL")  // "MANUAL" | "OPEN_EXCHANGE" | "STATE_BANK_PK"
  effectiveAt     DateTime  @default(now())
  createdAt       DateTime  @default(now())

  @@unique([baseCurrencyId, targetCurrencyId])
}

model CountryCurrency {
  countryId   String
  country     Country   @relation(fields: [countryId], references: [id])
  currencyId  String
  currency    Currency  @relation(fields: [currencyId], references: [id])
  isPrimary   Boolean   @default(false)

  @@id([countryId, currencyId])
}

enum SymbolPosition {
  PREFIX
  SUFFIX
}
```

### CurrencyService:

```typescript
// /modules/currencies/currency.service.ts

@Injectable()
export class CurrencyService {
  // Format amount (stored as integer paisa) to display string
  format(amountPaisa: number, currencyId: string): string {
    // e.g. 150000 paisa → "₨ 1,500" for PKR
    // Apply symbol, position, decimal digits, thousands separator
    // Urdu: use Urdu numerals if locale is 'ur'
  }

  // Convert between currencies
  async convert(amount: number, from: string, to: string): Promise<number> {
    // Fetch rate from DB (cached in Redis for 1 hour)
    // Return converted integer amount
  }

  // Get current default currency for a country
  async getDefaultForCountry(countryId: string): Promise<Currency> {}
}
```

### Endpoints:

```
GET    /currencies                        → List active currencies
GET    /currencies/:id                    → Currency detail + current rate
GET    /currencies/:id/rates              → Exchange rate history
POST   /admin/currencies                  → Add new currency
PUT    /admin/currencies/:id              → Update currency metadata
PUT    /admin/currencies/:id/toggle       → Enable/disable currency
POST   /admin/currencies/rates            → Set exchange rate manually
POST   /admin/currencies/rates/sync       → Trigger rate sync from API
```

### Seed PKR as default:

```typescript
await prisma.currency.create({
  data: {
    id: 'PKR',
    name: 'Pakistani Rupee',
    nativeName: 'روپیہ',
    symbol: '₨',
    symbolNative: 'ر',
    symbolPosition: 'PREFIX',
    decimalDigits: 0,          // PKR has no paisa in common use
    rounding: 0,
    isActive: true,
    isDefault: true,
  }
});

// Also seed: USD, AED, SAR, GBP as inactive (ready to activate)
```

**Important:** All `price` fields in Listing and Transaction models store values as **integer (PKR amount × 100 for paisa, or × 1 for PKR with decimalDigits=0)**. The `currencyId` field on each record stores which currency was used at time of listing.

---

## 🌍 MODULE C — LANGUAGE & LOCALIZATION MODULE

### Design Principles:
- Default languages: **Urdu (ur)** and **English (en)**
- RTL support for Urdu (right-to-left text direction)
- All UI string keys stored in a `Translation` table — admin can edit from portal without redeployment
- New languages can be added by admin with zero code changes
- Language preference stored per user; fallback to country default

### Prisma Schema:

```prisma
model Language {
  id              String    @id           // BCP 47: "ur", "en", "ar", "zh"
  name            String                  // "Urdu"
  nativeName      String                  // "اردو"
  direction       TextDirection @default(LTR)
  isActive        Boolean   @default(true)
  isDefault       Boolean   @default(false)  // "ur" = true for PK
  flagEmoji       String?                 // "🇵🇰"
  countryLinks    CountryLanguage[]
  translations    Translation[]
  users           User[]    @relation("UserLanguage")
  createdAt       DateTime  @default(now())
}

model CountryLanguage {
  countryId   String
  country     Country   @relation(fields: [countryId], references: [id])
  languageId  String
  language    Language  @relation(fields: [languageId], references: [id])
  isPrimary   Boolean   @default(false)

  @@id([countryId, languageId])
}

model Translation {
  id          String    @id @default(uuid())
  languageId  String
  language    Language  @relation(fields: [languageId], references: [id])
  namespace   String                    // "common" | "listings" | "auth" | "notifications" | "categories"
  key         String                    // "listing.create.title"
  value       String                    // "نئی فہرست بنائیں" (Urdu) or "Create New Listing" (English)
  isRTL       Boolean   @default(false)
  updatedAt   DateTime  @updatedAt
  createdAt   DateTime  @default(now())

  @@unique([languageId, namespace, key])
}

enum TextDirection {
  LTR
  RTL
}
```

### i18n Implementation:

**Backend (NestJS):**
```typescript
// /modules/languages/i18n.service.ts
// On app bootstrap, load all translations from DB into Redis
// Cache key: translations:{languageId}:{namespace}
// Invalidate on admin update
// Serve via /translations endpoint for frontend hydration

// Middleware: read Accept-Language header or user.languageId
// Set req.lang = resolved language
// All notification messages translated before sending
```

**Translation endpoints:**
```
GET  /translations/:languageId            → Full translation map for language
GET  /translations/:languageId/:namespace → Namespace-specific keys
POST /admin/translations                  → Create translation key
PUT  /admin/translations/:id              → Update translation value
POST /admin/translations/bulk-import      → Import JSON file of keys
GET  /admin/translations/export/:langId   → Export as JSON
POST /admin/languages                     → Add new language
PUT  /admin/languages/:id/toggle          → Enable/disable language
```

**Web Portals (react-i18next):**
```typescript
// On app load: fetch /translations/{userLang} → store in i18next
// Fallback chain: userLang → countryDefault → 'en'
// RTL: set document.dir = language.direction
// Example usage: t('listing.create.title')
// Admin portal has inline translation editor (click any text → edit in place)
```

**Mobile (easy_localization Flutter):**
```dart
// Fetch translations from API on first launch → cache locally
// Re-fetch if version hash changes
// Support RTL layout for Urdu using Directionality widget
// Urdu font: Jameel Noori Nastaleeq (bundled in assets)
// English font: Inter
```

### Seed translations (Urdu + English for all namespaces):

Create a seed file `/prisma/translations/` with JSON files:
- `en.common.json`, `ur.common.json`
- `en.auth.json`, `ur.auth.json`
- `en.listings.json`, `ur.listings.json`
- `en.notifications.json`, `ur.notifications.json`
- `en.categories.json`, `ur.categories.json`
- `en.errors.json`, `ur.errors.json`

**Sample translations to include:**

| Key | English | Urdu |
|---|---|---|
| `app.name` | Marketplace | مارکیٹ پلیس |
| `listing.create` | Create Listing | فہرست بنائیں |
| `listing.price` | Price | قیمت |
| `listing.quantity` | Quantity | مقدار |
| `listing.category` | Category | زمرہ |
| `auth.login` | Login | لاگ ان |
| `auth.register` | Register | رجسٹر کریں |
| `auth.phone` | Phone Number | فون نمبر |
| `dealer.zone` | Your Zone | آپ کا علاقہ |
| `subscription.expired` | Subscription Expired | سبسکرپشن ختم ہو گئی |
| `transaction.offer` | Make an Offer | پیشکش کریں |
| `bond.download` | Download Bond | بانڈ ڈاؤنلوڈ کریں |

---

## 📦 MODULE D — DYNAMIC PRODUCT CATALOG SYSTEM

This is fully **admin-managed**. No product types, categories, subcategories, or attributes are hardcoded. Everything is database-driven and manageable from the Admin Portal with zero code deployment.

### Architecture:

```
Category (top level, e.g. "Metals")
  └── SubCategory (e.g. "Copper")
        └── ProductType (e.g. "Copper Wire")
              └── ProductAttribute (e.g. "Purity", "Gauge")
                    └── AttributeOption (e.g. "99%", "High Purity")
```

### Prisma Schema:

```prisma
// ─── CATEGORY ───────────────────────────────────────────────
model Category {
  id              String        @id @default(uuid())
  slug            String        @unique   // "metals", "electronics"
  icon            String?                 // S3 URL of category icon
  colorHex        String?                 // "#F59E0B" for UI theming
  sortOrder       Int           @default(0)
  isActive        Boolean       @default(true)
  parentId        String?
  parent          Category?     @relation("CategoryTree", fields: [parentId], references: [id])
  children        Category[]    @relation("CategoryTree")
  productTypes    ProductType[]
  listings        Listing[]
  translations    CategoryTranslation[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model CategoryTranslation {
  id          String    @id @default(uuid())
  categoryId  String
  category    Category  @relation(fields: [categoryId], references: [id])
  languageId  String
  name        String    // "دھاتیں" (Urdu) / "Metals" (English)
  description String?

  @@unique([categoryId, languageId])
}

// ─── PRODUCT TYPE ────────────────────────────────────────────
model ProductType {
  id              String              @id @default(uuid())
  slug            String              @unique   // "copper-wire"
  categoryId      String
  category        Category            @relation(fields: [categoryId], references: [id])
  icon            String?
  isActive        Boolean             @default(true)
  sortOrder       Int                 @default(0)
  attributes      ProductAttribute[]
  listings        Listing[]
  translations    ProductTypeTranslation[]
  priceHistory    PriceHistory[]
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
}

model ProductTypeTranslation {
  id              String      @id @default(uuid())
  productTypeId   String
  productType     ProductType @relation(fields: [productTypeId], references: [id])
  languageId      String
  name            String      // "تانبے کی تار" (Urdu) / "Copper Wire" (English)
  description     String?
  unitLabel       String?     // "کلو" / "kg"

  @@unique([productTypeId, languageId])
}

// ─── PRODUCT ATTRIBUTES (EAV) ────────────────────────────────
model ProductAttribute {
  id              String                  @id @default(uuid())
  productTypeId   String
  productType     ProductType             @relation(fields: [productTypeId], references: [id])
  slug            String                  // "purity", "gauge", "condition"
  inputType       AttributeInputType      @default(SELECT)
  isRequired      Boolean                 @default(false)
  isFilterable    Boolean                 @default(true)
  sortOrder       Int                     @default(0)
  isActive        Boolean                 @default(true)
  options         AttributeOption[]
  listingValues   ListingAttributeValue[]
  translations    AttributeTranslation[]
  createdAt       DateTime                @default(now())
}

model AttributeOption {
  id              String              @id @default(uuid())
  attributeId     String
  attribute       ProductAttribute    @relation(fields: [attributeId], references: [id])
  slug            String              // "high-purity"
  sortOrder       Int                 @default(0)
  isActive        Boolean             @default(true)
  translations    OptionTranslation[]
  listingValues   ListingAttributeValue[]
}

model AttributeTranslation {
  id          String            @id @default(uuid())
  attributeId String
  attribute   ProductAttribute  @relation(fields: [attributeId], references: [id])
  languageId  String
  label       String            // "خلوص" / "Purity"

  @@unique([attributeId, languageId])
}

model OptionTranslation {
  id        String          @id @default(uuid())
  optionId  String
  option    AttributeOption @relation(fields: [optionId], references: [id])
  languageId String
  label     String          // "اعلی خلوص" / "High Purity"

  @@unique([optionId, languageId])
}

// ─── LISTING ATTRIBUTE VALUES ────────────────────────────────
model ListingAttributeValue {
  id          String            @id @default(uuid())
  listingId   String
  listing     Listing           @relation(fields: [listingId], references: [id])
  attributeId String
  attribute   ProductAttribute  @relation(fields: [attributeId], references: [id])
  optionId    String?           // For SELECT type
  option      AttributeOption?  @relation(fields: [optionId], references: [id])
  textValue   String?           // For TEXT type
  numberValue Decimal?          // For NUMBER type

  @@unique([listingId, attributeId])
}

enum AttributeInputType {
  TEXT
  NUMBER
  SELECT
  MULTI_SELECT
  BOOLEAN
  DATE
}

// ─── UNITS OF MEASUREMENT ─────────────────────────────────────
model Unit {
  id              String            @id @default(uuid())
  slug            String            @unique   // "kg", "ton", "piece", "liter"
  type            UnitType                    // WEIGHT | VOLUME | COUNT | LENGTH | AREA
  isBaseUnit      Boolean           @default(false)
  conversionFactor Decimal          @db.Decimal(18,8) @default(1)
  isActive        Boolean           @default(true)
  sortOrder       Int               @default(0)
  translations    UnitTranslation[]
  listings        Listing[]
  createdAt       DateTime          @default(now())
}

model UnitTranslation {
  id          String    @id @default(uuid())
  unitId      String
  unit        Unit      @relation(fields: [unitId], references: [id])
  languageId  String
  name        String    // "کلوگرام" / "Kilogram"
  abbreviation String   // "کلو" / "kg"

  @@unique([unitId, languageId])
}

enum UnitType {
  WEIGHT
  VOLUME
  COUNT
  LENGTH
  AREA
  OTHER
}

// ─── PRICE HISTORY (per product type, for AI suggestion) ──────
model PriceHistory {
  id              String      @id @default(uuid())
  productTypeId   String
  productType     ProductType @relation(fields: [productTypeId], references: [id])
  currencyId      String
  currency        Currency    @relation(fields: [currencyId], references: [id])
  minPricePaisa   BigInt
  maxPricePaisa   BigInt
  avgPricePaisa   BigInt
  sampleCount     Int
  recordedAt      DateTime    @default(now())

  @@index([productTypeId, currencyId, recordedAt])
}
```

### Admin Catalog Management Endpoints:

```
// ─── CATEGORIES ─────────────────────────────────────────────
GET    /admin/categories                       → Full category tree
POST   /admin/categories                       → Create category
PUT    /admin/categories/:id                   → Update
DELETE /admin/categories/:id                   → Soft delete (isActive=false)
PUT    /admin/categories/:id/sort              → Reorder
POST   /admin/categories/:id/translations      → Add/update translation
POST   /admin/categories/:id/icon              → Upload icon (S3)

// ─── PRODUCT TYPES ──────────────────────────────────────────
GET    /admin/product-types                    → All product types (paginated)
GET    /admin/product-types?categoryId=:id     → Filter by category
POST   /admin/product-types                    → Create product type
PUT    /admin/product-types/:id                → Update
DELETE /admin/product-types/:id                → Soft delete
POST   /admin/product-types/:id/translations   → Add translation
PUT    /admin/product-types/:id/toggle         → Enable/disable

// ─── ATTRIBUTES ─────────────────────────────────────────────
GET    /admin/product-types/:id/attributes     → Get attributes for type
POST   /admin/product-types/:id/attributes     → Add attribute
PUT    /admin/attributes/:id                   → Update attribute
DELETE /admin/attributes/:id                   → Remove attribute
POST   /admin/attributes/:id/options           → Add option to attribute
PUT    /admin/attribute-options/:id            → Update option
DELETE /admin/attribute-options/:id            → Remove option
POST   /admin/attributes/:id/translations      → Add attribute translation

// ─── UNITS ──────────────────────────────────────────────────
GET    /units                                  → All active units
GET    /units?type=WEIGHT                      → Filter by type
POST   /admin/units                            → Add unit
PUT    /admin/units/:id                        → Update unit
PUT    /admin/units/:id/toggle                 → Enable/disable
POST   /admin/units/:id/translations           → Add unit translation

// ─── PUBLIC (frontend) ──────────────────────────────────────
GET    /categories                             → Tree (active only, with translations)
GET    /categories/:id/product-types           → Product types in category
GET    /product-types/:id/attributes           → Attributes + options for listing form
```

### Seed Data for Pakistan (initial catalog):

```typescript
// Categories with Urdu + English translations:

const catalogSeed = [
  {
    slug: 'metals', en: 'Metals', ur: 'دھاتیں', colorHex: '#F59E0B',
    children: [
      { slug: 'copper', en: 'Copper', ur: 'تانبا',
        types: [
          { slug: 'copper-wire', en: 'Copper Wire', ur: 'تانبے کی تار' },
          { slug: 'copper-sheet', en: 'Copper Sheet', ur: 'تانبے کی چادر' },
        ]
      },
      { slug: 'silver', en: 'Silver', ur: 'چاندی' },
      { slug: 'iron', en: 'Iron', ur: 'لوہا',
        types: [
          { slug: 'iron-scrap', en: 'Iron Scrap', ur: 'لوہے کا کباڑ' },
          { slug: 'steel-rods', en: 'Steel Rods', ur: 'سریا' },
        ]
      },
    ]
  },
  {
    slug: 'plastics', en: 'Plastics', ur: 'پلاسٹک', colorHex: '#3B82F6',
    children: [
      { slug: 'plastic-bags', en: 'Plastic Bags', ur: 'پلاسٹک کے تھیلے' },
      { slug: 'plastic-bottles', en: 'Plastic Bottles', ur: 'پلاسٹک کی بوتلیں' },
    ]
  },
  { slug: 'paper', en: 'Paper & Cardboard', ur: 'کاغذ اور گتہ', colorHex: '#10B981',
    children: [
      { slug: 'paper-waste', en: 'Paper Waste', ur: 'ردی کاغذ' },
      { slug: 'hardboard', en: 'Hardboard', ur: 'گتہ' },
    ]
  },
  { slug: 'electronics', en: 'Electronics', ur: 'الیکٹرانکس', colorHex: '#8B5CF6',
    children: [
      { slug: 'electronic-scrap', en: 'Electronic Scrap', ur: 'الیکٹرانک کباڑ' },
      { slug: 'waste-wires', en: 'Waste Wires', ur: 'بیکار تاریں' },
    ]
  },
  { slug: 'organic', en: 'Organic', ur: 'نامیاتی', colorHex: '#EF4444',
    children: [
      { slug: 'bones', en: 'Bones', ur: 'ہڈیاں' },
      { slug: 'hairs', en: 'Hair', ur: 'بال' },
    ]
  },
  { slug: 'furniture', en: 'Furniture', ur: 'فرنیچر', colorHex: '#F97316' },
  { slug: 'household', en: 'Household Items', ur: 'گھریلو اشیاء', colorHex: '#06B6D4',
    children: [
      { slug: 'home-items', en: 'Home Items', ur: 'گھر کی اشیاء' },
      { slug: 'office-items', en: 'Office Items', ur: 'دفتری اشیاء' },
    ]
  },
  { slug: 'glass', en: 'Glass', ur: 'شیشہ', colorHex: '#64748B' },
  { slug: 'silver-box', en: 'Silver Box', ur: 'سلور باکس', colorHex: '#94A3B8' },
];

// Units seed (with Urdu translations):
const unitsSeed = [
  { slug: 'kg', type: 'WEIGHT', en: { name: 'Kilogram', abbr: 'kg' }, ur: { name: 'کلوگرام', abbr: 'کلو' } },
  { slug: 'ton', type: 'WEIGHT', en: { name: 'Ton', abbr: 't' }, ur: { name: 'ٹن', abbr: 'ٹن' } },
  { slug: 'gram', type: 'WEIGHT', en: { name: 'Gram', abbr: 'g' }, ur: { name: 'گرام', abbr: 'گرام' } },
  { slug: 'piece', type: 'COUNT', en: { name: 'Piece', abbr: 'pcs' }, ur: { name: 'عدد', abbr: 'عدد' } },
  { slug: 'liter', type: 'VOLUME', en: { name: 'Liter', abbr: 'L' }, ur: { name: 'لیٹر', abbr: 'لٹر' } },
  { slug: 'bundle', type: 'COUNT', en: { name: 'Bundle', abbr: 'bdl' }, ur: { name: 'گٹھا', abbr: 'گٹھا' } },
  { slug: 'bag', type: 'COUNT', en: { name: 'Bag', abbr: 'bag' }, ur: { name: 'بوری', abbr: 'بوری' } },
  { slug: 'truck-load', type: 'COUNT', en: { name: 'Truck Load', abbr: 'truck' }, ur: { name: 'ٹرک بھر', abbr: 'ٹرک' } },
];
```

---

## 💳 MODULE E — PAKISTAN PAYMENT GATEWAYS

### Supported Gateways (Pakistan-first):

```prisma
model CountryPaymentGateway {
  id          String    @id @default(uuid())
  countryId   String
  country     Country   @relation(fields: [countryId], references: [id])
  gateway     PaymentGateway
  isActive    Boolean   @default(true)
  config      Json      // gateway-specific credentials (encrypted)
  displayName String    // "JazzCash", "Easypaisa"
  logoUrl     String?
  sortOrder   Int       @default(0)
}

enum PaymentGateway {
  JAZZCASH       // Pakistan mobile wallet
  EASYPAISA      // Pakistan mobile wallet
  STRIPE         // International cards
  RAZORPAY       // Future: India expansion
  BANK_TRANSFER  // Manual bank transfer (with receipt upload)
  WALLET         // Platform internal wallet
}
```

### JazzCash Integration:

```typescript
// /modules/payments/gateways/jazzcash.service.ts
// JazzCash REST API v2.0

async initiatePayment(amount: number, phone: string, txRef: string) {
  // POST to JazzCash sandbox/production endpoint
  // Amount in PKR (integer)
  // HMAC-SHA256 signature generation
  // Returns: payment URL or MPIN push to phone
}

async verifyPayment(txRef: string): Promise<boolean> {
  // Verify via JazzCash inquiry API
  // Update wallet/subscription on success
}
```

### Easypaisa Integration:

```typescript
// /modules/payments/gateways/easypaisa.service.ts
// Telenor Easypaisa API

async initiatePayment(amount: number, msisdn: string, orderId: string) {
  // POST to Easypaisa payment endpoint
  // AES-128 encrypted payload
  // Returns: transaction reference
}
```

### Payment Endpoints:

```
POST /payments/jazzcash/initiate       → Start JazzCash payment
POST /payments/jazzcash/callback       → JazzCash IPN webhook
POST /payments/easypaisa/initiate      → Start Easypaisa payment
POST /payments/easypaisa/callback      → Easypaisa IPN webhook
POST /payments/stripe/create-intent    → Stripe PaymentIntent
POST /payments/stripe/webhook          → Stripe webhook
POST /payments/bank-transfer/submit    → Submit bank transfer receipt
PUT  /admin/payments/bank-transfer/:id → Admin verify bank transfer
GET  /payments/history                 → User payment history (in PKR + formatted)
```

---

## 📋 UPDATED LISTING MODEL (with dynamic catalog links)

```prisma
model Listing {
  id                String                  @id @default(uuid())
  title             String
  description       String
  
  // ─── Dynamic catalog references ───────────────────────────
  categoryId        String
  category          Category                @relation(fields: [categoryId], references: [id])
  productTypeId     String?
  productType       ProductType?            @relation(fields: [productTypeId], references: [id])
  attributeValues   ListingAttributeValue[]
  
  // ─── Pricing (stored as integer, currency tracked) ─────────
  pricePaisa        BigInt                  // Always stored in smallest unit
  currencyId        String                  @default("PKR")
  currency          Currency                @relation(fields: [currencyId], references: [id])
  priceNegotiable   Boolean                 @default(true)
  
  // ─── Quantity & Unit ───────────────────────────────────────
  quantity          Decimal                 @db.Decimal(12,3)
  unitId            String
  unit              Unit                    @relation(fields: [unitId], references: [id])
  minOrderQuantity  Decimal?                @db.Decimal(12,3)
  
  // ─── Seller & Location ────────────────────────────────────
  sellerId          String
  seller            User                    @relation(fields: [sellerId], references: [id])
  geoZoneId         String
  geoZone           GeoZone                 @relation(fields: [geoZoneId], references: [id])
  latitude          Float
  longitude         Float
  address           String?
  cityName          String?
  countryId         String                  @default("PK")
  country           Country                 @relation(fields: [countryId], references: [id])
  contactNumber     String?
  
  // ─── Status & Visibility ──────────────────────────────────
  status            ListingStatus           @default(ACTIVE)
  visibilityLevel   VisibilityLevel         @default(LOCAL)
  
  // ─── Media ────────────────────────────────────────────────
  images            ListingImage[]
  
  // ─── Metrics ──────────────────────────────────────────────
  viewCount         Int                     @default(0)
  interestedCount   Int                     @default(0)
  
  // ─── Relations ────────────────────────────────────────────
  escalationHistory EscalationLog[]
  transactions      Transaction[]
  
  expiresAt         DateTime?
  createdAt         DateTime                @default(now())
  updatedAt         DateTime                @updatedAt
}
```

---

## 🔐 MODULE 1 — AUTHENTICATION (Pakistan Phone Format)

```
Endpoints:
POST /auth/register
POST /auth/login
POST /auth/otp/send          → Validate +92 format before sending
POST /auth/otp/verify
POST /auth/refresh-token
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/2fa/enable
POST /auth/2fa/verify
GET  /auth/me
```

**Pakistan-specific:**
- Phone validation regex: `/^(\+92|0)?3[0-9]{9}$/`
- OTP SMS via Twilio with Pakistani number support (+92 prefix normalization)
- Default user language: `ur` (Urdu)
- Default user currency: `PKR`
- CNIC format validation for KYC: `XXXXX-XXXXXXX-X`

**Add to User model:**
```prisma
model User {
  // ... existing fields ...
  languageId      String    @default("ur")
  language        Language  @relation("UserLanguage", fields: [languageId], references: [id])
  currencyId      String    @default("PKR")
  currency        Currency  @relation(fields: [currencyId], references: [id])
  countryId       String    @default("PK")
  country         Country   @relation(fields: [countryId], references: [id])
  cnicNumber      String?   // For Pakistani KYC
  city            String?   // Karachi, Lahore, Islamabad, etc.
}
```

---

## 🌍 MODULE 3 — GEO-ZONES (Pakistan Cities)

### Seed Pakistan zones:

```typescript
// Provincial level
const provinces = ['Punjab', 'Sindh', 'KPK', 'Balochistan', 'Gilgit-Baltistan', 'AJK'];

// City level (under provinces)
const cities = {
  Punjab: ['Lahore', 'Faisalabad', 'Rawalpindi', 'Gujranwala', 'Multan', 'Sialkot'],
  Sindh: ['Karachi', 'Hyderabad', 'Sukkur', 'Larkana'],
  KPK: ['Peshawar', 'Abbottabad', 'Mardan', 'Swat'],
  Balochistan: ['Quetta', 'Gwadar', 'Turbat'],
};

// Local zones within cities (e.g., Karachi areas)
const karachiAreas = [
  'Korangi Industrial Area', 'SITE Industrial Area', 'Lyari',
  'Saddar', 'Orangi Town', 'Landhi', 'North Karachi',
  'Gulshan-e-Iqbal', 'Malir', 'Baldia Town'
];
```

---

## 🖥️ ADMIN PORTAL — CATALOG MANAGEMENT PAGES

Add these pages to the Admin Portal:

```
/catalog                           → Catalog overview dashboard
/catalog/categories                → Category tree manager (drag-drop reorder)
/catalog/categories/new            → Create category + upload icon + add translations
/catalog/categories/:id            → Edit category + manage translations (EN/UR inline)
/catalog/product-types             → All product types (filterable by category)
/catalog/product-types/new         → Create product type + translations
/catalog/product-types/:id         → Edit + manage attributes
/catalog/product-types/:id/attributes → Attribute builder (drag-drop, input type selector)
/catalog/units                     → Unit manager + translations
/catalog/units/new                 → Add unit
/languages                         → Language manager
/languages/:id/translations        → Inline translation editor (table with EN/UR columns)
/languages/:id/export              → Export translations as JSON
/currencies                        → Currency list + exchange rates
/currencies/:id/rates              → Rate history chart + manual update
/countries                         → Country config (future expansion)
/payments/gateways                 → Payment gateway config per country
```

### Key Admin Catalog Components:

```
<CategoryTreeEditor />
  → Drag-and-drop tree (react-sortable-tree or dnd-kit)
  → Inline edit name in both EN and UR side by side
  → Toggle active/inactive per row
  → Color picker for category color
  → Icon upload

<ProductTypeAttributeBuilder />
  → Visual attribute builder
  → Drag to reorder attributes
  → For each attribute: set type (SELECT/TEXT/NUMBER/BOOLEAN), required toggle
  → Add/remove options for SELECT type
  → Preview how listing form will look

<TranslationEditor />
  → Table: Key | English | Urdu | (Future Language)
  → Inline editable cells
  → Search/filter by namespace
  → Import/export JSON
  → Show missing translations highlighted in red

<CurrencyRateManager />
  → Current rates table
  → Manual rate entry form
  → Rate history line chart (Recharts)
  → "Sync from API" button

<PaymentGatewayConfig />
  → Per-country gateway list
  → Enable/disable toggle per gateway
  → Secure credential entry (masked fields)
  → Test connection button
```

---

## 📱 MOBILE APP — Localization & Pakistan UX

### Flutter Localization Setup:

```dart
// pubspec.yaml additions
dependencies:
  easy_localization: ^3.x
  flutter_localizations:
    sdk: flutter
  intl: ^x.x

// assets:
//   - assets/translations/en.json
//   - assets/translations/ur.json
//   - assets/fonts/JameelNooriNastaleeq.ttf   ← Urdu font
//   - assets/fonts/Inter-Regular.ttf
```

```dart
// main.dart
void main() async {
  await EasyLocalization.ensureInitialized();
  runApp(
    EasyLocalization(
      supportedLocales: [Locale('en'), Locale('ur')],
      path: 'assets/translations',
      fallbackLocale: Locale('en'),
      child: MyApp(),
    ),
  );
}

// Language switcher in Settings screen
// Urdu: use Directionality(textDirection: TextDirection.rtl, child: ...)
// Dynamic fetch of translations from API on version change
// Format PKR prices: NumberFormat('#,##0', 'ur_PK').format(amount)
// Format dates: DateFormat.yMMMd('ur').format(date) → "۱۵ جنوری ۲۰۲۵"
```

### Pakistan-specific UX in Mobile:

- Phone input: pre-fill `+92`, format as `0300-1234567`
- Price display: `₨ 1,500` in English; `₨ ۱٫۵۰۰` in Urdu
- Use Urdu numerals (٠١٢٣٤٥٦٧٨٩) when language is Urdu
- Map default region: Pakistan (lat: 30.3753, lng: 69.3451, zoom 5)
- Default city picker: Pakistan cities from seed list
- JazzCash/Easypaisa shown first in payment options
- CNIC field in KYC with format mask `XXXXX-XXXXXXX-X`

---

## ⚙️ PLATFORM CONFIGURATION — Pakistan Defaults

Extend the `PlatformConfig` table seed:

| Key | Default | Label |
|---|---|---|
| `default_country` | `PK` | Default Country |
| `default_currency` | `PKR` | Default Currency |
| `default_language` | `ur` | Default Language |
| `default_timezone` | `Asia/Karachi` | Default Timezone |
| `price_storage_unit` | `paisa` | Price storage unit (paisa/cents) |
| `primary_payment_gateway` | `JAZZCASH` | Primary payment gateway |
| `secondary_payment_gateway` | `EASYPAISA` | Secondary payment gateway |
| `sms_provider` | `TWILIO` | SMS provider |
| `phone_country_code` | `+92` | Default phone country code |
| `kyc_document_type` | `CNIC` | KYC document label |
| `cnic_validation_enabled` | `true` | Validate CNIC format |
| `supported_languages` | `ur,en` | Comma-separated active language IDs |
| `escalation_phase2_days` | `3` | Days before neighbor escalation |
| `escalation_phase3_days` | `7` | Days before city escalation |
| `escalation_phase4_days` | `14` | Days before public visibility |
| `interest_threshold` | `5` | Interests before escalation |
| `local_dealer_capacity_kg` | `500` | Max kg before bulk override |
| `max_images_per_listing` | `5` | Max images per listing |
| `bond_expiry_hours` | `24` | Bond download link expiry |
| `otp_expiry_seconds` | `300` | OTP TTL |
| `subscription_grace_days` | `2` | Grace period after expiry |
| `price_suggestion_enabled` | `true` | Enable AI price suggestions |
| `catalog_version_hash` | `v1` | Increment to force mobile translation refresh |

---

## 🧮 CURRENCY DISPLAY INTERCEPTOR

Build a global `CurrencyResponseInterceptor` in NestJS:

```typescript
// Automatically transforms all price fields in API responses
// Converts BigInt paisa values to formatted display strings
// Adds both raw (pricePaisa) and formatted (priceFormatted) fields
// Respects Accept-Currency header or user.currencyId

@Injectable()
export class CurrencyResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => this.transformPrices(data, requestedCurrency))
    );
  }

  // pricePaisa: 150000 → priceFormatted: "₨ 1,500" (PKR)
  // pricePaisa: 150000 → priceFormatted: "$5.40" (USD, via exchange rate)
}
```

---

## 🗃️ COMPLETE PRISMA SEED ORDER

Run seeds in this exact order:

```
1. Languages (ur, en + stubs for ar, zh, tr)
2. Currencies (PKR default + USD, AED, SAR, GBP as inactive)
3. Countries (PK default + stubs for AE, SA, GB)
4. CountryCurrency links
5. CountryLanguage links
6. Units + UnitTranslations
7. Categories + CategoryTranslations (full Pakistan catalog above)
8. ProductTypes + ProductTypeTranslations
9. ProductAttributes + options + translations (per product type)
10. PlatformConfig (all keys above)
11. Translation strings (all namespaces, EN + UR)
12. SubscriptionPlans (PKR pricing)
13. GeoZones (Pakistan provinces → cities → local areas)
14. Super Admin user account
15. Sample dealer/franchise accounts
16. Sample listings (10 listings across categories)
17. CountryPaymentGateway (JazzCash, Easypaisa, Stripe for PK)
```

---

## 🚀 ADDITIONAL PAKISTAN-SPECIFIC FEATURES

### 1. CNIC Verification Stub:
```typescript
// /modules/kyc/cnic.service.ts
// Interface for NADRA CNIC verification API
// Validate format: /^\d{5}-\d{7}-\d{1}$/
// Stub: accept any valid format, mark as MANUAL_REVIEW
// Design interface so real NADRA API can be plugged in later
```

### 2. Urdu Number Formatting:
```typescript
// /common/utils/number-format.util.ts
const urduNumerals = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
function toUrduNumerals(n: number): string {
  return String(n).replace(/[0-9]/g, d => urduNumerals[parseInt(d)]);
}
// Use in CurrencyService.format() when language === 'ur'
```

### 3. Pakistan City Autocomplete:
```typescript
// /common/data/pakistan-cities.ts
// Comprehensive list of Pakistan cities with coordinates
// Used in: listing location picker, user profile, zone selection
// Preloaded in app (no API call needed)
```

### 4. Pakistani Holidays / Business Days:
```typescript
// /common/utils/pk-calendar.ts
// Public holidays list for Pakistan
// Used in: subscription expiry calculations (grace days on holidays)
// Used in: escalation engine (pause escalation on holidays)
```

---

## 🧪 TESTING — Pakistan-specific

```typescript
// /test/pakistan.e2e-spec.ts
describe('Pakistan Market Tests', () => {
  it('should validate Pakistani phone numbers (+92)')
  it('should validate CNIC format')
  it('should return prices in PKR by default')
  it('should return Urdu translations when Accept-Language: ur')
  it('should place Karachi inside correct geo-zone')
  it('should process JazzCash payment flow')
  it('should format currency with Urdu numerals when locale=ur')
  it('should list categories with Urdu names when lang=ur')
})
```

---

## 📋 UPDATED ENV VARIABLES

```env
# Pakistan defaults
DEFAULT_COUNTRY=PK
DEFAULT_CURRENCY=PKR
DEFAULT_LANGUAGE=ur
DEFAULT_TIMEZONE=Asia/Karachi
DEFAULT_PHONE_CODE=+92

# JazzCash
JAZZCASH_MERCHANT_ID=
JAZZCASH_PASSWORD=
JAZZCASH_INTEGRITY_SALT=
JAZZCASH_ENV=sandbox           # sandbox | production
JAZZCASH_RETURN_URL=

# Easypaisa
EASYPAISA_STORE_ID=
EASYPAISA_HASH_KEY=
EASYPAISA_ENV=sandbox

# Twilio (Pakistan)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=           # Must support Pakistan +92

# Open Exchange Rates (for currency conversion)
OPEN_EXCHANGE_RATES_APP_ID=
EXCHANGE_RATE_SYNC_INTERVAL=3600000   # 1 hour

# Catalog
CATALOG_VERSION_HASH=v1        # Increment to force mobile refresh

# ... (all previous env variables remain)
```

---

## ✅ FINAL EXECUTION ORDER (UPDATED)

```
Phase 1 — Foundation
  1. Monorepo + Docker + PostgreSQL/PostGIS + Redis
  2. NestJS scaffold + all module stubs
  3. Complete Prisma schema (all models above)
  4. Run migrations
  5. Complete seed script (in order defined above)

Phase 2 — Localization Infrastructure
  6. Language module (CRUD + translation table)
  7. Currency module (CRUD + exchange rates + formatter)
  8. Country module + payment gateway config
  9. i18n middleware (Accept-Language → req.lang)
  10. CurrencyResponseInterceptor

Phase 3 — Dynamic Catalog
  11. Category module (tree CRUD + translations)
  12. ProductType module (CRUD + translations)
  13. ProductAttribute + options (EAV engine)
  14. Unit module (CRUD + translations)
  15. PriceHistory service

Phase 4 — Core Backend
  16. Auth module (JWT + OTP + CNIC validation)
  17. User + KYC (CNIC format, Pakistani phone)
  18. Geo-zones (Pakistan zones seeded)
  19. Listings (dynamic catalog, PKR pricing, attributes)
  20. Escalation Engine (Bull Queue)
  21. Subscriptions + Payments (JazzCash + Easypaisa + Stripe)
  22. Transactions + Bond/PDF (Urdu + English PDF template)
  23. Chat (Socket.io)
  24. Notifications (Urdu + English templates)
  25. Analytics
  26. Audit logs + security

Phase 5 — Admin Portal
  27. React scaffold + react-i18next + RTL support
  28. Dashboard + analytics
  29. User + KYC management
  30. Geo-zone map editor
  31. Catalog manager (categories, types, attributes, units)
  32. Translation editor (inline EN/UR table)
  33. Currency + exchange rate manager
  34. Payment gateway config
  35. Subscription plans + platform config
  36. Audit log viewer

Phase 6 — Client Portal
  37. React scaffold + Urdu RTL support
  38. Auth + language/currency switcher
  39. Listing browse (map + list, PKR prices)
  40. Create listing (dynamic attribute form from catalog)
  41. Negotiation + bond viewer (Urdu/English)
  42. Subscription + JazzCash/Easypaisa wallet

Phase 7 — Mobile App
  43. Flutter scaffold + easy_localization + Urdu font
  44. Auth (Pakistani phone format)
  45. Dynamic listing form (fetches attributes from API)
  46. Dealer/franchise flows
  47. JazzCash + Easypaisa in-app payment
  48. Push notifications (Urdu text)
  49. Android + iOS build configs
```

---

## 🎯 FINAL CURSOR AI INSTRUCTIONS

1. **Pakistan is default** — every default value, seed, and config must use PK/PKR/ur unless explicitly specified otherwise
2. **No hardcoded categories** — all product types, categories, attributes, units come from DB; admin manages them entirely via portal
3. **No hardcoded prices** — always stored as BigInt (paisa), always displayed via CurrencyService
4. **No hardcoded strings** — all user-facing text goes through i18n Translation table
5. **RTL support mandatory** — every UI component must work in both LTR (English) and RTL (Urdu)
6. **JazzCash/Easypaisa first** — list Pakistani payment methods before Stripe in all UI
7. **Currency interceptor** — every API response with monetary values must include both raw (`pricePaisa`) and formatted (`priceFormatted`) fields
8. **Translation fallback** — always fall back to English if Urdu translation key is missing
9. **Extensibility over hardcoding** — whenever you add a new language, currency, category, or country, it must require only DB inserts, zero code changes
10. **All other previous instructions remain in effect** — TypeScript strict, Prisma transactions, Swagger docs, pagination, error format, folder structure
```
