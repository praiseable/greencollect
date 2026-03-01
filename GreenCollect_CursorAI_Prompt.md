# GreenCollect — Full Platform Cursor AI Prompt
# Copy everything below this line into Cursor AI

---

# 🟢 BUILD: GreenCollect — Smart Garbage Collection Platform

## OVERVIEW

Build a **production-ready, full-stack garbage collection marketplace** called **GreenCollect** that connects:
- **House Owners** — post garbage for pickup, get paid
- **Local Collectors** — receive nearby job alerts, collect garbage, deposit at collection points
- **Collection Point Managers** — manage inventory at sorting centers
- **Regional Collectors / Buyers** — purchase bulk segregated garbage from collection points
- **Super Admin** — full platform control via web portal

The platform consists of **4 separate systems**:
1. `backend/` — Shared Node.js + Express REST API (used by both mobile and web)
2. `frontend/` — React.js Admin + Regional Web Portal
3. `mobile/` — React Native (Expo) app for House Owners, Local Collectors, Regional Collectors
4. `infrastructure/` — Docker Compose, Nginx, deployment configs

---

## TECH STACK (DO NOT DEVIATE)

| Layer | Technology |
|-------|-----------|
| Backend API | Node.js 20, Express 4, PostgreSQL 15 + PostGIS, Redis 7 |
| Web Portal | React 18, Vite, TailwindCSS 3, Zustand, React Router 6, Recharts, Leaflet |
| Mobile App | React Native with Expo SDK 50, Expo Router, NativeWind |
| Auth | JWT (15min expiry) + Refresh Tokens (30 days), OTP via SMS for mobile |
| File Storage | Cloudinary (images), multer for upload handling |
| Push Notifications | Firebase Cloud Messaging (FCM) via firebase-admin |
| Maps | Google Maps API (mobile), Leaflet (web portal) |
| Payments | Razorpay integration |
| Containerization | Docker + Docker Compose |
| Reverse Proxy | Nginx |

---

## SYSTEM 1: BACKEND API

### Directory Structure
```
backend/
├── src/
│   ├── app.js                    # Express entry point
│   ├── config/
│   │   ├── db.js                 # PostgreSQL pool (pg library)
│   │   ├── redis.js              # Redis client
│   │   ├── firebase.js           # FCM admin SDK init
│   │   └── cloudinary.js         # Cloudinary config
│   ├── middleware/
│   │   ├── auth.js               # JWT verify, attach req.user
│   │   ├── roleCheck.js          # requireRole(...roles) middleware
│   │   ├── upload.js             # multer + cloudinary upload
│   │   └── validate.js           # express-validator chains
│   ├── routes/
│   │   ├── index.js              # Mount all routers
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── listings.routes.js
│   │   ├── garbageTypes.routes.js
│   │   ├── collectionPoints.routes.js
│   │   ├── bulkOrders.routes.js
│   │   ├── notifications.routes.js
│   │   ├── payments.routes.js
│   │   ├── reviews.routes.js
│   │   └── admin.routes.js
│   ├── controllers/              # One file per route group
│   ├── services/
│   │   ├── notification.service.js   # FCM push + DB notification
│   │   ├── geo.service.js            # PostGIS radius queries
│   │   ├── payment.service.js        # Razorpay integration
│   │   ├── upload.service.js         # Cloudinary upload/delete
│   │   └── otp.service.js            # OTP generate/verify (Twilio/MSG91)
│   └── jobs/
│       └── radiusExpand.job.js       # Cron: expand search radius if no collector accepts
├── migrations/
│   ├── run.js
│   └── 001_initial.sql
├── seeds/
│   ├── run.js
│   └── 001_seed.sql
├── .env.example
├── package.json
└── Dockerfile
```

### DATABASE SCHEMA (PostgreSQL + PostGIS)

Create all tables with these exact definitions:

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enums
CREATE TYPE user_role AS ENUM ('house_owner', 'local_collector', 'regional_collector', 'collection_manager', 'admin');
CREATE TYPE listing_status AS ENUM ('open', 'assigned', 'in_progress', 'collected', 'completed', 'cancelled', 'expired');
CREATE TYPE bulk_order_status AS ENUM ('pending', 'confirmed', 'picked_up', 'completed', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'wallet', 'bank_transfer', 'razorpay');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE notification_type AS ENUM ('new_listing', 'job_accepted', 'job_collected', 'payment_received', 'bulk_order', 'system');

