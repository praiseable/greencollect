require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 8 garbage types per spec
const garbageTypes = [
  { name: 'Paper / Cardboard', slug: 'paper', icon: '📰', description: 'Newspapers, cartons, cardboard boxes', base_price: 8, min_price: 5, max_price: 12, color: '#f59e0b' },
  { name: 'Plastic', slug: 'plastic', icon: '🧴', description: 'PET bottles, plastic containers, bags', base_price: 12, min_price: 8, max_price: 18, color: '#3b82f6' },
  { name: 'Metal / Scrap', slug: 'metal', icon: '⚙️', description: 'Iron, steel, aluminum cans, copper wires', base_price: 30, min_price: 20, max_price: 50, color: '#6b7280' },
  { name: 'Glass', slug: 'glass', icon: '🫙', description: 'Glass bottles, jars, broken glass', base_price: 5, min_price: 3, max_price: 8, color: '#06b6d4' },
  { name: 'E-Waste', slug: 'ewaste', icon: '💻', description: 'Old phones, computers, circuit boards, cables', base_price: 50, min_price: 30, max_price: 100, color: '#8b5cf6' },
  { name: 'Organic', slug: 'organic', icon: '🌱', description: 'Kitchen waste, garden waste, food scraps', base_price: 2, min_price: 1, max_price: 5, color: '#22c55e' },
  { name: 'Cloth / Textile', slug: 'cloth', icon: '👕', description: 'Old clothes, fabric, rags, upholstery', base_price: 6, min_price: 4, max_price: 10, color: '#ec4899' },
  { name: 'Rubber', slug: 'rubber', icon: '🔘', description: 'Tyres, rubber mats, rubber products', base_price: 4, min_price: 2, max_price: 8, color: '#1e293b' },
];

// Essential users (always seeded — needed for web portal login)
const essentialUsers = [
  { name: 'Admin User', phone: '+929999990000', email: 'admin@greencollect.app', role: 'admin', password: 'Admin@123456' },
  { name: 'Ali Enterprises', phone: '+929999990003', email: 'regional@greencollect.app', role: 'regional_collector', password: 'regional123' },
  { name: 'Fatima Manager', phone: '+929999990004', email: 'manager@greencollect.app', role: 'collection_manager', password: 'manager123' },
];

// Dev-only test users
const devUsers = [
  { name: 'Ahmed Khan', phone: '+929999990001', role: 'house_owner' },
  { name: 'Bilal Hussain', phone: '+929999990002', role: 'local_collector' },
];

// 4 collection points per spec
const collectionPoints = [
  { name: 'Lahore North Collection Point', address: '45 Industrial Area, Shahdara, North Lahore', city: 'Lahore', state: 'Punjab', lat: 31.5820, lng: 74.3294, phone: '+924212345678' },
  { name: 'Lahore South Collection Point', address: '12 Industrial Estate, Township, South Lahore', city: 'Lahore', state: 'Punjab', lat: 31.4504, lng: 74.3587, phone: '+924219876543' },
  { name: 'Karachi Central Depot', address: '78 Korangi Industrial Area, Karachi', city: 'Karachi', state: 'Sindh', lat: 24.8607, lng: 67.0011, phone: '+922134567890' },
  { name: 'Islamabad Collection Center', address: 'I-9 Industrial Area, Islamabad', city: 'Islamabad', state: 'Islamabad', lat: 33.6844, lng: 73.0479, phone: '+925145678901' },
];

