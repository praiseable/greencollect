# 🛡️ GreenCollect Web Admin Portal

> React.js + Vite + TailwindCSS — Administration Dashboard

---

## 📋 Overview

The admin portal is a **React.js** dashboard for platform administrators. It provides full control over users, the dynamic product catalog (categories, product types, units), geo-zones, translations, currencies, languages, countries, payment gateways, subscriptions, analytics, and system notifications.

---

## 🛠️ Tech Stack

| Component       | Technology                           |
|-----------------|--------------------------------------|
| Framework       | React.js 18                          |
| Build Tool      | Vite                                 |
| Styling         | TailwindCSS                          |
| Routing         | React Router DOM v6                  |
| HTTP            | Axios                                |
| Notifications   | React-Toastify                       |
| Icons           | React-Icons (Feather)                |
| Charts          | (built-in analytics)                 |

---

## 📁 Project Structure

```
apps/web-admin/
├── src/
│   ├── App.jsx                # Routes with ProtectedRoute guard
│   ├── main.jsx               # Entry point
│   ├── index.css              # Tailwind imports
│   ├── components/
│   │   └── Layout.jsx         # Sidebar + top bar + notifications
│   ├── pages/
│   │   ├── Login.jsx          # Admin login (email + password)
│   │   ├── Dashboard.jsx      # Stats, charts, recent activity
│   │   ├── Users.jsx          # User management (roles, status)
│   │   ├── Categories.jsx     # Category tree management
│   │   ├── ProductTypes.jsx   # Product types + EAV attributes
│   │   ├── Units.jsx          # Units of measurement management
│   │   ├── Listings.jsx       # All listings (approve, reject, edit)
│   │   ├── GeoZones.jsx       # Geo-zone hierarchy management
│   │   ├── Languages.jsx      # Language configuration (LTR/RTL)
│   │   ├── Translations.jsx   # Translation key-value editor
│   │   ├── Countries.jsx      # Country & region config
│   │   ├── Currencies.jsx     # Currency & exchange rate management
│   │   ├── Payments.jsx       # Payment gateways & payment history
│   │   ├── Subscriptions.jsx  # Subscription plan management
│   │   ├── Analytics.jsx      # Reports & insights
│   │   └── Notifications.jsx  # System notification management
│   └── services/
│       └── api.js             # Axios instance & API helpers
├── public/                    # Static assets
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── Dockerfile                 # Multi-stage Nginx build
├── nginx.conf
├── .dockerignore
└── README.md                  # This file
```

---

## 🚀 Quick Start

### 1. Environment Setup

Create `apps/web-admin/.env`:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### 2. Install & Run

```bash
cd apps/web-admin
npm install
npm run dev
```

Opens at `http://localhost:5174` (Vite dev server)

### 3. Build for Production

```bash
npm run build
# Output: dist/
```

---

## 🔐 Admin Login

| Field    | Value                    |
|----------|--------------------------|
| Email    | `admin@greencollect.pk`  |
| Password | `Admin@123`              |

---

## 📄 Pages & Routes

### 📱 Marketplace (same as mobile app)

These routes mirror the mobile app so the portal and app behave the same:

| Route | Component | Description |
|-------|-----------|-------------|
| `/marketplace` | MarketplaceHome | Home: welcome, Post Listing, search, categories, recent listings |
| `/marketplace/listings` | MarketplaceListings | Browse listings (same API as app, with search/category filter) |
| `/marketplace/create` | CreateListing | Post a listing (category, details, location, preview → POST /listings) |
| `/marketplace/listing/:id` | ListingDetail | Listing detail: price, description, seller, Call / Message (→ chat) |
| `/marketplace/profile` | Profile | Current user profile + quick links (Wallet, Territory, Chat, etc.) |
| `/marketplace/chat` | ChatInbox | Chat inbox (conversations list) |
| `/marketplace/chat/:userId` | Chat | Conversation with a user (send/receive messages) |
| `/marketplace/transactions` | TransactionsApp | Transactions: Active / Completed / Cancelled tabs |
| `/marketplace/transactions/:id` | TransactionDetail | Transaction detail, accept/reject, bond view |
| `/marketplace/wallet` | Wallet | Wallet balance (same as app) |

All of the above use the same backend API as the mobile app (`/api/listings`, `/api/chat`, `/api/transactions`, `/api/notifications`, `/api/auth/me`, etc.), so data is consistent between portal and app.

### Admin-only routes

| Route                  | Component      | Description                           |
|------------------------|----------------|---------------------------------------|
| `/login`               | Login          | Admin authentication                  |
| `/dashboard`           | Dashboard      | Analytics, stats, recent activity     |
| `/users`               | Users          | Manage users, roles, KYC status       |
| `/catalog/categories`  | Categories     | Category tree with translations       |
| `/catalog/product-types` | ProductTypes | Product types + EAV attributes        |
| `/catalog/units`       | Units          | Measurement units (kg, ton, etc.)     |
| `/listings`            | Listings       | All listings (admin view), approve/reject/edit     |
| `/geo-zones`           | GeoZones       | Country → Province → City → Area      |
| `/languages`           | Languages      | Language config (code, direction, flag)|
| `/translations`        | Translations   | Translation key-value pairs by locale |
| `/countries`           | Countries      | Country settings (phone, timezone)    |
| `/currencies`          | Currencies     | Currency & exchange rate management   |
| `/payments`            | Payments       | Payment gateway config & history      |
| `/subscriptions`       | Subscriptions  | Subscription plan management          |
| `/analytics`           | Analytics      | Reports and insights                  |
| `/notifications`       | Notifications  | System notification management        |

---

## 🗂️ Sidebar Navigation

```
📊 Dashboard
📱 Marketplace (same as app)
   ├── Home
   ├── Post Listing
   ├── Browse Listings
   ├── Profile
   ├── Chat Inbox
   ├── Transactions
   └── Wallet
👥 Users
📦 Catalog
   ├── Categories
   ├── Product Types
   └── Units
📋 Listings
📍 Geo Zones
🌐 Localization
   ├── Languages
   ├── Translations
   └── Countries
💰 Currencies
⚙️  Payments
💳 Subscriptions
📈 Analytics
🔔 Notifications
```

---

## 🐳 Docker

```bash
# Build image
docker build -t gc-web-admin .

# Run container
docker run -p 3002:80 gc-web-admin
```

- Served by Nginx on port 80 inside container
- Exposed on port 3002 in docker-compose

---

## 🔗 Related Docs

- [Project README](../../README.md) — Overall setup & deployment
- [Backend API](../../backend/README.md) — API endpoints reference
- [User Manual — Admin Section](../../docs/USER_MANUAL.md#for-administrators) — Admin user guide
- [Original Requirements](../../docs/prompts/cursor_prompt.md) — Full specification

---

**Last Updated**: March 2026
