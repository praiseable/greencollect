# 🌍 GreenCollect — Product Overview

## Executive Summary

**GreenCollect** is a comprehensive, geo-fenced marketplace platform designed to digitize and streamline the trading of recyclable and reusable goods. Built specifically for Pakistan's recycling industry, it connects buyers, sellers, dealers, and franchises through a controlled, location-based supply chain system.

---

## 🎯 Problem Statement

The recycling and waste management industry in Pakistan faces several challenges:

1. **Fragmented Market**: Buyers and sellers struggle to find each other
2. **Geographic Barriers**: Limited visibility of materials available in different cities
3. **Price Discovery**: No transparent pricing mechanism
4. **Trust Issues**: Lack of verified dealers and transaction security
5. **Manual Processes**: Paper-based transactions, no digital records
6. **Language Barriers**: Need for bilingual (Urdu/English) interfaces

---

## 💡 Solution

GreenCollect provides a **complete digital marketplace ecosystem** that:

- ✅ Connects buyers and sellers across Pakistan
- ✅ Uses geo-zones to match local supply and demand
- ✅ Provides transparent pricing and negotiation tools
- ✅ Verifies dealers and franchises
- ✅ Digitizes transactions with digital bonds
- ✅ Supports Urdu and English languages
- ✅ Offers mobile and web access

---

## 🏗️ System Architecture

### Three-Tier Application

```
┌─────────────────────────────────────────┐
│         Client Layer                     │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  Mobile  │  │   Web    │  │  Admin │ │
│  │   App    │  │  Client  │  │ Portal │ │
│  └──────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────┘
              │         │         │
              └─────────┼─────────┘
                        │
        ┌───────────────▼───────────────┐
        │      API Layer (Express.js)    │
        │  REST API + WebSocket (Socket.io) │
        └───────────────┬───────────────┘
                        │
        ┌───────────────▼───────────────┐
        │      Data Layer               │
        │  PostgreSQL + PostGIS         │
        │  Redis (Cache)                │
        │  File Storage (S3/Local)      │
        └───────────────────────────────┘
```

### Core Modules

1. **Authentication & Authorization**
   - JWT-based authentication
   - Role-based access control (RBAC)
   - OTP phone verification
   - Refresh token mechanism

2. **User Management**
   - Multi-role system (SUPER_ADMIN, ADMIN, COLLECTION_MANAGER, DEALER, BUYER)
   - Profile management
   - Subscription-based access

3. **Listing Management**
   - Create, edit, delete listings
   - Image uploads (up to 5 per listing)
   - Location-based listing (latitude/longitude)
   - Category and attribute system

4. **Geo-Zone System**
   - Hierarchical zones: Country → Province → City → Local Area
   - PostGIS for geographic queries
   - Radius-based matching

5. **Product Catalog**
   - Dynamic categories (admin-managed)
   - Product types with attributes (EAV model)
   - Multi-language support

6. **Real-Time Communication**
   - WebSocket-based chat
   - Push notifications
   - Real-time listing updates

7. **Payment Integration**
   - JazzCash
   - Easypaisa
   - Stripe (international)

8. **Multi-Currency & Multi-Language**
   - PKR (default), USD, AED, SAR, GBP
   - Exchange rate management
   - Urdu (RTL) and English support

---

## 🎨 User Interfaces

### 1. Mobile App (Flutter)

**Target Users**: Buyers, Sellers, Dealers

**Key Screens**:
- Home (browse listings, categories)
- Listing Detail (full details, map, contact)
- Create Listing (form with map picker)
- Chat (real-time messaging)
- Profile (user settings, my listings)
- Notifications (push notifications)

**Features**:
- Offline mode (cached listings)
- GPS location picker
- Camera integration for photos
- Push notifications
- Bilingual UI (Urdu/English)

### 2. Web Client Portal (React.js)

**Target Users**: Buyers, Sellers, Dealers

**Key Pages**:
- Home (featured listings, categories)
- Browse Listings (grid + map view toggle)
- Listing Detail (full details, map, chat)
- Create Listing (form with Leaflet map)
- Dashboard (my listings, transactions)
- Profile (settings, subscription)

**Features**:
- Responsive design (mobile, tablet, desktop)
- Interactive map (Leaflet/OpenStreetMap)
- Real-time notifications (WebSocket)
- Search and filters
- Bilingual UI

### 3. Web Admin Portal (React.js)

**Target Users**: Super Admins, Admins, Collection Managers

