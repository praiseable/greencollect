# 🌍 GreenCollect — Geo-Franchise Marketplace Platform

> **Pakistan's leading B2B/B2C marketplace for recyclable and reusable goods**  
> Trade scrap, metals, plastics, electronics, furniture, and more with geo-fenced, franchise-controlled supply chains.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Flutter](https://img.shields.io/badge/Flutter-3.2+-blue.svg)](https://flutter.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

**GreenCollect** is a production-grade, geo-fenced, franchise-based marketplace platform designed for trading recyclable and reusable goods. Built with Pakistan as the primary market, it supports multi-country, multi-currency, and multi-language operations.

### Key Capabilities

- **Geo-Zone Based Trading**: Listings and dealers are organized by geographic zones (Country → Province → City → Local Area)
- **Dynamic Product Catalog**: Fully admin-managed categories, product types, and attributes (no hardcoded products)
- **Multi-Currency Support**: PKR (default), USD, AED, SAR, GBP with real-time exchange rates
- **Bilingual UI**: Urdu (RTL) and English with full translation management
- **Real-Time Notifications**: WebSocket-powered alerts for new listings, offers, messages
- **Interactive Maps**: Google Maps (mobile) and Leaflet/OpenStreetMap (web) for location-based browsing
- **Subscription Management**: Role-based access with subscription plans
- **Payment Integration**: JazzCash, Easypaisa, Stripe support

---

## ✨ Features

### For Buyers/Sellers (Web Client & Mobile App)

- ✅ Browse listings by category, location, price range
- ✅ Interactive map view with markers for all listings
- ✅ Create listings with photos, location picker, and detailed attributes
- ✅ Real-time chat with sellers
- ✅ Make offers and negotiate prices
- ✅ View transaction history and digital bonds
- ✅ Push notifications for new listings and messages
- ✅ Multi-language support (Urdu/English)

### For Admins (Web Admin Portal)

- ✅ Dashboard with analytics and statistics
- ✅ Manage users, roles, and permissions
- ✅ Configure categories, product types, units, and attributes
- ✅ Manage geo-zones (countries, provinces, cities)
- ✅ Translation management (add/edit UI strings)
- ✅ Currency and exchange rate management
- ✅ Language & country configuration
- ✅ Payment gateway management
- ✅ Subscription plan configuration
- ✅ System notifications and audit logs

### Technical Features

- ✅ RESTful API with WebSocket real-time support
- ✅ JWT authentication with refresh tokens
- ✅ OTP-based phone verification (Pakistan +92)
- ✅ File uploads with image optimization
- ✅ PostgreSQL with PostGIS for geographic queries
- ✅ Redis caching for performance
- ✅ Docker containerization for easy deployment
- ✅ Automated SSL certificates (Let's Encrypt)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                       │
├──────────────────┬──────────────────┬───────────────────────┤
│  Mobile App      │  Web Client      │  Web Admin            │
│  (Flutter)       │  (React.js)      │  (React.js)           │
│  Android + iOS   │  Public Portal   │  Admin Dashboard      │
└────────┬─────────┴────────┬─────────┴───────────┬───────────┘
         │                  │                      │
         └──────────────────┼──────────────────────┘
                            │
         ┌──────────────────▼──────────────────────┐
         │         Backend API (Express.js)         │
         │  ┌───────────────────────────────────┐   │
         │  │  REST API + WebSocket (Socket.io)  │  │
         │  │  Authentication (JWT + OTP)         │  │
         │  │  File Uploads (Multer)             │  │
         │  └───────────────────────────────────┘   │
         └────────┬────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼───┐   ┌────▼────┐   ┌───▼────┐
│PostgreSQL│  │  Redis  │  │  S3    │
│+ PostGIS│  │  Cache  │  │Storage │
└─────────┘  └─────────┘  └────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile** | Flutter 3.x (Dart) |
| **Web Frontend** | React.js 18, Vite, TailwindCSS |
| **Backend** | Node.js 18, Express.js |
| **ORM** | Prisma |
| **Database** | PostgreSQL 15 + PostGIS |
| **Cache** | Redis 7 |
| **Real-time** | Socket.io |
| **Maps (Web)** | Leaflet + OpenStreetMap |
| **Maps (Mobile)** | Google Maps Flutter |
| **Authentication** | JWT + Refresh Tokens + OTP |
| **File Storage** | Local (uploads/) or S3 |
| **Containerization** | Docker + Docker Compose |
| **Deployment** | Linux VM with Nginx reverse proxy |

---

## 📁 Project Structure

```
gc-app/
├── README.md                   ← You are here
│
├── docs/                        # Shared documentation
│   ├── index.md                 # Documentation hub (GitHub Pages)
│   ├── PRODUCT_OVERVIEW.md      # Product description & architecture
│   ├── USER_MANUAL.md           # End-user guide (buyers, sellers, admins)
│   ├── DATABASE_PERSISTENCE.md  # Data safety & persistence guarantees
│   ├── VALIDATION_CHECKLIST.md  # Requirements compliance tracking
│   └── prompts/                 # AI development prompts
│       ├── cursor_prompt.md     # Full-stack specification
│       └── android_avd_prompt.md# Flutter mobile app specification
│
├── backend/                     # Express.js API server
│   ├── README.md                # Backend-specific docs & API reference
│   ├── src/
│   │   ├── routes/              # API route handlers (18 modules)
│   │   ├── middleware/          # Auth, validation
│   │   ├── services/            # Business logic
│   │   └── index.js             # Entry point
│   └── prisma/
│       ├── schema.prisma        # Full database schema
│       └── seed.js              # Seeding (uses upsert — safe)
│
├── apps/
│   ├── mobile/                  # Flutter mobile app
│   │   ├── README.md            # Build, test accounts, troubleshooting
│   │   ├── lib/
│   │   │   ├── core/            # Models, providers, router, theme
│   │   │   └── features/        # Screens (16 feature modules)
│   │   └── android/             # Android native config
│   │
│   ├── web-client/              # React.js public portal
│   │   ├── README.md            # Pages, routes, map integration
│   │   └── src/                 # Components, pages, store, services
│   │
│   └── web-admin/               # React.js admin dashboard
│       ├── README.md            # Admin pages, sidebar, login
│       └── src/                 # Components, pages, services
│
├── docker-compose.yml           # Development environment
├── docker-compose.prod.yml      # Production environment
├── deploy.sh                    # Production deployment script
└── .github/workflows/
    └── deploy.yml               # CI/CD via GitHub Actions
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Docker** and Docker Compose
- **Git**

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/praiseable/greencollect.git
   cd gc-app
   ```

2. **Start services with Docker Compose**
   ```bash
   docker compose up -d
   ```
   This starts:
   - PostgreSQL (port 5432)
   - Redis (port 6379)
   - Backend API (port 4000)
   - Web Client (port 3003)
   - Web Admin (port 3002)

3. **Run database migrations and seed**
   ```bash
   docker compose exec backend npx prisma db push
   docker compose exec backend node prisma/seed.js
   ```

4. **Access the applications**
   - Web Client: http://localhost:3003
   - Web Admin: http://localhost:3002
   - API Health: http://localhost:4000/health

### Default Admin Credentials

After seeding:
- **Email**: `admin@greencollect.pk`
- **Password**: `Admin@123`
- **Role**: SUPER_ADMIN

---

## 📚 Documentation

Each project has its own README with specific instructions:

| Document | Description |
|----------|-------------|
| **[Backend README](./backend/README.md)** | API endpoints, database setup, WebSocket events |
| **[Web Client README](./apps/web-client/README.md)** | Pages, routes, map integration, Docker |
| **[Web Admin README](./apps/web-admin/README.md)** | Admin pages, sidebar navigation, login |
| **[Mobile App README](./apps/mobile/README.md)** | Build APK, test accounts, Flutter setup |
| **[User Manual](./docs/USER_MANUAL.md)** | Complete end-user guide |
| **[Product Overview](./docs/PRODUCT_OVERVIEW.md)** | Architecture, user flows, roadmap |
| **[Database Persistence](./docs/DATABASE_PERSISTENCE.md)** | Data safety guarantees |
| **[Validation Checklist](./docs/VALIDATION_CHECKLIST.md)** | Requirements compliance |

### AI Development Prompts

| Prompt | Description |
|--------|-------------|
| **[cursor_prompt.md](./docs/prompts/cursor_prompt.md)** | Full-stack specification (all modules) |
| **[android_avd_prompt.md](./docs/prompts/android_avd_prompt.md)** | Flutter mobile app specification |

---

## 🌐 Deployment

### Production Deployment (Linux VM)

1. **SSH into your server**
   ```bash
   ssh user@your-server-ip
   ```

2. **Clone and deploy**
   ```bash
   git clone https://github.com/praiseable/greencollect.git
   cd gc-app
   chmod +x deploy.sh
   ./deploy.sh
   ```

3. **Configure domain and SSL**
   - Point your domain to the server IP
   - Update `docker-compose.prod.yml` with your domain
   - Run Certbot for SSL certificates

4. **Restart services**
   ```bash
   docker compose -f docker-compose.prod.yml restart
   ```

### Environment Variables

Create `.env` files in each service directory:

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://user:password@db:5432/greencollect
REDIS_URL=redis://redis:6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
PORT=4000
NODE_ENV=production
```

**Web Client** (`apps/web-client/.env`):
```env
VITE_API_BASE_URL=https://yourdomain.com/api
```

---

## 📡 API Documentation

See **[Backend README](./backend/README.md)** for the full API reference.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login |
| `GET`  | `/api/listings` | Browse listings (geo-fenced) |
| `POST` | `/api/listings` | Create listing |
| `GET`  | `/api/categories` | List categories |
| `GET`  | `/api/geo-zones/cities` | List cities |
| `GET`  | `/api/notifications` | Get user notifications |
| `POST` | `/api/chat/messages` | Send chat message |

---

## 🧪 Testing

```bash
# Backend
cd backend && npm test

# Mobile
cd apps/mobile && flutter test

# Web Client
cd apps/web-client && npm test
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Email**: support@greencollect.pk
- **Website**: https://greencollect.pk
- **GitHub Issues**: [Report bugs or request features](https://github.com/praiseable/greencollect/issues)

---

**Made with ❤️ for Pakistan 🇵🇰**