-- Users
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(100) NOT NULL,
  phone           VARCHAR(20) UNIQUE,
  email           VARCHAR(150) UNIQUE,
  password_hash   TEXT,
  role            user_role NOT NULL,
  is_verified     BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  profile_photo   TEXT,                    -- Cloudinary URL
  id_document_url TEXT,                    -- KYC document upload
  fcm_token       TEXT,
  avg_rating      DECIMAL(3,2) DEFAULT 0,
  total_reviews   INTEGER DEFAULT 0,
  wallet_balance  DECIMAL(10,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- OTP Sessions
CREATE TABLE otp_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone       VARCHAR(20) NOT NULL,
  otp_hash    TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  is_used     BOOLEAN DEFAULT FALSE,
  attempts    INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh Tokens
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  device_info TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Addresses
CREATE TABLE addresses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  label        VARCHAR(50) DEFAULT 'Home',
  full_address TEXT NOT NULL,
  city         VARCHAR(100),
  state        VARCHAR(100),
  pincode      VARCHAR(20),
  latitude     DECIMAL(10,7) NOT NULL,
  longitude    DECIMAL(10,7) NOT NULL,
  location     GEOGRAPHY(POINT, 4326),
  is_default   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Garbage Types
CREATE TABLE garbage_types (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              VARCHAR(100) NOT NULL,
  slug              VARCHAR(50) UNIQUE NOT NULL,
  description       TEXT,
  icon              VARCHAR(10) DEFAULT '♻️',
  image_url         TEXT,                    -- Cloudinary URL for type image
  base_price_per_kg DECIMAL(10,2) DEFAULT 0,
  min_price_per_kg  DECIMAL(10,2) DEFAULT 0,
  max_price_per_kg  DECIMAL(10,2) DEFAULT 0,
  color             VARCHAR(20) DEFAULT '#22c55e',
  is_active         BOOLEAN DEFAULT TRUE,
  is_recyclable     BOOLEAN DEFAULT TRUE,
  sort_order        INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Collection Points
CREATE TABLE collection_points (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(150) NOT NULL,
  manager_id   UUID REFERENCES users(id),
  address      TEXT NOT NULL,
  city         VARCHAR(100),
  state        VARCHAR(100),
  pincode      VARCHAR(20),
  latitude     DECIMAL(10,7) NOT NULL,
  longitude    DECIMAL(10,7) NOT NULL,
  location     GEOGRAPHY(POINT, 4326),
  phone        VARCHAR(20),
  photo_url    TEXT,                         -- Cloudinary URL
  capacity_kg  DECIMAL(10,2),
  is_active    BOOLEAN DEFAULT TRUE,
  operating_hours JSONB DEFAULT '{"mon":"9-18","tue":"9-18","wed":"9-18","thu":"9-18","fri":"9-18","sat":"9-14","sun":"closed"}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Listings (Garbage Pickup Requests)
CREATE TABLE listings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_number      SERIAL UNIQUE,          -- human-readable ID
  owner_id            UUID REFERENCES users(id) NOT NULL,
  collector_id        UUID REFERENCES users(id),
  address_id          UUID REFERENCES addresses(id),
  full_address        TEXT NOT NULL,
  city                VARCHAR(100),
  state               VARCHAR(100),
  latitude            DECIMAL(10,7) NOT NULL,
  longitude           DECIMAL(10,7) NOT NULL,
  location            GEOGRAPHY(POINT, 4326),
  photo_urls          TEXT[] DEFAULT '{}',    -- array of Cloudinary URLs (max 5)
  garbage_type_id     UUID REFERENCES garbage_types(id),
  estimated_weight    DECIMAL(8,2),
  actual_weight       DECIMAL(8,2),
  asking_price        DECIMAL(10,2),
  final_price         DECIMAL(10,2),
  description         TEXT,
  status              listing_status DEFAULT 'open',
  collection_point_id UUID REFERENCES collection_points(id),
  current_radius_km   INTEGER DEFAULT 5,      -- for radius expansion tracking
  notify_count        INTEGER DEFAULT 0,      -- how many collectors notified
  posted_at           TIMESTAMPTZ DEFAULT NOW(),
  assigned_at         TIMESTAMPTZ,
  collected_at        TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours'
);

-- Inventory at Collection Points
CREATE TABLE inventory (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_point_id UUID REFERENCES collection_points(id),
  garbage_type_id     UUID REFERENCES garbage_types(id),
  total_weight_kg     DECIMAL(10,2) DEFAULT 0,
  available_weight_kg DECIMAL(10,2) DEFAULT 0,
  reserved_weight_kg  DECIMAL(10,2) DEFAULT 0,
  last_updated        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_point_id, garbage_type_id)
);

-- Inventory Transaction Log
CREATE TABLE inventory_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id        UUID REFERENCES inventory(id),
  listing_id          UUID REFERENCES listings(id),
  bulk_order_id       UUID,
  action              VARCHAR(20) NOT NULL,   -- 'add', 'remove', 'reserve', 'release'
  weight_kg           DECIMAL(10,2),
  added_by            UUID REFERENCES users(id),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk Orders (Regional Collectors buying from Collection Points)
CREATE TABLE bulk_orders (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number         SERIAL UNIQUE,
  buyer_id             UUID REFERENCES users(id),
  collection_point_id  UUID REFERENCES collection_points(id),
  garbage_type_id      UUID REFERENCES garbage_types(id),
  requested_weight_kg  DECIMAL(10,2),
  delivered_weight_kg  DECIMAL(10,2),
  offered_price_per_kg DECIMAL(10,2),
  agreed_price_per_kg  DECIMAL(10,2),
  total_amount         DECIMAL(12,2),
  status               bulk_order_status DEFAULT 'pending',
  notes                TEXT,
  invoice_url          TEXT,                  -- Cloudinary PDF URL
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at         TIMESTAMPTZ,
  pickup_scheduled_at  TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ
);

-- Payments
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id      UUID REFERENCES listings(id),
  bulk_order_id   UUID REFERENCES bulk_orders(id),
  payer_id        UUID REFERENCES users(id),
  payee_id        UUID REFERENCES users(id),
  amount          DECIMAL(10,2) NOT NULL,
  platform_fee    DECIMAL(10,2) DEFAULT 0,
  method          payment_method DEFAULT 'cash',
  status          payment_status DEFAULT 'pending',
  reference_id    VARCHAR(100),
  gateway_order_id VARCHAR(100),
  gateway_data    JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- Notifications
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB DEFAULT '{}',
  image_url   TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  sent_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE reviews (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id   UUID REFERENCES listings(id),
  reviewer_id  UUID REFERENCES users(id),
  reviewee_id  UUID REFERENCES users(id),
  rating       SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  reply        TEXT,
  photos       TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Disputes
CREATE TABLE disputes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID REFERENCES listings(id),
  raised_by   UUID REFERENCES users(id),
  against     UUID REFERENCES users(id),
  reason      TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[] DEFAULT '{}',
  status      VARCHAR(20) DEFAULT 'open',   -- open, investigating, resolved, closed
  resolution  TEXT,
  resolved_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Pricing Rules (Admin controlled)
CREATE TABLE pricing_rules (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garbage_type_id   UUID REFERENCES garbage_types(id),
  city              VARCHAR(100),
  min_price_per_kg  DECIMAL(10,2),
  max_price_per_kg  DECIMAL(10,2),
  recommended_price DECIMAL(10,2),
  effective_from    TIMESTAMPTZ DEFAULT NOW(),
  effective_to      TIMESTAMPTZ,
  is_active         BOOLEAN DEFAULT TRUE,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Platform Settings
CREATE TABLE platform_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES users(id),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_listings_location ON listings USING GIST(location);
CREATE INDEX idx_addresses_location ON addresses USING GIST(location);
CREATE INDEX idx_collection_points_location ON collection_points USING GIST(location);
CREATE INDEX idx_listings_owner ON listings(owner_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_collector ON listings(collector_id);
CREATE INDEX idx_listings_type ON listings(garbage_type_id);
CREATE INDEX idx_listings_posted_at ON listings(posted_at DESC);
CREATE INDEX idx_listings_expires ON listings(expires_at) WHERE status = 'open';
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_bulk_orders_status ON bulk_orders(status);
CREATE INDEX idx_otp_phone ON otp_sessions(phone, expires_at);
CREATE INDEX idx_inventory_cp ON inventory(collection_point_id);

-- Trigger: auto-compute PostGIS location from lat/lng
CREATE OR REPLACE FUNCTION sync_location() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_MakePoint(NEW.longitude, NEW.latitude)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER t_listings_loc BEFORE INSERT OR UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION sync_location();
CREATE TRIGGER t_addresses_loc BEFORE INSERT OR UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION sync_location();
CREATE TRIGGER t_cp_loc BEFORE INSERT OR UPDATE ON collection_points FOR EACH ROW EXECUTE FUNCTION sync_location();
```

### API ENDPOINTS (ALL REQUIRED)

Base URL: `/api/v1`

#### AUTH
```
POST   /auth/login                    # email+password (admin/web)
POST   /auth/otp/send                 # send OTP to phone
POST   /auth/otp/verify               # verify OTP, return tokens + user
POST   /auth/refresh                  # refresh access token
POST   /auth/logout                   # invalidate refresh token
GET    /auth/me                       # get current user profile
PUT    /auth/me                       # update profile (name, photo, fcm_token)
POST   /auth/change-password          # change password
POST   /auth/forgot-password          # send reset OTP
POST   /auth/reset-password           # reset with OTP
```

#### USERS (Admin)
```
GET    /users                         # list all users (filter: role, verified, active, search, city)
POST   /users                         # create user (admin creates manager/collector)
GET    /users/:id                     # get user detail + stats
PUT    /users/:id                     # update user details
DELETE /users/:id                     # soft delete
PUT    /users/:id/verify              # verify user identity
PUT    /users/:id/ban                 # ban user with reason
PUT    /users/:id/unban               # reactivate user
POST   /users/:id/upload-id           # upload ID/KYC document (image)
GET    /users/:id/listings            # user's listing history
GET    /users/:id/reviews             # reviews received
GET    /users/:id/payments            # payment history
```

#### LISTINGS
```
POST   /listings                      # create listing (house_owner) — multipart with photos
GET    /listings                      # all listings (admin, with full filters)
GET    /listings/nearby               # nearby open listings (collector, requires lat/lng)
GET    /listings/my                   # my listings (owner: posted, collector: accepted)
GET    /listings/:id                  # listing detail
PUT    /listings/:id                  # update listing (owner, only when open)
DELETE /listings/:id                  # cancel listing (owner)
PUT    /listings/:id/accept           # collector accepts job
PUT    /listings/:id/start            # collector marks en route (in_progress)
PUT    /listings/:id/collect          # collector marks collected (actual weight, price, CP)
PUT    /listings/:id/complete         # collector confirms payment made
PUT    /listings/:id/cancel           # owner or admin cancels
POST   /listings/:id/photos           # add more photos (multipart)
DELETE /listings/:id/photos/:photoId  # remove a photo
POST   /listings/:id/dispute          # raise a dispute
GET    /listings/:id/timeline         # status change history
```

#### GARBAGE TYPES
```
GET    /garbage-types                 # all active types (public)
POST   /garbage-types                 # create (admin)
GET    /garbage-types/:id             # get single type
PUT    /garbage-types/:id             # update (admin) — includes image upload
DELETE /garbage-types/:id             # deactivate (admin)
GET    /garbage-types/:id/pricing     # pricing rules for this type
POST   /garbage-types/:id/pricing     # set pricing rule (admin)
```

#### COLLECTION POINTS
```
GET    /collection-points             # all active CPs (filter: city, lat/lng radius)
POST   /collection-points             # create (admin)
GET    /collection-points/:id         # CP detail + current inventory
PUT    /collection-points/:id         # update (admin)
DELETE /collection-points/:id         # deactivate (admin)
GET    /collection-points/:id/inventory        # full inventory breakdown
PUT    /collection-points/:id/inventory/:typeId # manual inventory adjustment (manager)
GET    /collection-points/:id/logs    # inventory transaction log
GET    /collection-points/:id/orders  # bulk orders at this CP
POST   /collection-points/:id/upload-photo     # upload CP photo
```

#### BULK ORDERS (Regional)
```
GET    /bulk-orders/available         # available inventory lots (regional collector)
GET    /bulk-orders                   # list orders (buyer: own, admin: all)
POST   /bulk-orders                   # place order (regional_collector)
GET    /bulk-orders/:id               # order detail
PUT    /bulk-orders/:id/confirm       # CP manager confirms
PUT    /bulk-orders/:id/schedule      # set pickup date/time
PUT    /bulk-orders/:id/pickup        # regional collector marks picked up
PUT    /bulk-orders/:id/complete      # CP manager confirms complete + weight
PUT    /bulk-orders/:id/cancel        # cancel order
GET    /bulk-orders/:id/invoice       # download invoice PDF
```

#### PAYMENTS
```
GET    /payments                      # payment history (own, admin: all)
POST   /payments/razorpay/order       # create Razorpay order
POST   /payments/razorpay/verify      # verify payment webhook
GET    /payments/stats                # payment stats (admin)
```

#### NOTIFICATIONS
```
GET    /notifications                 # list notifications (own)
PUT    /notifications/read            # mark as read (ids[] or all)
DELETE /notifications/:id             # delete notification
```

#### REVIEWS
```
POST   /reviews                       # post review after completed listing
GET    /reviews/user/:userId          # reviews for a user
PUT    /reviews/:id/reply             # owner replies to review (reviewee)
```

#### ADMIN
```
GET    /admin/stats                   # dashboard KPIs (period: today/week/month/year)
GET    /admin/analytics/timeline      # daily chart data (days param)
GET    /admin/analytics/geo           # city/region breakdown
GET    /admin/analytics/garbage-types # collection by type
GET    /admin/analytics/collectors    # collector performance leaderboard
GET    /admin/disputes                # all disputes
PUT    /admin/disputes/:id/resolve    # resolve dispute
GET    /admin/settings                # platform settings
PUT    /admin/settings                # update settings
POST   /admin/notifications/broadcast # send broadcast notification
GET    /admin/audit-log               # admin action log
```

### NOTIFICATION SERVICE
Implement geo-based FCM push with automatic radius expansion:

```javascript
// When a listing is posted:
// 1. Query collectors within 5km, notify top 10 nearest
// 2. After 30 mins with no acceptance → expand to 10km, notify next batch
// 3. After 60 mins → expand to 20km, notify next batch
// 4. After 2 hours → mark listing as expired, notify owner

// Save all notifications to DB for in-app display
// Send FCM push to device via firebase-admin
// Include listing details in notification data payload
```

### IMAGE UPLOAD
- Use multer for multipart handling
- Upload to Cloudinary with organized folders: `greencollect/listings/`, `greencollect/profiles/`, `greencollect/garbage-types/`, `greencollect/collection-points/`, `greencollect/kyc/`
- Return secure Cloudinary URLs
- Support JPEG, PNG, WebP
- Max file size: 5MB per image
- Max 5 photos per listing

---

## SYSTEM 2: WEB PORTAL (Admin + Regional)

### Directory Structure
```
frontend/
├── src/
│   ├── pages/
│   │   ├── auth/
│   │   │   └── Login.jsx
│   │   ├── admin/
│   │   │   ├── Dashboard.jsx         # KPI cards + charts + recent activity
│   │   │   ├── Users.jsx             # User management table
│   │   │   ├── UserDetail.jsx        # Single user deep-dive
│   │   │   ├── Listings.jsx          # All listings with filters
│   │   │   ├── ListingDetail.jsx     # Single listing with timeline
│   │   │   ├── CollectionPoints.jsx  # CP management
│   │   │   ├── CollectionPointDetail.jsx  # Inventory + orders at one CP
│   │   │   ├── GarbageTypes.jsx      # CRUD garbage types
│   │   │   ├── BulkOrders.jsx        # All bulk orders
│   │   │   ├── Analytics.jsx         # Full analytics with charts
│   │   │   ├── Disputes.jsx          # Dispute management
│   │   │   ├── Payments.jsx          # Payment history
│   │   │   ├── Notifications.jsx     # Send broadcasts
│   │   │   └── Settings.jsx          # Platform settings
│   │   └── regional/
│   │       ├── Dashboard.jsx         # Available inventory overview
│   │       ├── BulkOrders.jsx        # My orders
│   │       └── Profile.jsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.jsx            # Sidebar + main area
│   │   │   ├── Sidebar.jsx           # Navigation sidebar
│   │   │   └── Header.jsx            # Top bar with notifications
│   │   ├── ui/
│   │   │   ├── StatCard.jsx
│   │   │   ├── DataTable.jsx         # Reusable sortable table
│   │   │   ├── Modal.jsx
│   │   │   ├── ImageUpload.jsx       # Drag-drop image uploader
│   │   │   ├── StatusBadge.jsx
│   │   │   ├── RoleBadge.jsx
│   │   │   ├── Pagination.jsx
│   │   │   ├── SearchInput.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── DateRangePicker.jsx
│   │   │   ├── ConfirmDialog.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── Spinner.jsx
│   │   │   ├── Toast.jsx             # Notification toasts
│   │   │   └── MapView.jsx           # Leaflet map component
│   │   └── charts/
│   │       ├── TimelineChart.jsx     # Area/line chart for activity
│   │       ├── GarbageTypeChart.jsx  # Bar chart by type
│   │       ├── CityChart.jsx         # City breakdown
│   │       └── CollectorLeaderboard.jsx
│   ├── services/
│   │   └── api.js                    # Axios instance + all API calls
│   ├── store/
│   │   ├── auth.store.js             # Zustand auth state
│   │   └── ui.store.js               # Zustand UI state (sidebar, toasts)
│   ├── hooks/
│   │   ├── useDebounce.js
│   │   └── useMediaQuery.js
│   ├── utils/
│   │   ├── format.js                 # formatCurrency, formatDate, formatWeight
│   │   └── constants.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
└── index.html
```

### DESIGN SYSTEM
- **Theme**: Dark theme — deep forest green palette
- **Primary color**: `#22c55e` (green-500)
- **Background**: `#0a0f0d`
- **Card background**: `#111a14`
- **Border**: `#1e2f22`
- **Text**: `#e8f5ec`
- **Muted text**: `#6b9b78`
- **Fonts**: Syne (display/headings) + DM Sans (body) from Google Fonts
- **Border radius**: `rounded-2xl` for cards, `rounded-xl` for inputs/buttons
- **Motion**: Fade-up animation on page enter, skeleton loaders for loading states

### ALL ADMIN PAGES — DETAILED REQUIREMENTS

#### Dashboard (`/dashboard`)
- Period toggle: Today / 7 Days / 30 Days / Year
- KPI cards (8 total): Total Listings, Completed, Open, Cancelled, House Owners, Local Collectors, Total KG Collected, Total Platform Revenue
- Area chart: listing activity over selected period (listings vs completed)
- Bar chart: KG collected by garbage type
- Bar chart: Top 10 cities by volume
- Table: 10 most recent listings with status
- Table: Top 5 collectors by jobs completed
- Table: Pending user verifications (quick verify button)
- Live indicator if any listings have been open > 2 hours

#### Users (`/users`)
- Full data table with columns: Avatar, Name, Email, Phone, Role, Verified, Active, Joined Date, Actions
- Filters: Search (name/phone/email), Role dropdown, Verified filter, Active filter, Date range
- Row actions: View, Verify, Ban/Unban, View Listings, View Payments
- Bulk actions: Select multiple → Verify all, Ban all
- "Add User" button → Modal to create admin/manager account (name, email, password, role, phone)
- Export to CSV button
- Pagination (20 per page)
- Click row → User Detail page

#### User Detail (`/users/:id`)
- Profile header: photo, name, role badge, rating stars, join date, verified status
- KYC document viewer (if uploaded)
- Stats row: Total listings / Jobs completed / Total earned / Avg rating
- Tabs: Listings History | Payments | Reviews | Activity Log
- Quick actions: Verify, Ban, Reset Password, Send Notification

#### Listings (`/listings`)
- Table: Thumbnail, Listing#, Owner, Type (with icon), City, Weight, Price, Status badge, Posted date, Actions
- Filters: Search, Status, Garbage Type, City, Date range
- Status pipeline view (kanban-style toggle): show counts per status
- Click row → Listing Detail modal/page
- Export CSV

#### Listing Detail Modal
- Photo gallery (all uploaded photos, full size)
- Complete info: owner details, collector details, location, timestamps
- Status timeline: Open → Assigned (when) → Collected (when) → Completed (when)
- Map showing pickup location (Leaflet)
- Payment details
- Dispute info if raised
- Admin actions: Force cancel, Reassign collector, Override price

#### Collection Points (`/collection-points`)
- Card grid view: CP name, city, manager name, total inventory kg, active/inactive badge
- List view toggle
- Leaflet map showing all CPs as markers
- "Add Collection Point" → Full form modal (name, address, city, state, lat/lng, manager assignment, photo upload, capacity, operating hours)
- Click card → Collection Point Detail

#### Collection Point Detail (`/collection-points/:id`)
- Header: photo, name, address, manager info, capacity
- Inventory table: Type icon, Name, Available KG, Reserved KG, Total KG, Last Updated, Market Value
- Chart: Inventory levels over time
- Recent deposits (listings collected here)
- Active bulk orders table
- Inventory adjustment button (manual add/remove with reason)
- Operating hours display

#### Garbage Types (`/garbage-types`)
- Card grid: icon, name, base price/kg, active status
- "Add Type" → Modal form: icon (emoji picker), name, slug, description, base price, min price, max price, color picker, image upload
- Edit inline
- Toggle active/inactive
- Pricing rules per type per city
- View which listings use this type (count)

#### Bulk Orders (`/bulk-orders`)
- Table: Order#, Buyer, Type, CP Name, Requested KG, Price/kg, Total, Status, Date
- Filters: Status, Garbage Type, CP, Date range, Buyer search
- Status workflow actions: Confirm → Schedule → Complete
- Click row → Order detail modal with timeline

#### Analytics (`/analytics`)
- Date range picker
- KPI summary row
- Line chart: listings over time (multiple series: posted, completed, cancelled)
- Bar chart: KG collected by type (last 30 days)
- Bar chart (horizontal): top cities
- Pie chart: revenue by payment method
- Table: Collector performance (name, jobs, kg, earnings, rating)
- Table: CP performance (name, intake kg, orders fulfilled, revenue)
- Export report as CSV

#### Disputes (`/disputes`)
- Table: Dispute#, Listing#, Raised By, Against, Reason, Status, Date
- Click → Detail modal: full description, evidence photos, listing info, user info
- Actions: Mark Investigating, Resolve (with resolution text), Close

#### Settings (`/settings`)
- Platform fee percentage
- Default search radius (km)
- Radius expansion timing (minutes)
- Max radius (km)
- OTP expiry (minutes)
- Max photos per listing
- Supported cities list
- Notification templates (edit FCM notification text)
- Razorpay keys (masked)
- Cloudinary config (masked)
- SMS provider config (masked)
- Save button with confirmation

#### Notifications (Broadcast) (`/notifications`)
- Form: Target (all users / by role / by city / specific user IDs)
- Title, Body, Image URL
- Preview of how it will look on device
- Send button with confirmation
- History table of past broadcasts

---

## SYSTEM 3: MOBILE APP (React Native + Expo)

### Directory Structure
```
mobile/
├── app/
│   ├── (auth)/
│   │   ├── _layout.jsx
│   │   ├── welcome.jsx           # Splash/welcome screen
│   │   ├── phone.jsx             # Enter phone number
│   │   ├── otp.jsx               # OTP verification
│   │   └── register.jsx          # Name + role selection (new users)
│   ├── (owner)/
│   │   ├── _layout.jsx           # Bottom tabs
│   │   ├── index.jsx             # My listings dashboard
│   │   ├── post.jsx              # Post new garbage (camera + form)
│   │   ├── listing/[id].jsx      # Listing detail + status tracking
│   │   ├── history.jsx           # Earnings + past listings
│   │   └── profile.jsx
│   ├── (collector)/
│   │   ├── _layout.jsx           # Bottom tabs
│   │   ├── index.jsx             # Map view + nearby listings
│   │   ├── jobs.jsx              # Active + past jobs
│   │   ├── job/[id].jsx          # Job detail + navigation
│   │   ├── collect/[id].jsx      # Mark collected form (weight, price, CP)
│   │   ├── inventory.jsx         # My collection summary
│   │   └── profile.jsx
│   ├── (regional)/
│   │   ├── _layout.jsx
│   │   ├── index.jsx             # Available inventory lots
│   │   ├── orders.jsx            # My bulk orders
│   │   ├── order/[id].jsx        # Order detail
│   │   └── profile.jsx
│   └── _layout.jsx               # Root layout with auth check
├── components/
│   ├── GarbageTypeSelector.jsx   # Horizontal scroll type picker
│   ├── PhotoPicker.jsx           # Camera/gallery with preview grid
│   ├── MapMarker.jsx             # Custom map pin component
│   ├── ListingCard.jsx           # Card component for listing
│   ├── JobCard.jsx               # Card for collector jobs
│   ├── StatusTimeline.jsx        # Visual status progression
│   ├── NotificationBell.jsx      # Header notification icon with badge
│   ├── PriceInput.jsx            # Currency input component
│   ├── WeightInput.jsx           # Weight input with unit selector
│   └── RatingStars.jsx           # Star rating component
├── services/
│   ├── api.js                    # Axios instance pointing to backend
│   ├── auth.service.js
│   ├── listings.service.js
│   └── notifications.js          # FCM token registration + handler
├── store/
│   ├── auth.store.js             # MMKV-backed auth state
│   └── app.store.js              # App-wide state
├── hooks/
│   ├── useLocation.js            # GPS permission + current location
│   ├── useNotifications.js       # FCM setup + token
│   └── useCamera.js              # Camera/image picker wrapper
├── constants/
│   ├── colors.js
│   └── api.js
├── app.json
└── package.json
```

### MOBILE SCREENS — DETAILED REQUIREMENTS

#### Auth Flow
1. **Welcome Screen**: App logo, tagline "Turn your waste into money", "Get Started" button, "Already have account? Sign in" link
2. **Phone Screen**: Country code picker (default +91), phone number input, "Send OTP" button, terms acceptance checkbox
3. **OTP Screen**: 6-digit OTP input (auto-advance), resend timer (60s), "Verify" button. In dev mode show debug OTP.
4. **Register Screen** (new users only): Name input, role selection cards (House Owner / Local Collector / Regional Collector) with descriptions and icons

#### House Owner App
**Home Screen (My Listings)**
- Header with greeting and notification bell (unread badge)
- "Post Garbage" big CTA button (green, prominent)
- Status filter pills: All / Open / In Progress / Completed
- List of listing cards showing: garbage type icon, address, status badge, asking price, posted time
- Empty state with illustration for first time users

**Post Garbage Screen**
- Step indicator (4 steps)
- Step 1 — Photos: camera button + gallery picker, show preview grid (max 5), delete individual photos
- Step 2 — Type & Details: garbage type selector (horizontal scroll with icon cards), weight estimate input (kg), description text area
- Step 3 — Location & Price: auto-fill GPS address with edit option, map preview showing pin, asking price input with suggested price from backend
- Step 4 — Review & Submit: summary of all fields, "Post Listing" button
- Loading state with "Notifying nearby collectors..." message after submit

**Listing Detail Screen**
- Photos in a swipeable gallery
- Status timeline (horizontal steps: Posted → Collector Found → Collected → Paid)
- Collector info card (if assigned): photo, name, rating, phone (tap to call)
- Location on map
- Cancel button (only when open or assigned)
- Chat button (Phase 2)
- Review prompt (after completed)

**History Screen**
- Total earned (all time) — prominent display
- Month selector
- List of completed listings with earnings
- CSV export option

#### Local Collector App
**Map Screen (Home)**
- Full-screen map (Google Maps via react-native-maps)
- User's location marker (custom green pin)
- Available listings as map markers (different colors by garbage type)
- Bottom sheet (drag up): list of nearby listings sorted by distance
- Each listing card shows: distance, type icon + name, weight, price, owner name
- Filter FAB: filter by garbage type, max distance
- Refresh button
- My active job banner (if job in progress) — taps to active job

**Listing Detail Bottom Sheet**
- Photos carousel
- Type, weight, price prominently
- Address + distance
- Owner rating
- "Accept Job" button (large, green)
- "Navigate" shortcut (opens Google Maps / Apple Maps)

**Active Job Screen**
- Status: Assigned / En Route / Arrived
- Owner contact card (tap to call)
- Map with route preview
- "Mark Arrived" button → then "Confirm Collection" form:
  - Actual weight input
  - Final agreed price input
  - Collection point selector (nearby CPs)
  - Payment method selector (Cash / UPI)
  - "Confirm Payment & Complete" button

**Jobs Screen**
- Tabs: Active | History
- Active: current job in progress
- History: completed jobs with earnings

**Inventory Screen**
- My contributions this week/month (KG by type)
- Which CPs I've deposited at
- Quick summary of earnings

#### Regional Collector App
**Available Inventory Screen**
- Filter bar: City, Garbage Type, Min Weight
- Cards showing: CP name, city, garbage type icon, available KG, price/kg, estimated total value
- "Place Order" button on each card → order form modal:
  - Requested weight (slider + input, max available)
  - Offered price per KG
  - Pickup notes
  - "Submit Order" button

**My Orders Screen**
- Tabs: Active | Completed
- Order card: type icon, CP name, weight, total amount, status badge, date
- Tap → Order detail with timeline

#### Shared Features (All Roles)
- **Profile Screen**: photo (tap to change), name, phone, role, rating, edit form
- **Notifications Screen**: list of in-app notifications, mark all read
- **Settings Screen**: language (future), logout, delete account, about, privacy policy
- **Onboarding**: 3-slide intro on first launch (skip option)

---

## SYSTEM 4: INFRASTRUCTURE

### docker-compose.yml
```yaml
version: '3.8'
services:
  db:
    image: postgis/postgis:15-3.3
    restart: unless-stopped
    environment:
      POSTGRES_DB: greencollect
      POSTGRES_USER: gcadmin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gcadmin -d greencollect"]
      interval: 10s
      retries: 10

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redisdata:/data

  backend:
    build: ./backend
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file: ./backend/.env
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
  redisdata:
```

### Nginx Configuration
- Serve frontend `dist/` as root for all non-API routes (SPA fallback to index.html)
- Proxy `/api/` to `http://localhost:3000`
- Enable gzip
- Cache static assets for 1 year
- Rate limit `/api/auth/` endpoints (10 req/min)

---

## ENVIRONMENT VARIABLES

### backend/.env.example
```
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://gcadmin:password@localhost:5432/greencollect
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Firebase FCM
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# SMS OTP (Twilio or MSG91)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Admin defaults
ADMIN_EMAIL=admin@greencollect.app
ADMIN_PASSWORD=

# Geo defaults
DEFAULT_RADIUS_KM=5
RADIUS_EXPAND_INTERVAL_MINUTES=30
MAX_RADIUS_KM=20
LISTING_EXPIRY_HOURS=48

# Platform
PLATFORM_FEE_PERCENT=5
ALLOWED_ORIGINS=http://localhost:5173
```

### mobile/.env
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_GOOGLE_MAPS_KEY=
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

---

## SEED DATA

On `npm run seed`, insert:
1. **8 garbage types**: Paper/Cardboard (📰 ₹8/kg), Plastic (🧴 ₹12/kg), Metal/Scrap (⚙️ ₹30/kg), Glass (🫙 ₹5/kg), E-Waste (💻 ₹50/kg), Organic (🌱 ₹2/kg), Cloth/Textile (👕 ₹6/kg), Rubber (🔘 ₹4/kg)
2. **1 super admin**: admin@greencollect.app / Admin@123456 (role: admin, is_verified: true)
3. **4 collection points**: Delhi North, Delhi South, Mumbai Central, Bangalore Whitefield
4. **Platform settings**: default radius, expansion timing, platform fee
5. **3 test users**: 1 house_owner, 1 local_collector, 1 regional_collector (for development)
6. **3 sample listings**: 1 open, 1 completed, 1 cancelled

---

## BUSINESS LOGIC — CRITICAL IMPLEMENTATIONS

### 1. Geo-based Collector Notification with Radius Expansion
```
When listing created:
  1. Find all local_collectors with addresses within 5km
  2. Sort by distance ASC, take top 10
  3. Save notification to DB for each
  4. Send FCM push notification to each collector's fcm_token
  5. Schedule Redis job for 30 minutes
  
After 30 minutes (if listing still 'open'):
  1. Expand to 10km, find new collectors (exclude already notified)
  2. Notify new batch
  3. Schedule Redis job for 30 more minutes

After 60 minutes (if still 'open'):
  1. Expand to 20km, notify new batch

After 2 hours (if still 'open'):
  1. Change status to 'expired'
  2. Notify owner: "No collectors found nearby. Please try again."
```

### 2. Inventory Management
```
When collector marks listing as 'collected' with collection_point_id:
  1. UPSERT into inventory table (add actual_weight to available_weight_kg)
  2. Log to inventory_logs

When bulk_order status → 'confirmed':
  1. Reserve requested_weight_kg in inventory (available → reserved)

When bulk_order status → 'completed':
  1. Remove reserved_weight_kg from inventory
  2. Record payment

When bulk_order cancelled:
  1. Release reserved back to available
```

### 3. Payment Flow
```
Collector-to-Owner (small payments, cash/UPI):
  1. Collector pays owner in person
  2. Taps "Confirm Payment" in app
  3. Record payment in DB
  4. Push notification to owner: "₹X received!"

Regional Bulk Orders (larger, Razorpay):
  1. Create Razorpay order
  2. Mobile/web payment
  3. Webhook verification
  4. Mark bulk_order as paid
  5. Update inventory
```

### 4. Rating System
```
After listing 'completed':
  1. Both owner and collector can rate each other (1-5 stars)
  2. After review submitted, recalculate avg_rating for reviewed user:
     UPDATE users SET avg_rating = (SELECT AVG(rating) FROM reviews WHERE reviewee_id = :id),
     total_reviews = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = :id)
```

---

## CODE QUALITY REQUIREMENTS

1. **Error handling**: All async functions wrapped in try-catch, consistent error response format `{ error: "message", code: "ERROR_CODE" }`
2. **Input validation**: Use express-validator on all POST/PUT endpoints
3. **Authentication**: All protected routes use `authenticate` middleware, role-restricted routes use `requireRole()`
4. **Database transactions**: Use `BEGIN/COMMIT/ROLLBACK` for multi-table operations (accept job, complete listing, inventory updates)
5. **Rate limiting**: Global 200 req/15min, auth endpoints 10 req/15min
6. **Security**: helmet, CORS with whitelist, SQL parameterized queries (NO string interpolation with user input)
7. **Logging**: Morgan for HTTP logs, console.error for DB errors
8. **Pagination**: All list endpoints support `page` + `limit` params, return `{ data: [], total, page, limit }`
9. **Consistent timestamps**: All created_at/updated_at in TIMESTAMPTZ
10. **Soft deletes**: Never hard delete users, use `is_active = false`

---

## FILE / FOLDER CREATION ORDER

Build in this exact order:
1. `backend/` — migrations, seeds, config, middleware, controllers, routes, app.js
2. `frontend/` — package.json, vite.config, tailwind.config, index.css, components/ui, services/api.js, store, pages (start with Login → Dashboard → Users → Listings → CollectionPoints → GarbageTypes → BulkOrders → Analytics → Settings)
3. `mobile/` — app.json, package.json, auth flow, owner flow, collector flow, regional flow
4. `infrastructure/` — docker-compose.yml, backend/Dockerfile, frontend/Dockerfile, nginx.conf

---

## VALIDATION CHECKLIST

Before considering any system complete, verify:

### Backend ✓
- [ ] All 50+ API endpoints implemented and responding correctly
- [ ] JWT auth works (login → token → protected route → refresh)
- [ ] OTP flow works (send → verify → return tokens)
- [ ] PostGIS geo queries returning correct nearby listings
- [ ] Image upload working (multipart → Cloudinary → URL stored in DB)
- [ ] FCM notifications firing on listing creation
- [ ] Radius expansion cron job scheduled and firing
- [ ] Inventory correctly updated when listing collected
- [ ] Bulk order inventory reservation/release working
- [ ] All migrations run cleanly on fresh DB
- [ ] Seeds populate all required data
- [ ] Health endpoint returns 200

### Web Portal ✓
- [ ] Login works with admin credentials
- [ ] Dashboard loads with all 8 KPI cards and 3 charts
- [ ] Users table loads, search/filter works, verify/ban works
- [ ] Listings table loads, all filters work, detail modal shows photos + map
- [ ] Collection points page shows map + cards, create form works with photo upload
- [ ] Garbage types CRUD works including image upload
- [ ] Bulk orders table with status workflow actions
- [ ] Analytics page with all charts rendering
- [ ] Settings page saves and reloads
- [ ] Dispute management works
- [ ] Broadcast notification form works
- [ ] Auth redirect works (unauthenticated → /login)
- [ ] JWT token refresh works silently
- [ ] All loading states show skeleton loaders
- [ ] All empty states show helpful message
- [ ] Responsive down to 1280px width

### Mobile App ✓
- [ ] Welcome / phone / OTP / register flow complete
- [ ] House owner: post garbage with camera + GPS works
- [ ] House owner: listing status updates in real-time (or on refresh)
- [ ] Local collector: map shows nearby listings with pins
- [ ] Local collector: accept → navigate → collect → complete flow works
- [ ] Local collector: inventory screen shows their deposits
- [ ] Regional collector: browse inventory, place bulk order
- [ ] FCM push notifications received when listing posted nearby
- [ ] Profile photo upload works
- [ ] Logout and token refresh work

---

## ADDITIONAL NOTES FOR CURSOR

- Use `pg` library directly (not an ORM) for all database queries
- Use raw SQL with parameterized queries (`$1, $2` syntax)
- The `location` column in all geo tables is auto-populated by trigger from `latitude`/`longitude` — do not set it manually in INSERT statements
- For the mobile app, use `expo-location` for GPS, `expo-image-picker` for camera, `expo-notifications` for push
- Admin web portal is for role = 'admin' and role = 'collection_manager' only
- Regional web portal section is for role = 'regional_collector'
- The mobile app supports all 3 non-admin roles with role-based navigation
- When a collector is within 100m of the listing location, enable the "Confirm Collection" button (use GPS distance check)
- All monetary values stored as DECIMAL(10,2), displayed with ₹ symbol and 2 decimal places
- Use `date-fns` for all date formatting, never use `.toLocaleDateString()` directly
- Platform fee is configurable via platform_settings table, default 5%
