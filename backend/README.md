# 🖥️ GreenCollect Backend API

> Express.js + Prisma + PostgreSQL + Socket.io

---

## 📋 Overview

The backend is a **Node.js Express** application providing RESTful APIs and real-time WebSocket communication for the entire GreenCollect platform (web client, web admin, and mobile app). It uses **Prisma ORM** with **PostgreSQL + PostGIS** for data storage and geo-queries, **Redis** for caching, and **Socket.io** for real-time notifications and chat.

---

## 🛠️ Tech Stack

| Component       | Technology                            |
|-----------------|---------------------------------------|
| Runtime         | Node.js 18+                           |
| Framework       | Express.js                            |
| ORM             | Prisma                                |
| Database        | PostgreSQL 15 + PostGIS               |
| Cache           | Redis 7                               |
| Real-time       | Socket.io                             |
| Auth            | JWT + Refresh Tokens + OTP            |
| File Upload     | Multer                                |
| Validation      | express-validator                     |
| Security        | helmet, cors, rate-limiting           |

---

## 📁 Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma           # Full database schema
│   └── seed.js                 # Database seeding (uses upsert — safe to re-run)
├── src/
│   ├── index.js                # App entry — Express + Socket.io setup
│   ├── middleware/
│   │   └── auth.js             # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.routes.js      # Register, Login, OTP, Refresh Token
│   │   ├── listings.routes.js  # CRUD listings + geo-fencing
│   │   ├── users.routes.js     # User management
│   │   ├── categories.routes.js
│   │   ├── productTypes.routes.js
│   │   ├── units.routes.js
│   │   ├── geoZones.routes.js
│   │   ├── notifications.routes.js
│   │   ├── chat.routes.js
│   │   ├── subscriptions.routes.js
│   │   ├── payments.routes.js
│   │   ├── transactions.routes.js
│   │   ├── currencies.routes.js
│   │   ├── languages.routes.js
│   │   ├── translations.routes.js
│   │   ├── countries.routes.js
│   │   ├── admin.routes.js     # Admin-only operations
│   │   └── analytics.routes.js # Analytics & reports
│   └── services/
│       ├── prisma.js           # Prisma client singleton
│       ├── currency.service.js # Currency conversion & formatting
│       └── geoFencing.service.js # Geo-fencing logic
├── uploads/                    # Uploaded files (gitignored)
├── Dockerfile                  # Multi-stage Alpine build
├── package.json
└── README.md                   # This file
```

---

## 🚀 Quick Start

### 1. Environment Setup

Create `backend/.env`:

```env
DATABASE_URL=postgresql://gcadmin:gcpassword@localhost:5432/greencollect
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key
PORT=4000
NODE_ENV=development
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Database Setup

```bash
# Push schema to database (non-destructive)
npx prisma db push

# Seed initial data (countries, currencies, languages, categories, admin user)
node prisma/seed.js

# Open Prisma Studio (visual DB browser)
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
# or
node src/index.js
```

Server starts at `http://localhost:4000`

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint                  | Auth | Description                   |
|--------|---------------------------|------|-------------------------------|
| POST   | `/api/auth/register`      | ❌   | Register new user             |
| POST   | `/api/auth/login`         | ❌   | Login (email/phone + password)|
| POST   | `/api/auth/send-otp`      | ❌   | Send OTP to phone             |
| POST   | `/api/auth/verify-otp`    | ❌   | Verify OTP code               |
| POST   | `/api/auth/refresh-token` | ❌   | Refresh JWT token             |

### Listings

| Method | Endpoint                  | Auth | Description                   |
|--------|---------------------------|------|-------------------------------|
| GET    | `/api/listings`           | ❌   | Browse listings (geo-fenced)  |
| GET    | `/api/listings/:id`       | ❌   | Get listing detail            |
| POST   | `/api/listings`           | ✅   | Create listing                |
| PUT    | `/api/listings/:id`       | ✅   | Update listing                |
| DELETE | `/api/listings/:id`       | ✅   | Delete listing                |
| POST   | `/api/listings/:id/images`| ✅   | Upload listing images         |

### Categories & Catalog

| Method | Endpoint                     | Auth | Description                   |
|--------|------------------------------|------|-------------------------------|
| GET    | `/api/categories`            | ❌   | List all categories           |
| GET    | `/api/product-types`         | ❌   | List product types            |
| GET    | `/api/units`                 | ❌   | List measurement units        |

### Geo-Zones

| Method | Endpoint                     | Auth | Description                   |
|--------|------------------------------|------|-------------------------------|
| GET    | `/api/geo-zones`             | ❌   | List geo-zones                |
| GET    | `/api/geo-zones/cities`      | ❌   | List cities                   |

