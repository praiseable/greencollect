require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const migrations = [
  // Extensions
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
  `CREATE EXTENSION IF NOT EXISTS postgis;`,

  // ─── ENUMS ────────────────────────────────────────────
  `DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('house_owner','local_collector','regional_collector','collection_manager','admin');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  `DO $$ BEGIN
    CREATE TYPE listing_status AS ENUM ('open','assigned','in_progress','collected','completed','cancelled','expired');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  `DO $$ BEGIN
    CREATE TYPE bulk_order_status AS ENUM ('pending','confirmed','picked_up','completed','cancelled');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  `DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash','upi','wallet','bank_transfer','razorpay');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  `DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending','completed','failed','refunded');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  `DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('new_listing','job_accepted','job_collected','payment_received','bulk_order','system');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  // ─── DROP EXISTING TABLES (fresh schema on each deploy) ──
  `DO $$ BEGIN
    DROP TABLE IF EXISTS pricing_rules CASCADE;
    DROP TABLE IF EXISTS platform_settings CASCADE;
    DROP TABLE IF EXISTS disputes CASCADE;
    DROP TABLE IF EXISTS reviews CASCADE;
    DROP TABLE IF EXISTS notifications CASCADE;
    DROP TABLE IF EXISTS payments CASCADE;
    DROP TABLE IF EXISTS bulk_orders CASCADE;
    DROP TABLE IF EXISTS inventory_logs CASCADE;
    DROP TABLE IF EXISTS inventory CASCADE;
    DROP TABLE IF EXISTS listings CASCADE;
    DROP TABLE IF EXISTS collection_points CASCADE;
    DROP TABLE IF EXISTS garbage_types CASCADE;
    DROP TABLE IF EXISTS addresses CASCADE;
    DROP TABLE IF EXISTS refresh_tokens CASCADE;
    DROP TABLE IF EXISTS otp_sessions CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  END $$;`,

  // ─── TABLES ───────────────────────────────────────────

  // Users
  `CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL DEFAULT '',
    phone           VARCHAR(20) UNIQUE,
    email           VARCHAR(150) UNIQUE,
    password_hash   TEXT,
    role            user_role NOT NULL DEFAULT 'house_owner',
    is_verified     BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    profile_photo   TEXT,
    id_document_url TEXT,
    fcm_token       TEXT,
    avg_rating      DECIMAL(3,2) DEFAULT 0,
    total_reviews   INTEGER DEFAULT 0,
    wallet_balance  DECIMAL(10,2) DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
  );`,

  // OTP Sessions
  `CREATE TABLE IF NOT EXISTS otp_sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone       VARCHAR(20) NOT NULL,
    otp_hash    TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    is_used     BOOLEAN DEFAULT FALSE,
    attempts    INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );`,

  // Refresh Tokens
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    device_info TEXT,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );`,

  // Addresses
  `CREATE TABLE IF NOT EXISTS addresses (
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
  );`,

  // Garbage Types
  `CREATE TABLE IF NOT EXISTS garbage_types (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name              VARCHAR(100) NOT NULL,
    slug              VARCHAR(50) UNIQUE NOT NULL,
    description       TEXT,
    icon              VARCHAR(10) DEFAULT '♻️',
    image_url         TEXT,
    base_price_per_kg DECIMAL(10,2) DEFAULT 0,
    min_price_per_kg  DECIMAL(10,2) DEFAULT 0,
    max_price_per_kg  DECIMAL(10,2) DEFAULT 0,
    color             VARCHAR(20) DEFAULT '#22c55e',
    is_active         BOOLEAN DEFAULT TRUE,
    is_recyclable     BOOLEAN DEFAULT TRUE,
    sort_order        INTEGER DEFAULT 0,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
  );`,

  // Collection Points
  `CREATE TABLE IF NOT EXISTS collection_points (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(150) NOT NULL UNIQUE,
    manager_id      UUID REFERENCES users(id),
    address         TEXT NOT NULL,
    city            VARCHAR(100),
    state           VARCHAR(100),
    pincode         VARCHAR(20),
    latitude        DECIMAL(10,7),
    longitude       DECIMAL(10,7),
    location        GEOGRAPHY(POINT, 4326),
    phone           VARCHAR(20),
    photo_url       TEXT,
    capacity_kg     DECIMAL(10,2),
    is_active       BOOLEAN DEFAULT TRUE,
    operating_hours JSONB DEFAULT '{"mon":"9-18","tue":"9-18","wed":"9-18","thu":"9-18","fri":"9-18","sat":"9-14","sun":"closed"}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
  );`,

  // Listings
  `CREATE TABLE IF NOT EXISTS listings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_number      SERIAL UNIQUE,
    owner_id            UUID REFERENCES users(id) NOT NULL,
    collector_id        UUID REFERENCES users(id),
    address_id          UUID REFERENCES addresses(id),
    full_address        TEXT,
    city                VARCHAR(100),
    state               VARCHAR(100),
    latitude            DECIMAL(10,7),
    longitude           DECIMAL(10,7),
    location            GEOGRAPHY(POINT, 4326),
    photo_urls          TEXT[] DEFAULT '{}',
    garbage_type_id     UUID REFERENCES garbage_types(id),
    estimated_weight    DECIMAL(8,2),
    actual_weight       DECIMAL(8,2),
    asking_price        DECIMAL(10,2),
    final_price         DECIMAL(10,2),
    description         TEXT,
    status              listing_status DEFAULT 'open',
    collection_point_id UUID REFERENCES collection_points(id),
    current_radius_km   INTEGER DEFAULT 5,
    notify_count        INTEGER DEFAULT 0,
    posted_at           TIMESTAMPTZ DEFAULT NOW(),
    assigned_at         TIMESTAMPTZ,
    collected_at        TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours'
  );`,

  // Inventory
  `CREATE TABLE IF NOT EXISTS inventory (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_point_id UUID REFERENCES collection_points(id),
    garbage_type_id     UUID REFERENCES garbage_types(id),
    total_weight_kg     DECIMAL(10,2) DEFAULT 0,
    available_weight_kg DECIMAL(10,2) DEFAULT 0,
    reserved_weight_kg  DECIMAL(10,2) DEFAULT 0,
    last_updated        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(collection_point_id, garbage_type_id)
  );`,

  // Inventory Logs
  `CREATE TABLE IF NOT EXISTS inventory_logs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id        UUID REFERENCES inventory(id),
    listing_id          UUID REFERENCES listings(id),
    bulk_order_id       UUID,
    action              VARCHAR(20) NOT NULL,
    weight_kg           DECIMAL(10,2),
    added_by            UUID REFERENCES users(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
  );`,

  // Bulk Orders
  `CREATE TABLE IF NOT EXISTS bulk_orders (
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
    invoice_url          TEXT,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at         TIMESTAMPTZ,
    pickup_scheduled_at  TIMESTAMPTZ,
    completed_at         TIMESTAMPTZ
  );`,

  // Payments
  `CREATE TABLE IF NOT EXISTS payments (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id       UUID REFERENCES listings(id),
    bulk_order_id    UUID REFERENCES bulk_orders(id),
    payer_id         UUID REFERENCES users(id),
    payee_id         UUID REFERENCES users(id),
    amount           DECIMAL(10,2) NOT NULL,
    platform_fee     DECIMAL(10,2) DEFAULT 0,
    method           payment_method DEFAULT 'cash',
    status           payment_status DEFAULT 'pending',
    reference_id     VARCHAR(100),
    gateway_order_id VARCHAR(100),
    gateway_data     JSONB,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    completed_at     TIMESTAMPTZ
  );`,

  // Notifications
  `CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,
    title       TEXT NOT NULL,
    body        TEXT,
    data        JSONB DEFAULT '{}',
    image_url   TEXT,
    is_read     BOOLEAN DEFAULT FALSE,
    sent_at     TIMESTAMPTZ DEFAULT NOW()
  );`,

  // Reviews
  `CREATE TABLE IF NOT EXISTS reviews (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id   UUID REFERENCES listings(id),
    reviewer_id  UUID REFERENCES users(id),
    reviewee_id  UUID REFERENCES users(id),
    rating       SMALLINT CHECK (rating BETWEEN 1 AND 5),
    comment      TEXT,
    reply        TEXT,
    photos       TEXT[] DEFAULT '{}',
    created_at   TIMESTAMPTZ DEFAULT NOW()
  );`,

  // Disputes
  `CREATE TABLE IF NOT EXISTS disputes (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id     UUID REFERENCES listings(id),
    raised_by      UUID REFERENCES users(id),
    against        UUID REFERENCES users(id),
    reason         TEXT NOT NULL,
    description    TEXT,
    evidence_urls  TEXT[] DEFAULT '{}',
    status         VARCHAR(20) DEFAULT 'open',
    resolution     TEXT,
    resolved_by    UUID REFERENCES users(id),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    resolved_at    TIMESTAMPTZ
  );`,

  // Pricing Rules
  `CREATE TABLE IF NOT EXISTS pricing_rules (
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
  );`,

  // Platform Settings
  `CREATE TABLE IF NOT EXISTS platform_settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT,
    updated_by  UUID REFERENCES users(id),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
  );`,

  // ─── INDEXES ──────────────────────────────────────────
  `CREATE INDEX IF NOT EXISTS idx_listings_location ON listings USING GIST(location);`,
  `CREATE INDEX IF NOT EXISTS idx_addresses_location ON addresses USING GIST(location);`,
  `CREATE INDEX IF NOT EXISTS idx_collection_points_location ON collection_points USING GIST(location);`,
  `CREATE INDEX IF NOT EXISTS idx_listings_owner ON listings(owner_id);`,
  `CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);`,
  `CREATE INDEX IF NOT EXISTS idx_listings_collector ON listings(collector_id);`,
  `CREATE INDEX IF NOT EXISTS idx_listings_type ON listings(garbage_type_id);`,
  `CREATE INDEX IF NOT EXISTS idx_listings_posted_at ON listings(posted_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_listings_expires ON listings(expires_at) WHERE status = 'open';`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);`,
  `CREATE INDEX IF NOT EXISTS idx_bulk_orders_status ON bulk_orders(status);`,
  `CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_sessions(phone, expires_at);`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_cp ON inventory(collection_point_id);`,
  `CREATE INDEX IF NOT EXISTS idx_payments_payer ON payments(payer_id);`,
  `CREATE INDEX IF NOT EXISTS idx_payments_payee ON payments(payee_id);`,
  `CREATE INDEX IF NOT EXISTS idx_bulk_orders_buyer ON bulk_orders(buyer_id);`,

  // ─── TRIGGERS ─────────────────────────────────────────
  `CREATE OR REPLACE FUNCTION sync_location() RETURNS TRIGGER AS $$
   BEGIN
     IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
       NEW.location = ST_MakePoint(NEW.longitude, NEW.latitude)::geography;
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;`,

  `DO $$ BEGIN
    CREATE TRIGGER t_listings_loc BEFORE INSERT OR UPDATE ON listings
      FOR EACH ROW EXECUTE FUNCTION sync_location();
  EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  `DO $$ BEGIN
    CREATE TRIGGER t_addresses_loc BEFORE INSERT OR UPDATE ON addresses
      FOR EACH ROW EXECUTE FUNCTION sync_location();
  EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  `DO $$ BEGIN
    CREATE TRIGGER t_cp_loc BEFORE INSERT OR UPDATE ON collection_points
      FOR EACH ROW EXECUTE FUNCTION sync_location();
  EXCEPTION WHEN duplicate_object THEN null; END $$;`,
];

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');
    for (let i = 0; i < migrations.length; i++) {
      await client.query(migrations[i]);
      console.log(`  Migration ${i + 1}/${migrations.length} done`);
    }
    console.log('All migrations completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