**Key Sections**:
- Dashboard (analytics, stats)
- Users (manage users, roles)
- Listings (manage all listings)
- Categories (manage product catalog)
- Geo-Zones (manage locations)
- Translations (manage UI strings)
- Currencies (manage exchange rates)
- Subscriptions (manage plans)
- Analytics (reports, insights)

**Features**:
- Role-based access control
- Bulk operations
- Export/import data
- System configuration
- Audit logs

---

## 🔄 User Flows

### Flow 1: Seller Creates Listing

```
1. Seller logs in (mobile/web)
2. Clicks "Post Listing"
3. Fills in details:
   - Title, category, quantity, price
   - Selects location on map
   - Uploads photos
   - Adds description
4. Submits listing
5. Listing appears in browse/search
6. Admins receive notification
7. Buyers can view and contact
```

### Flow 2: Buyer Finds and Contacts Seller

```
1. Buyer browses listings (grid or map)
2. Applies filters (category, city, price)
3. Clicks on listing
4. Views details, photos, map
5. Clicks "Contact Seller"
6. Sends message via chat
7. Seller receives notification
8. Negotiate via chat
9. Agree on terms
10. Complete transaction
```

### Flow 3: Admin Manages System

```
1. Admin logs into admin portal
2. Views dashboard (stats, alerts)
3. Manages users (activate, deactivate, change roles)
4. Manages listings (approve, reject, edit)
5. Configures categories and products
6. Updates translations
7. Manages geo-zones
8. Views analytics and reports
```

---

## 📊 Key Metrics & Analytics

### For Users
- Total listings posted
- Views per listing
- Messages received
- Transactions completed
- Revenue generated

### For Admins
- Total users (by role)
- Active listings
- Transactions per period
- Geographic distribution
- Category popularity
- Revenue by currency
- User growth trends

---

## 🔐 Security Features

1. **Authentication**
   - JWT tokens with expiration
   - Refresh token rotation
   - OTP phone verification
   - Password hashing (bcrypt)

2. **Authorization**
   - Role-based access control
   - Resource-level permissions
   - API rate limiting

3. **Data Protection**
   - Encrypted database connections
   - Secure file uploads
   - Input validation and sanitization
   - SQL injection prevention (Prisma ORM)

4. **Privacy**
   - User data encryption
   - GDPR-compliant data handling
   - Audit logs for compliance

---

## 🌐 Internationalization

### Supported Languages
- **Urdu** (اردو) - RTL, default for Pakistan
- **English** - LTR, secondary

### Supported Currencies
- **PKR** (₨) - Pakistani Rupee (default)
- **USD** ($) - US Dollar
- **AED** (د.إ) - UAE Dirham
- **SAR** (﷼) - Saudi Riyal
- **GBP** (£) - British Pound

### Supported Countries
- **Pakistan** (PK) - Primary market
- Extensible for other countries

---

## 🚀 Deployment & Infrastructure

### Development
- Docker Compose for local development
- Hot reload for frontend
- Database migrations via Prisma

### Production
- Linux VM deployment
- Docker containers
- Nginx reverse proxy
- SSL certificates (Let's Encrypt)
- Automated deployment via GitHub Actions

### Scalability
- Horizontal scaling (multiple API instances)
- Redis caching for performance
- Database connection pooling
- CDN for static assets (future)

---

## 📈 Roadmap

### Phase 1 (Current) ✅
- Core marketplace functionality
- User authentication
- Listing management
- Basic chat
- Admin portal

### Phase 2 (Planned)
- Advanced analytics
- Mobile app optimization
- Payment gateway integration
- Digital bonds generation
- Escalation engine

### Phase 3 (Future)
- AI-powered price recommendations
- Automated matching
- Blockchain for transaction records
- Multi-country expansion
- Advanced reporting

---

## 🎓 Training & Support

### User Training
- Video tutorials
- Step-by-step guides
- FAQ section
- In-app help

### Admin Training
- Admin portal documentation
- Best practices guide
- System configuration guide
- Troubleshooting guide

### Support Channels
- Email support
- In-app chat support
- Phone support (business hours)
- Knowledge base

---

## 📞 Contact Information

- **Website**: https://greencollect.pk
- **Email**: info@greencollect.pk
- **Support**: support@greencollect.pk
- **Phone**: +92-XXX-XXXXXXX

---

**Document Version**: 2.0.0  
**Last Updated**: March 2026  
**Status**: Production Ready
