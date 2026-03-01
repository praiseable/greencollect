# 🗄️ Database Schema — GreenCollect

## Database: PostgreSQL + PostGIS

---

## Tables

### `users`
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  phone         VARCHAR(20) UNIQUE NOT NULL,
  email         VARCHAR(150) UNIQUE,
  role          ENUM('house_owner', 'local_collector', 'regional_collector', 'admin') NOT NULL,
  is_verified   BOOLEAN DEFAULT FALSE,
  is_active     BOOLEAN DEFAULT TRUE,
  profile_photo TEXT,
  fcm_token     TEXT,                        -- for push notifications
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### `addresses`
```sql
CREATE TABLE addresses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  label       VARCHAR(50),                  -- 'Home', 'Office'
  full_address TEXT NOT NULL,
  city        VARCHAR(100),
  state       VARCHAR(100),
  pincode     VARCHAR(20),
  location    GEOGRAPHY(POINT, 4326) NOT NULL,  -- PostGIS lat/lng
  is_default  BOOLEAN DEFAULT FALSE
);
```

### `garbage_types`
```sql
CREATE TABLE garbage_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,       -- 'Paper', 'Plastic', 'Metal'
  slug          VARCHAR(50) UNIQUE NOT NULL,
  description   TEXT,
  icon_url      TEXT,
  base_price_per_kg DECIMAL(10,2),           -- suggested price
  is_active     BOOLEAN DEFAULT TRUE
);
```

### `listings`
```sql
CREATE TABLE listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID REFERENCES users(id) NOT NULL,
  collector_id    UUID REFERENCES users(id),
  address_id      UUID REFERENCES addresses(id),
  location        GEOGRAPHY(POINT, 4326) NOT NULL,
  photo_urls      TEXT[],                    -- array of image URLs
  garbage_type_id UUID REFERENCES garbage_types(id),
  estimated_weight DECIMAL(8,2),             -- kg
  asking_price    DECIMAL(10,2),
  final_price     DECIMAL(10,2),
  description     TEXT,
  status          ENUM(
                    'open',                  -- posted, waiting for collector
                    'assigned',              -- collector accepted
                    'in_progress',           -- collector en route
                    'collected',             -- picked up, payment pending
                    'completed',             -- paid and closed
                    'cancelled'
                  ) DEFAULT 'open',
  posted_at       TIMESTAMPTZ DEFAULT NOW(),
  collected_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);
```

### `collection_points`
```sql
CREATE TABLE collection_points (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(150) NOT NULL,
  manager_id  UUID REFERENCES users(id),
  address     TEXT NOT NULL,
  location    GEOGRAPHY(POINT, 4326) NOT NULL,
  city        VARCHAR(100),
  state       VARCHAR(100),
  is_active   BOOLEAN DEFAULT TRUE
);
```

### `inventory`
```sql
CREATE TABLE inventory (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_point_id UUID REFERENCES collection_points(id),
  garbage_type_id     UUID REFERENCES garbage_types(id),
  total_weight_kg     DECIMAL(10,2) DEFAULT 0,
  available_weight_kg DECIMAL(10,2) DEFAULT 0,
  last_updated        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_point_id, garbage_type_id)
);
```

### `inventory_logs`
```sql
CREATE TABLE inventory_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id        UUID REFERENCES inventory(id),
  listing_id          UUID REFERENCES listings(id),
  weight_added_kg     DECIMAL(10,2),
  added_by            UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### `bulk_orders`
```sql
CREATE TABLE bulk_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id            UUID REFERENCES users(id),       -- regional collector
  collection_point_id UUID REFERENCES collection_points(id),
  garbage_type_id     UUID REFERENCES garbage_types(id),
  requested_weight_kg DECIMAL(10,2),
  agreed_price_per_kg DECIMAL(10,2),
  total_amount        DECIMAL(12,2),
  status              ENUM('pending', 'confirmed', 'picked_up', 'completed', 'cancelled') DEFAULT 'pending',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  pickup_scheduled_at TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ
);
```

### `payments`
```sql
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID REFERENCES listings(id),
  payer_id        UUID REFERENCES users(id),           -- collector
  payee_id        UUID REFERENCES users(id),           -- house owner
  amount          DECIMAL(10,2) NOT NULL,
  method          ENUM('cash', 'upi', 'wallet', 'bank_transfer'),
  status          ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  reference_id    VARCHAR(100),                        -- payment gateway ref
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `notifications`
```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  type        VARCHAR(50),                             -- 'new_listing', 'job_accepted', etc.
  title       TEXT,
  body        TEXT,
  data        JSONB,
  is_read     BOOLEAN DEFAULT FALSE,
  sent_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### `reviews`
```sql
CREATE TABLE reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    UUID REFERENCES listings(id),
  reviewer_id   UUID REFERENCES users(id),
  reviewee_id   UUID REFERENCES users(id),
  rating        SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Key Indexes

```sql
-- Location-based queries (PostGIS)
CREATE INDEX idx_listings_location ON listings USING GIST(location);
CREATE INDEX idx_addresses_location ON addresses USING GIST(location);
CREATE INDEX idx_collection_points_location ON collection_points USING GIST(location);

-- Common lookups
CREATE INDEX idx_listings_owner ON listings(owner_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_collector ON listings(collector_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
```

---

## Geo Query Example (Find listings within 5km of collector)

```sql
SELECT l.*, 
  ST_Distance(l.location, ST_MakePoint(:lng, :lat)::geography) AS distance_meters
FROM listings l
WHERE l.status = 'open'
  AND ST_DWithin(
    l.location,
    ST_MakePoint(:lng, :lat)::geography,
    5000  -- 5000 meters = 5km
  )
ORDER BY distance_meters ASC
LIMIT 20;
```