// Platform settings per spec
const platformSettings = [
  { key: 'default_radius_km', value: '5', description: 'Default search radius for nearby listings (km)' },
  { key: 'radius_expand_interval_minutes', value: '30', description: 'Minutes before expanding radius for unaccepted listings' },
  { key: 'max_radius_km', value: '20', description: 'Maximum search radius (km)' },
  { key: 'platform_fee_percent', value: '5', description: 'Platform fee percentage on transactions' },
  { key: 'otp_expiry_minutes', value: '5', description: 'OTP expiry time (minutes)' },
  { key: 'max_photos_per_listing', value: '5', description: 'Maximum number of photos per listing' },
  { key: 'listing_expiry_hours', value: '48', description: 'Hours before a listing expires' },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding database...');

    // 1. Seed garbage types
    for (const gt of garbageTypes) {
      await client.query(
        `INSERT INTO garbage_types (name, slug, icon, description, base_price_per_kg, min_price_per_kg, max_price_per_kg, color, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (slug) DO UPDATE SET
           name = $1, icon = $3, description = $4,
           base_price_per_kg = $5, min_price_per_kg = $6, max_price_per_kg = $7,
           color = $8, updated_at = NOW()`,
        [gt.name, gt.slug, gt.icon, gt.description, gt.base_price, gt.min_price, gt.max_price, gt.color, garbageTypes.indexOf(gt)]
      );
    }
    console.log(`  ✓ Seeded ${garbageTypes.length} garbage types`);

    // 2. Seed essential users (admin + regional — always, even in production)
    for (const user of essentialUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await client.query(
        `INSERT INTO users (name, phone, email, password_hash, role, is_verified, is_active)
         VALUES ($1, $2, $3, $4, $5::user_role, TRUE, TRUE)
         ON CONFLICT (phone) DO UPDATE SET
           name = $1, email = COALESCE($3, users.email),
           password_hash = $4, role = $5::user_role, is_verified = TRUE`,
        [user.name, user.phone, user.email, passwordHash, user.role]
      );
    }
    console.log(`  ✓ Seeded ${essentialUsers.length} essential users (admin/manager/regional)`);

    // 3. Seed collection points (always — needed for the app to work)
    // Look up manager user to assign to collection points
    const managerResult = await client.query("SELECT id FROM users WHERE email = 'manager@greencollect.app' LIMIT 1");
    const managerId = managerResult.rows[0]?.id || null;

    for (const cp of collectionPoints) {
      await client.query(
        `INSERT INTO collection_points (name, manager_id, address, latitude, longitude, city, state, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (name) DO UPDATE SET
           manager_id = COALESCE($2, collection_points.manager_id),
           address = $3, latitude = $4, longitude = $5, city = $6, state = $7, phone = $8`,
        [cp.name, managerId, cp.address, cp.lat, cp.lng, cp.city, cp.state, cp.phone]
      );
    }
    console.log(`  ✓ Seeded ${collectionPoints.length} collection points (manager: ${managerId ? 'assigned' : 'none'})`);

    // 4. Seed platform settings
    for (const s of platformSettings) {
      await client.query(
        `INSERT INTO platform_settings (key, value, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE SET value = $2, description = $3, updated_at = NOW()`,
        [s.key, s.value, s.description]
      );
    }
    console.log(`  ✓ Seeded ${platformSettings.length} platform settings`);

    // 5. Dev-only: test users + sample listings
    if (process.env.NODE_ENV !== 'production') {
      for (const user of devUsers) {
        await client.query(
          `INSERT INTO users (name, phone, email, role, is_verified, is_active)
           VALUES ($1, $2, $3, $4::user_role, TRUE, TRUE)
           ON CONFLICT (phone) DO UPDATE SET name = $1, role = $4::user_role, is_verified = TRUE`,
          [user.name, user.phone, user.email || null, user.role]
        );
      }
      console.log(`  ✓ Seeded ${devUsers.length} dev test users`);

      // Sample listings (dev only)
      const ownerResult = await client.query("SELECT id FROM users WHERE phone = '+929999990001' LIMIT 1");
      const collectorResult = await client.query("SELECT id FROM users WHERE phone = '+929999990002' LIMIT 1");
      const gtResult = await client.query("SELECT id FROM garbage_types WHERE slug = 'paper' LIMIT 1");
      const cpResult = await client.query("SELECT id FROM collection_points LIMIT 1");

      if (ownerResult.rows[0] && gtResult.rows[0]) {
        const ownerId = ownerResult.rows[0].id;
        const collectorId = collectorResult.rows[0]?.id;
        const gtId = gtResult.rows[0].id;
        const cpId = cpResult.rows[0]?.id;

        // 1 open listing
        await client.query(
          `INSERT INTO listings (owner_id, garbage_type_id, latitude, longitude, full_address, city, estimated_weight, asking_price, description, status)
           VALUES ($1, $2, 31.5204, 74.3587, '123 Mall Road, Lahore', 'Lahore', 5.0, 40.00, 'Old newspapers and cardboard boxes', 'open')
           ON CONFLICT DO NOTHING`,
          [ownerId, gtId]
        );

        // 1 completed listing
        if (collectorId) {
          await client.query(
            `INSERT INTO listings (owner_id, collector_id, garbage_type_id, collection_point_id, latitude, longitude, full_address, city, estimated_weight, actual_weight, asking_price, final_price, description, status, collected_at, completed_at)
             VALUES ($1, $2, $3, $4, 31.5300, 74.3600, '456 Gulberg Main Boulevard, Lahore', 'Lahore', 3.0, 2.8, 24.00, 22.40, 'Mixed paper waste', 'completed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
             ON CONFLICT DO NOTHING`,
            [ownerId, collectorId, gtId, cpId]
          );
        }

        // 1 cancelled listing
        await client.query(
          `INSERT INTO listings (owner_id, garbage_type_id, latitude, longitude, full_address, city, estimated_weight, asking_price, description, status)
           VALUES ($1, $2, 31.5400, 74.3700, '789 Defence Road, Lahore', 'Lahore', 2.0, 16.00, 'Cancelled — changed my mind', 'cancelled')
           ON CONFLICT DO NOTHING`,
          [ownerId, gtId]
        );

        console.log('  ✓ Seeded 3 sample listings');
      }
    }

    console.log('\nSeeding completed!');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