### Users & Profiles

| Method | Endpoint                     | Auth | Description                   |
|--------|------------------------------|------|-------------------------------|
| GET    | `/api/users/me`              | ✅   | Get current user profile      |
| PUT    | `/api/users/me`              | ✅   | Update profile                |

### Notifications

| Method | Endpoint                     | Auth | Description                   |
|--------|------------------------------|------|-------------------------------|
| GET    | `/api/notifications`         | ✅   | List user notifications       |
| PUT    | `/api/notifications/:id/read`| ✅   | Mark notification as read     |
| PUT    | `/api/notifications/read-all`| ✅   | Mark all as read              |

### Chat

| Method | Endpoint                     | Auth | Description                   |
|--------|------------------------------|------|-------------------------------|
| GET    | `/api/chat/rooms`            | ✅   | List chat rooms               |
| GET    | `/api/chat/rooms/:id`        | ✅   | Get room messages             |
| POST   | `/api/chat/messages`         | ✅   | Send message                  |

### Transactions

| Method | Endpoint                     | Auth | Description                   |
|--------|------------------------------|------|-------------------------------|
| GET    | `/api/transactions`          | ✅   | List user transactions        |
| POST   | `/api/transactions`          | ✅   | Create transaction            |
| PUT    | `/api/transactions/:id`      | ✅   | Update transaction status     |

### Subscriptions & Payments

| Method | Endpoint                     | Auth | Description                   |
|--------|------------------------------|------|-------------------------------|
| GET    | `/api/subscriptions/plans`   | ❌   | List subscription plans       |
| POST   | `/api/subscriptions`         | ✅   | Subscribe to a plan           |
| POST   | `/api/payments/initiate`     | ✅   | Start a payment               |
| POST   | `/api/payments/callback`     | ❌   | Payment gateway callback      |

### Localization

| Method | Endpoint                     | Auth | Description                   |
|--------|------------------------------|------|-------------------------------|
| GET    | `/api/languages`             | ❌   | List languages                |
| GET    | `/api/translations`          | ❌   | Get translations              |
| GET    | `/api/currencies`            | ❌   | List currencies               |
| GET    | `/api/countries`             | ❌   | List countries                |

### Admin (requires ADMIN/SUPER_ADMIN role)

| Method | Endpoint                     | Auth  | Description                  |
|--------|------------------------------|-------|------------------------------|
| GET    | `/api/admin/dashboard`       | ADMIN | Dashboard statistics         |
| GET    | `/api/admin/users`           | ADMIN | Manage all users             |
| POST   | `/api/admin/categories`      | ADMIN | Create category              |
| POST   | `/api/admin/product-types`   | ADMIN | Create product type          |
| POST   | `/api/admin/geo-zones`       | ADMIN | Create geo-zone              |
| POST   | `/api/admin/translations`    | ADMIN | Add translation              |

---

## 🔌 WebSocket Events (Socket.io)

| Event               | Direction      | Description                    |
|---------------------|----------------|--------------------------------|
| `connection`        | Client → Server| Client connects (sends JWT)    |
| `new_listing`       | Server → Client| New listing in user's zone     |
| `new_notification`  | Server → Client| Any notification for user      |
| `chat_message`      | Bi-directional | Chat message in a room         |
| `join_room`         | Client → Server| Join a chat room               |

---

## 🐳 Docker

```dockerfile
# Build: multi-stage Alpine image
FROM node:18-alpine
RUN apk add --no-cache openssl openssl-dev
# ... see Dockerfile for full config
```

Key Docker config:
- **Port**: 4000
- **Binary targets**: `linux-musl-openssl-3.0.x` (for Alpine)
- **Health check**: `GET /health`

---

## 🔐 Default Admin Credentials

After running `node prisma/seed.js`:

| Field    | Value                    |
|----------|--------------------------|
| Email    | `admin@greencollect.pk`  |
| Password | `Admin@123`              |
| Role     | SUPER_ADMIN              |

---

## 🔒 Database Safety

- **`prisma db push`** is non-destructive (never drops tables)
- **Seed script** uses `upsert` (safe to re-run)
- **Docker volumes** are named and persistent
- See [Database Persistence](../docs/DATABASE_PERSISTENCE.md) for full details

---

## 🔗 Related Docs

- [Project README](../README.md) — Overall project setup & deployment
- [Database Persistence](../docs/DATABASE_PERSISTENCE.md) — Data safety guarantees
- [Validation Checklist](../docs/VALIDATION_CHECKLIST.md) — Requirements compliance
- [Original Requirements](../docs/prompts/cursor_prompt.md) — Full specification

---

**Last Updated**: March 2026
