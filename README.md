# ♻️ GreenCollect — Smart Garbage Collection Platform

## Project Overview
A full-stack platform connecting **house owners**, **local garbage collectors**, and **regional recycling buyers** into a seamless waste management ecosystem.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        SYSTEMS MAP                          │
├──────────────────┬──────────────────┬───────────────────────┤
│  MOBILE APP      │  MOBILE BACKEND  │   WEB PORTAL          │
│  (React Native)  │  (Node.js API)   │   (React + Node.js)   │
│                  │                  │                        │
│  - House Owner   │  - REST API      │  - Admin Dashboard     │
│  - Local         │  - Push Notifs   │  - Regional Collector  │
│    Collector     │  - Geo Queries   │  - Analytics           │
│  - Regional      │  - Payments      │  - Reports             │
│    Collector     │  - File Upload   │  - User Management     │
└──────────────────┴──────────────────┴───────────────────────┘
                           │
                   ┌───────┴───────┐
                   │   DATABASE    │
                   │  PostgreSQL   │
                   │  + PostGIS    │
                   │  + Redis      │
                   └───────────────┘
```

---

## 📁 Repository Structure

```
greencollect/
├── README.md                    ← You are here
├── docs/
│   ├── FEATURES.md              ← All features (MVP + future)
│   ├── DATABASE_SCHEMA.md       ← Full DB design
│   ├── API_SPEC.md              ← API endpoints
│   └── FLOWS.md                 ← User flow diagrams
│
├── mobile-app/                  ← React Native (iOS + Android)
│   └── SETUP.md
│
├── mobile-backend/              ← Node.js + Express API
│   └── SETUP.md
│
├── web-portal/                  ← React.js frontend
│   └── SETUP.md
│
├── web-backend/                 ← Node.js + Express (Portal API)
│   └── SETUP.md
│
└── infrastructure/              ← Docker, deployment configs
    └── SETUP.md
```

---

## 👥 User Roles

| Role | Description |
|------|-------------|
| **House Owner** | Posts garbage for pickup, receives payment |
| **Local Collector** | Gets nearby notifications, collects & pays house owners |
| **Collection Point Manager** | Manages inventory at collection centers |
| **Regional Collector/Buyer** | Purchases segregated garbage types in bulk |
| **Super Admin** | Full system control via web portal |

---

## 🚀 Quick Start Order

1. Read `docs/FEATURES.md` — understand the full scope
2. Read `docs/DATABASE_SCHEMA.md` — understand data model
3. Set up `mobile-backend/` first (core API)
4. Set up `mobile-app/` (consumer-facing)
5. Set up `web-backend/` + `web-portal/` (admin/regional)
6. Read `infrastructure/SETUP.md` for deployment

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native (Expo) |
| Mobile Backend | Node.js, Express, PostgreSQL + PostGIS |
| Web Portal Frontend | React.js, TailwindCSS |
| Web Portal Backend | Node.js, Express |
| Database | PostgreSQL with PostGIS extension |
| Cache / Queues | Redis |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| File Storage | AWS S3 / Cloudinary |
| Maps | Google Maps API |
| Payments | Stripe / Razorpay |
| Auth | JWT + Refresh Tokens |
| Real-time | Socket.io |
