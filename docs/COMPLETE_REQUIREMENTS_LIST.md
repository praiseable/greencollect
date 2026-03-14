# Complete Requirements List - Kabariya Platform

**Date:** 2026-03-14  
**Status:** Comprehensive documentation of all implemented requirements

---

## 📋 Table of Contents

1. [Architecture Requirements](#1-architecture-requirements)
2. [Portal Requirements](#2-portal-requirements)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [API Endpoints](#4-api-endpoints)
5. [Mobile App Requirements](#5-mobile-app-requirements)
6. [Web Admin Requirements](#6-web-admin-requirements)
7. [Web Client Requirements](#7-web-client-requirements)
8. [Security Requirements](#8-security-requirements)
9. [Database & Data Models](#9-database--data-models)
10. [Real-time Features](#10-real-time-features)
11. [Business Logic Requirements](#11-business-logic-requirements)

---

## 1. Architecture Requirements

### 1.1 Microservices Architecture ✅

**Implemented:**
- ✅ **API Gateway** (Port 4000) - Routes requests, validates JWTs, sets X-User-* headers
- ✅ **Auth Service** (Port 5000) - Authentication and authorization
- ✅ **Admin Service** (Port 5001) - Admin portal APIs
- ✅ **Customer Service** (Port 5002) - Customer portal APIs
- ✅ **Legacy Backend** (Port 4001) - Backward compatibility during migration

**Features:**
- ✅ JWT validation in gateway
- ✅ X-User-* header injection
- ✅ Portal guard enforcement
- ✅ Service-to-service authentication (X-Internal-Service-Secret)
- ✅ Optional auth for public routes

### 1.2 Technology Stack

**Backend:**
- ✅ Node.js 18+ with Express.js
- ✅ PostgreSQL 15 with PostGIS (geospatial data)
- ✅ Prisma ORM
- ✅ Redis 7 (caching, rate limiting, refresh tokens)
- ✅ Socket.io (real-time communication)

**Frontend:**
- ✅ React.js 18 with Vite
- ✅ TailwindCSS
- ✅ Axios for API calls

**Mobile:**
- ✅ Flutter 3.x (Dart)
- ✅ Riverpod for state management
- ✅ GoRouter for navigation

**Infrastructure:**
- ✅ Docker & Docker Compose
- ✅ Nginx for web serving

---

## 2. Portal Requirements

### 2.1 Supported Portals

| Portal | Roles | Description |
|--------|-------|-------------|
| **Admin** | SUPER_ADMIN, ADMIN, ADMIN_VIEWER, COLLECTION_MANAGER | System administration |
| **Customer** | CUSTOMER, PREMIUM_CUSTOMER | End users (mobile app) |
| **Dealer** | DEALER, FRANCHISE_OWNER, REGIONAL_MANAGER, WHOLESALE_BUYER | Dealers/franchises (Pro app) |
| **Vendor** | VENDOR_OWNER, VENDOR_STAFF | Vendor management (planned) |
| **Agent** | AGENT, AGENT_LEAD | Agent management (planned) |

### 2.2 Portal-Specific Features

**Admin Portal:**
- ✅ Dashboard with statistics
- ✅ User management
- ✅ Listing management
- ✅ Transaction oversight
- ✅ Audit log viewer
- ✅ Category management
- ✅ Territory management
- ✅ Analytics

**Customer Portal (Mobile App):**
- ✅ Browse listings
- ✅ Create listings
- ✅ Manage transactions
- ✅ Chat with dealers
- ✅ Wallet management
- ✅ Profile management
- ✅ Notifications
- ✅ Collections (favorites)

**Dealer Portal (Pro Mobile App):**
- ✅ View territory listings
- ✅ Manage collections
- ✅ Negotiate transactions
- ✅ View analytics
- ✅ Territory management
- ✅ Dealer ratings
- ✅ Balance gate (paywall)

**Web Client:**
- ✅ Customer-facing web interface
- ✅ Listing browsing
- ✅ Registration/Login

---

## 3. Authentication & Authorization

### 3.1 Authentication Methods

**Implemented:**
- ✅ Email/Password login
- ✅ Phone/OTP login (mobile)
- ✅ Portal-specific login endpoints:
  - `POST /auth/admin/login`
  - `POST /auth/customer/login`
  - `POST /auth/dealer/login`
- ✅ Token refresh mechanism
- ✅ Logout with token revocation

### 3.2 JWT Token Structure

**Access Token Payload:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "portal": "admin|customer|dealer|vendor|agent",
  "roles": ["ADMIN", "SUPER_ADMIN"],
  "iat": 1700000000,
  "exp": 1700000900
}
```

**Token Expiry:**
- ✅ Access tokens: 15 minutes
- ✅ Refresh tokens: 7 days (stored in Redis/HttpOnly cookies)

### 3.3 Security Features

**Implemented:**
- ✅ HttpOnly cookies for refresh tokens (web)
- ✅ Redis storage for refresh tokens
- ✅ Token family tracking (revoke all on reuse)
- ✅ Login throttling (5 attempts per 15 minutes)
- ✅ Password hashing (bcrypt, 12 rounds)
- ✅ Portal check middleware
- ✅ Role-based authorization
- ✅ X-Token-Error headers (tokenExpired/tokenInvalid)

### 3.4 Authorization Levels

**Role Hierarchy:**
1. **SUPER_ADMIN** - Full system access
2. **ADMIN** - Administrative access
3. **ADMIN_VIEWER** - Read-only admin access
4. **COLLECTION_MANAGER** - Collection management
5. **FRANCHISE_OWNER** - Franchise management
6. **REGIONAL_MANAGER** - Regional oversight
7. **DEALER** - Local dealer operations
8. **WHOLESALE_BUYER** - Wholesale operations
9. **CUSTOMER** - Standard customer
10. **PREMIUM_CUSTOMER** - Premium features

---

## 4. API Endpoints

### 4.1 Authentication Endpoints

**Auth Service:**
- ✅ `POST /auth/register` - User registration
- ✅ `POST /auth/login` - Generic login
- ✅ `POST /auth/admin/login` - Admin portal login
- ✅ `POST /auth/customer/login` - Customer portal login
- ✅ `POST /auth/dealer/login` - Dealer portal login
- ✅ `POST /auth/refresh` - Refresh access token
- ✅ `POST /auth/logout` - Logout (revoke tokens)
- ✅ `GET /auth/me` - Get current user profile
- ✅ `GET /auth/validate` - Validate token (gateway)
- ✅ `POST /auth/otp/send` - Send OTP
- ✅ `POST /auth/otp/verify` - Verify OTP

### 4.2 Category Endpoints

**Customer Service:**
- ✅ `GET /api/categories` - Get category tree (public, optional auth)
- ✅ `GET /api/categories/:id` - Get category details
- ✅ `GET /api/categories/:id/product-types` - Get product types
- ✅ `POST /api/categories` - Create category (admin)
- ✅ `PUT /api/categories/:id` - Update category (admin)
- ✅ `DELETE /api/categories/:id` - Soft delete category (admin)
- ✅ `POST /api/categories/:id/translations` - Add/update translation (admin)

### 4.3 Listing Endpoints

**Customer Service:**
- ✅ `GET /api/listings` - Browse listings (public, optional auth)
- ✅ `GET /api/listings/:id` - Get listing details
- ✅ `GET /api/listings/my` - Get user's listings (authenticated)
- ✅ `GET /api/listings/favorites` - Get favorite listings
- ✅ `POST /api/listings` - Create listing (authenticated)
- ✅ `PUT /api/listings/:id` - Update listing (owner)
- ✅ `PATCH /api/listings/:id/deactivate` - Deactivate listing
- ✅ `PATCH /api/listings/:id/reactivate` - Reactivate listing
- ✅ `DELETE /api/listings/:id` - Delete listing (owner)
- ✅ `POST /api/listings/:id/favorite` - Add to favorites
- ✅ `POST /api/listings/:id/report` - Report listing
- ✅ `POST /api/listings/:id/images` - Upload listing images
- ✅ `POST /api/listings/:id/interest` - Express interest

**Features:**
- ✅ Geo-fencing (territory-based visibility)
- ✅ Category filtering
- ✅ Price range filtering
- ✅ Search functionality
- ✅ Sorting options
- ✅ Pagination

### 4.4 Transaction Endpoints

**Backend:**
- ✅ `GET /api/transactions` - Get user transactions
- ✅ `GET /api/transactions/:id` - Get transaction details
- ✅ `POST /api/transactions` - Create transaction
- ✅ `PUT /api/transactions/:id` - Update transaction
- ✅ `POST /api/transactions/:id/negotiate` - Negotiate price
- ✅ `POST /api/transactions/:id/accept` - Accept transaction
- ✅ `POST /api/transactions/:id/reject` - Reject transaction
- ✅ `GET /api/transactions/:id/bond` - Get transaction bond

**Features:**
- ✅ Price negotiation
- ✅ Transaction status tracking
- ✅ Bond generation
- ✅ Payment processing

### 4.5 Chat Endpoints

**Backend:**
- ✅ `GET /api/chat/rooms` - Get chat rooms
- ✅ `GET /api/chat/rooms/:roomId/messages` - Get messages
- ✅ `POST /api/chat/rooms/:roomId/messages` - Send message
- ✅ `POST /api/chat/rooms` - Create chat room
- ✅ `PUT /api/chat/rooms/:roomId/read` - Mark as read

**Real-time:**
- ✅ Socket.io for real-time messaging
- ✅ Message delivery status
- ✅ Typing indicators

### 4.6 Notification Endpoints

**Backend:**
- ✅ `GET /api/notifications` - Get notifications
- ✅ `PUT /api/notifications/:id/read` - Mark as read
- ✅ `PUT /api/notifications/read-all` - Mark all as read
- ✅ `DELETE /api/notifications/:id` - Delete notification

**Types:**
- ✅ Transaction updates
- ✅ Chat messages
- ✅ Listing interest
- ✅ System notifications

### 4.7 Admin Endpoints

**Admin Service:**
- ✅ `GET /api/admin/dashboard` - Dashboard statistics
- ✅ `GET /api/admin/audit-logs` - Audit log viewer
- ✅ `GET /api/admin/all-listings` - All listings (admin view)
- ✅ `PUT /api/admin/listings/:id/status` - Update listing status
- ✅ `GET /api/admin/users` - User management
- ✅ `PUT /api/admin/users/:id` - Update user
- ✅ `GET /api/admin/analytics` - Analytics data

### 4.8 Collection Endpoints

**Backend:**
- ✅ `GET /api/collections` - Get collections (dealer)
- ✅ `GET /api/collections/:id` - Get collection details
- ✅ `POST /api/collections` - Create collection
- ✅ `PUT /api/collections/:id` - Update collection
- ✅ `DELETE /api/collections/:id` - Delete collection
- ✅ `POST /api/collections/:id/rate` - Rate dealer

### 4.9 User Management Endpoints

**Backend:**
- ✅ `GET /api/users` - Get users (admin)
- ✅ `GET /api/users/:id` - Get user details
- ✅ `PUT /api/users/:id` - Update user
- ✅ `POST /api/users/:id/activate` - Activate user
- ✅ `POST /api/users/:id/deactivate` - Deactivate user
- ✅ `GET /api/users/:id/wallet` - Get wallet balance

### 4.10 Territory Endpoints

**Backend:**
- ✅ `GET /api/territories` - Get territories
- ✅ `GET /api/territories/:id` - Get territory details
- ✅ `POST /api/territories` - Create territory (admin)
- ✅ `PUT /api/territories/:id` - Update territory (admin)
- ✅ `DELETE /api/territories/:id` - Delete territory (admin)

### 4.11 KYC Endpoints

**Backend:**
- ✅ `GET /api/kyc` - Get KYC status
- ✅ `POST /api/kyc` - Submit KYC documents
- ✅ `PUT /api/kyc/:id/verify` - Verify KYC (admin)

### 4.12 Wallet & Payment Endpoints

**Backend:**
- ✅ `GET /api/wallet` - Get wallet balance
- ✅ `POST /api/wallet/recharge` - Recharge wallet
- ✅ `GET /api/payments` - Get payment history
- ✅ `POST /api/payments` - Process payment

### 4.13 Subscription Endpoints

**Backend:**
- ✅ `GET /api/subscriptions` - Get subscription plans
- ✅ `GET /api/subscriptions/my` - Get user subscription
- ✅ `POST /api/subscriptions` - Subscribe to plan
- ✅ `PUT /api/subscriptions/:id/cancel` - Cancel subscription

### 4.14 Analytics Endpoints

**Backend:**
- ✅ `GET /api/analytics/dashboard` - Dashboard analytics
- ✅ `GET /api/analytics/listings` - Listing analytics
- ✅ `GET /api/analytics/transactions` - Transaction analytics
- ✅ `GET /api/analytics/users` - User analytics

### 4.15 Config Endpoints

**Backend:**
- ✅ `GET /api/config` - Get system configuration
- ✅ `GET /api/config/countries` - Get countries
- ✅ `GET /api/config/currencies` - Get currencies
- ✅ `GET /api/config/languages` - Get languages
- ✅ `GET /api/config/geo-zones` - Get geo zones

---

## 5. Mobile App Requirements

### 5.1 App Variants

**Customer App (Kabariya):**
- ✅ Standard customer features
- ✅ Listing browsing and creation
- ✅ Transaction management
- ✅ Chat functionality

**Pro App (Kabariya Pro):**
- ✅ Dealer/franchise features
- ✅ Territory-based listing visibility
- ✅ Collection management
- ✅ Analytics dashboard
- ✅ Balance gate (paywall)
- ✅ Dealer ratings

### 5.2 Mobile App Screens

**Authentication:**
- ✅ Splash screen
- ✅ Onboarding screen
- ✅ Login screen (phone/OTP)
- ✅ OTP verification screen
- ✅ Registration screen
- ✅ KYC screen

**Main Navigation (Shell):**
- ✅ Home screen
- ✅ Listings screen
- ✅ Create listing screen
- ✅ Notifications screen
- ✅ Profile screen

**Additional Screens:**
- ✅ Listing detail screen
- ✅ Transactions screen
- ✅ Transaction negotiation screen
- ✅ Transaction bond viewer
- ✅ Chat inbox screen
- ✅ Chat screen
- ✅ Profile edit screen
- ✅ Wallet screen
- ✅ Wallet recharge screen
- ✅ Territory screen
- ✅ Collections screen
- ✅ Collection detail screen
- ✅ Dealer rating screen
- ✅ Subscription screen
- ✅ Analytics screen
- ✅ Settings screen
- ✅ Balance gate screen (Pro app)

### 5.3 Mobile App Features

**Core Features:**
- ✅ OTP-based authentication
- ✅ Geo-location services
- ✅ Image picker and upload
- ✅ Push notifications
- ✅ Offline chat storage (SQLite)
- ✅ Token refresh with expiry tracking
- ✅ Proactive token refresh
- ✅ Multi-tab synchronization (web)
- ✅ Tab visibility refresh

**Business Features:**
- ✅ Geo-fenced listing visibility
- ✅ Territory-based access
- ✅ Price negotiation
- ✅ Transaction bonds
- ✅ Wallet management
- ✅ Subscription management
- ✅ Collection management
- ✅ Dealer ratings

---

## 6. Web Admin Requirements

### 6.1 Admin Portal Pages

**Implemented:**
- ✅ Login page
- ✅ Dashboard page
- ✅ User management page
- ✅ Listing management page
- ✅ Transaction management page
- ✅ Category management page
- ✅ Audit log viewer
- ✅ Analytics page

### 6.2 Admin Features

**Management:**
- ✅ User CRUD operations
- ✅ Listing status management
- ✅ Transaction oversight
- ✅ Category management
- ✅ Territory management
- ✅ System configuration

**Monitoring:**
- ✅ Dashboard statistics
- ✅ Audit log viewing
- ✅ Analytics and reports
- ✅ System health monitoring

**Security:**
- ✅ Portal-specific login
- ✅ Role-based access control
- ✅ Audit logging
- ✅ Token management

---

## 7. Web Client Requirements

### 7.1 Web Client Pages

**Implemented:**
- ✅ Home/Landing page
- ✅ Login page
- ✅ Registration page
- ✅ Listing browse page
- ✅ Listing detail page
- ✅ Profile page

### 7.2 Web Client Features

**Public Features:**
- ✅ Browse listings
- ✅ Search listings
- ✅ Filter by category
- ✅ View listing details

**Authenticated Features:**
- ✅ User registration
- ✅ User login
- ✅ Profile management
- ✅ Create listings (if applicable)

---

## 8. Security Requirements

### 8.1 Authentication Security

**Implemented:**
- ✅ JWT-based authentication
- ✅ HttpOnly cookies for refresh tokens
- ✅ Redis storage for refresh tokens
- ✅ Token family tracking
- ✅ Login throttling (5 attempts/15 min)
- ✅ Password hashing (bcrypt, 12 rounds)
- ✅ OTP-based login (mobile)
- ✅ Token expiry management

### 8.2 Authorization Security

**Implemented:**
- ✅ Portal check middleware
- ✅ Role-based authorization
- ✅ Service-to-service authentication
- ✅ X-User-* header validation
- ✅ X-Internal-Service-Secret validation

### 8.3 Data Security

**Implemented:**
- ✅ DTO serializers (prevent sensitive data exposure)
- ✅ Input validation (express-validator)
- ✅ SQL injection prevention (Prisma)
- ✅ XSS protection (Helmet)
- ✅ CORS configuration
- ✅ Rate limiting

### 8.4 Audit & Compliance

**Implemented:**
- ✅ Audit logging middleware
- ✅ User action tracking
- ✅ Entity change tracking
- ✅ IP address logging
- ✅ Config validation at startup

---

## 9. Database & Data Models

### 9.1 Core Models

**User Management:**
- ✅ User (with roles, portals, geo-zones)
- ✅ RefreshToken
- ✅ AuditLog
- ✅ Wallet

**Geographic:**
- ✅ Country
- ✅ GeoZone
- ✅ Territory

**Localization:**
- ✅ Language
- ✅ Currency
- ✅ Translation
- ✅ ExchangeRate

**Marketplace:**
- ✅ Category (with translations)
- ✅ ProductType (with translations)
- ✅ Attribute (with translations)
- ✅ Option (with translations)
- ✅ Unit (with translations)
- ✅ Listing (with images, geo-fencing)
- ✅ Transaction
- ✅ Collection

**Communication:**
- ✅ ChatRoom
- ✅ ChatMessage
- ✅ Notification

**Business:**
- ✅ SubscriptionPlan
- ✅ Subscription
- ✅ Payment
- ✅ PriceHistory

### 9.2 Relationships

**User Relationships:**
- ✅ User → GeoZone (territory)
- ✅ User → Subscription
- ✅ User → Wallet
- ✅ User → Listings (seller)
- ✅ User → Transactions (buyer/seller)

**Listing Relationships:**
- ✅ Listing → Category
- ✅ Listing → ProductType
- ✅ Listing → User (seller)
- ✅ Listing → Country
- ✅ Listing → Currency
- ✅ Listing → GeoZone (territory)

**Transaction Relationships:**
- ✅ Transaction → Listing
- ✅ Transaction → User (buyer/seller)
- ✅ Transaction → Currency

---

## 10. Real-time Features

### 10.1 Socket.io Implementation

**Channels:**
- ✅ Chat rooms (user-to-user)
- ✅ Transaction updates
- ✅ Notification delivery

**Events:**
- ✅ `message` - New chat message
- ✅ `typing` - Typing indicator
- ✅ `transaction:update` - Transaction status change
- ✅ `notification` - New notification

### 10.2 Real-time Requirements

**Chat:**
- ✅ Real-time messaging
- ✅ Message delivery status
- ✅ Typing indicators
- ✅ Online/offline status

**Notifications:**
- ✅ Push notifications (mobile)
- ✅ Real-time notification delivery
- ✅ Notification badges

---

## 11. Business Logic Requirements

### 11.1 Geo-Fencing

**Implemented:**
- ✅ Territory-based listing visibility
- ✅ City-level geo-fencing
- ✅ Area-level geo-fencing
- ✅ Regional manager access
- ✅ Franchise owner access

**Logic:**
- ✅ Dealers see listings in their territory
- ✅ Franchise owners see all city listings
- ✅ Regional managers see province listings
- ✅ Customers see all listings (public)

### 11.2 Transaction Flow

**Stages:**
1. ✅ Listing created by customer
2. ✅ Dealer expresses interest
3. ✅ Price negotiation
4. ✅ Transaction created
5. ✅ Bond generated
6. ✅ Payment processing
7. ✅ Transaction completion

### 11.3 Collection Management

**Features:**
- ✅ Dealers create collections
- ✅ Add listings to collections
- ✅ Collection-based transactions
- ✅ Dealer ratings per collection

### 11.4 Subscription Management

**Features:**
- ✅ Multiple subscription plans
- ✅ Currency-specific pricing
- ✅ Subscription activation
- ✅ Subscription cancellation
- ✅ Premium features access

### 11.5 Wallet System

**Features:**
- ✅ Wallet balance tracking
- ✅ Wallet recharge
- ✅ Transaction payments
- ✅ Currency support

### 11.6 KYC Verification

**Features:**
- ✅ Document upload
- ✅ Admin verification
- ✅ Status tracking
- ✅ Account activation

---

## 12. Design Patterns & Best Practices

### 12.1 Implemented Patterns

**Backend:**
- ✅ DTO Serializers (data transformation)
- ✅ Repository Pattern (via Prisma)
- ✅ Middleware Pattern (auth, portal check, audit)
- ✅ Service Layer (currency, geo-fencing, escalation)
- ✅ Idempotency Middleware

**Frontend:**
- ✅ API Client Pattern (centralized API calls)
- ✅ Token Store Pattern (localStorage management)
- ✅ Provider Pattern (state management)
- ✅ Router Pattern (navigation)

### 12.2 Code Quality

**Implemented:**
- ✅ Shared constants package
- ✅ Environment variable validation
- ✅ Error handling middleware
- ✅ Response standardization
- ✅ Logging (morgan, console)
- ✅ Type safety (where applicable)

---

## 13. Deployment Requirements

### 13.1 Infrastructure

**Services:**
- ✅ PostgreSQL database
- ✅ Redis cache
- ✅ Docker containers
- ✅ Nginx reverse proxy

**Environment:**
- ✅ Development (local)
- ✅ Production (gc.directconnect.services)
- ✅ Environment variable configuration

### 13.2 Monitoring

**Implemented:**
- ✅ Health check endpoints
- ✅ Service status monitoring
- ✅ Error logging
- ✅ Audit logging

---

## 14. Compliance & Standards

### 14.1 Skill Compliance

**Architecture:**
- ✅ Microservices architecture (Phase 4)
- ✅ API Gateway pattern
- ✅ X-User-* headers
- ✅ Portal-specific logins
- ✅ Shared constants package

**Security:**
- ✅ HttpOnly cookies
- ✅ Redis refresh tokens
- ✅ Login throttling
- ✅ Token family tracking
- ✅ Portal guards

**Design Patterns:**
- ✅ DTO serializers
- ✅ Audit logging
- ✅ Idempotency middleware

### 14.2 Standards

**API:**
- ✅ RESTful API design
- ✅ Standardized error responses
- ✅ Pagination support
- ✅ Filtering and sorting

**Code:**
- ✅ Consistent naming conventions
- ✅ Modular structure
- ✅ Documentation
- ✅ Error handling

---

## 15. Summary Statistics

### 15.1 Codebase Metrics

**Backend:**
- ✅ 23 route files
- ✅ 40+ source files
- ✅ 4 microservices
- ✅ 1 API Gateway

**Frontend:**
- ✅ 2 web applications (admin, client)
- ✅ 1 mobile application (2 variants)
- ✅ 50+ React components
- ✅ 20+ Flutter screens

**Database:**
- ✅ 30+ Prisma models
- ✅ Complex relationships
- ✅ Multi-language support
- ✅ Geo-spatial data

### 15.2 Feature Count

**Authentication:** 10+ endpoints  
**Listings:** 15+ endpoints  
**Transactions:** 10+ endpoints  
**Chat:** 5+ endpoints  
**Admin:** 10+ endpoints  
**Mobile:** 25+ screens  
**Web:** 15+ pages  

---

## 16. Future Enhancements (Planned)

### 16.1 Additional Services

- ⏳ Vendor Service (Port 5003)
- ⏳ Agent Service (Port 5004)

### 16.2 Additional Features

- ⏳ Advanced analytics
- ⏳ Reporting system
- ⏳ Email notifications
- ⏳ SMS notifications
- ⏳ Payment gateway integration
- ⏳ Advanced search (Elasticsearch)
- ⏳ Image optimization
- ⏳ CDN integration

---

**Document Generated:** 2026-03-14  
**Status:** Complete requirements documentation
