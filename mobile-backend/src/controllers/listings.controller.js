const db = require('../config/db');
const { notifyNearbyCollectors } = require('../services/notification.service');

async function createListing(req, res) {
  try {
    const userId = req.user.id;
    const { garbage_type_id, latitude, longitude, full_address, city, state, estimated_weight, asking_price, description } = req.body;

    if (!garbage_type_id || !latitude || !longitude) {
      return res.status(400).json({ error: 'garbage_type_id, latitude, and longitude are required' });
    }

    const photoUrls = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

    const result = await db.query(
      `INSERT INTO listings (owner_id, garbage_type_id, latitude, longitude, full_address, city, state, photo_urls, estimated_weight, asking_price, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [userId, garbage_type_id, latitude, longitude, full_address || '', city || null, state || null, photoUrls, estimated_weight || null, asking_price || null, description || null]
    );

    const listing = result.rows[0];

    // Get garbage type name for notifications
    const gtResult = await db.query('SELECT name FROM garbage_types WHERE id = $1', [garbage_type_id]);
    const garbageTypeName = gtResult.rows[0]?.name || 'Garbage';

    // Notify nearby collectors (non-blocking)
    notifyNearbyCollectors({
      id: listing.id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      garbage_type_name: garbageTypeName,
      asking_price: asking_price || 0,
    }).catch(err => console.error('Notification error:', err));

    res.status(201).json({ listing });
  } catch (err) {
    console.error('createListing error:', err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
}

async function getMyListings(req, res) {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE l.owner_id = $1';
    const params = [userId];
    let idx = 2;

    if (status) {
      whereClause += ` AND l.status = $${idx++}`;
      params.push(status);
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM listings l ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), parseInt(offset));
    const result = await db.query(
      `SELECT l.id, l.listing_number, l.status, l.latitude, l.longitude, l.full_address, l.city,
              l.photo_urls, l.estimated_weight, l.actual_weight, l.asking_price, l.final_price,
              l.description, l.posted_at, l.assigned_at, l.collected_at, l.completed_at,
              gt.name as garbage_type_name, gt.icon as garbage_type_icon, gt.slug as garbage_type_slug,
              c.name as collector_name, c.phone as collector_phone
       FROM listings l
       LEFT JOIN garbage_types gt ON gt.id = l.garbage_type_id
       LEFT JOIN users c ON c.id = l.collector_id
       ${whereClause}
       ORDER BY l.posted_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({ listings: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('getMyListings error:', err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
}

async function getNearbyListings(req, res) {
  try {
    const { lat, lng, radius = 5, garbage_type, page = 1, limit = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const radiusMeters = parseFloat(radius) * 1000;
    const offset = (page - 1) * limit;

    let whereExtra = '';
    const params = [parseFloat(lng), parseFloat(lat), radiusMeters];
    let idx = 4;

    if (garbage_type) {
      whereExtra += ` AND gt.slug = $${idx++}`;
      params.push(garbage_type);
    }

    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(
      `SELECT l.id, l.listing_number, l.owner_id, l.photo_urls, l.estimated_weight, l.asking_price,
              l.description, l.status, l.posted_at, l.full_address, l.city,
              l.latitude, l.longitude,
              gt.name as garbage_type, gt.slug as garbage_type_slug, gt.icon as garbage_type_icon,
              u.name as owner_name,
              ROUND((ST_Distance(l.location, ST_MakePoint($1, $2)::geography) / 1000)::numeric, 1) as distance_km
       FROM listings l
       LEFT JOIN garbage_types gt ON gt.id = l.garbage_type_id
       LEFT JOIN users u ON u.id = l.owner_id
       WHERE l.status = 'open'
         AND ST_DWithin(l.location, ST_MakePoint($1, $2)::geography, $3)
         ${whereExtra}
       ORDER BY distance_km ASC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({ listings: result.rows });
  } catch (err) {
    console.error('getNearbyListings error:', err);
    res.status(500).json({ error: 'Failed to fetch nearby listings' });
  }
}

async function getListing(req, res) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT l.*, gt.name as garbage_type_name, gt.icon as garbage_type_icon,
              gt.slug as garbage_type_slug, gt.base_price_per_kg,
              u.name as owner_name, u.phone as owner_phone, u.avg_rating as owner_rating,
              c.name as collector_name, c.phone as collector_phone, c.avg_rating as collector_rating,
              cp.name as collection_point_name
       FROM listings l
       LEFT JOIN garbage_types gt ON gt.id = l.garbage_type_id
       LEFT JOIN users u ON u.id = l.owner_id
       LEFT JOIN users c ON c.id = l.collector_id
       LEFT JOIN collection_points cp ON cp.id = l.collection_point_id
       WHERE l.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json({ listing: result.rows[0] });
  } catch (err) {
    console.error('getListing error:', err);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
}

async function acceptListing(req, res) {
  try {
    const { id } = req.params;
    const collectorId = req.user.id;

    const result = await db.query(
      `UPDATE listings SET collector_id = $1, status = 'assigned', assigned_at = NOW()
       WHERE id = $2 AND status = 'open'
       RETURNING *`,
      [collectorId, id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Listing not available or already taken' });
    }

    const listing = result.rows[0];

    // Insert notification for owner
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, 'job_accepted', 'Collector is on the way!', $2, $3)`,
      [
        listing.owner_id,
        `${req.user.name} has accepted your garbage pickup.`,
        JSON.stringify({ listing_id: id, collector_id: collectorId }),
      ]
    );

    res.json({ listing: result.rows[0] });
  } catch (err) {
    console.error('acceptListing error:', err);
    res.status(500).json({ error: 'Failed to accept listing' });
  }
}

async function collectListing(req, res) {
  try {
    const { id } = req.params;
    const collectorId = req.user.id;
    const { actual_weight, final_price, collection_point_id } = req.body;

    const result = await db.query(
      `UPDATE listings SET status = 'collected', actual_weight = $1,
       final_price = $2, collection_point_id = $3, collected_at = NOW()
       WHERE id = $4 AND collector_id = $5 AND status IN ('assigned','in_progress')
       RETURNING *`,
      [actual_weight || null, final_price || null, collection_point_id || null, id, collectorId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Cannot mark this listing as collected' });
    }

    // Update inventory at collection point
    if (collection_point_id && actual_weight) {
      const listing = result.rows[0];
      const weight = parseFloat(actual_weight);

      await db.query(
        `INSERT INTO inventory (collection_point_id, garbage_type_id, total_weight_kg, available_weight_kg)
         VALUES ($1, $2, $3, $3)
         ON CONFLICT (collection_point_id, garbage_type_id)
         DO UPDATE SET total_weight_kg = inventory.total_weight_kg + $3,
                       available_weight_kg = inventory.available_weight_kg + $3,
                       last_updated = NOW()`,
        [collection_point_id, listing.garbage_type_id, weight]
      );

      // Log inventory change
      await db.query(
        `INSERT INTO inventory_logs (inventory_id, listing_id, action, weight_kg, added_by, notes)
         SELECT i.id, $1, 'add', $2, $3, 'Listing collected and deposited'
         FROM inventory i
         WHERE i.collection_point_id = $4 AND i.garbage_type_id = $5`,
        [id, weight, collectorId, collection_point_id, listing.garbage_type_id]
      );
    }

    // Notify owner
    const listing = result.rows[0];
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, 'job_collected', 'Garbage Collected!', $2, $3)`,
      [
        listing.owner_id,
        `Your garbage has been collected. Weight: ${actual_weight || 'N/A'}kg`,
        JSON.stringify({ listing_id: id }),
      ]
    );

    res.json({ listing: result.rows[0] });
  } catch (err) {
    console.error('collectListing error:', err);
    res.status(500).json({ error: 'Failed to mark as collected' });
  }
}

async function completePayment(req, res) {
  try {
    const { id } = req.params;
    const collectorId = req.user.id;
    const { payment_method, amount } = req.body;

    // Update listing status
    const listingResult = await db.query(
      `UPDATE listings SET status = 'completed', completed_at = NOW()
       WHERE id = $1 AND collector_id = $2 AND status = 'collected'
       RETURNING *`,
      [id, collectorId]
    );

    if (listingResult.rows.length === 0) {
      return res.status(400).json({ error: 'Cannot complete payment for this listing' });
    }

    const listing = listingResult.rows[0];
    const payAmount = parseFloat(amount || listing.final_price || 0);

    // Create payment record
    const paymentResult = await db.query(
      `INSERT INTO payments (listing_id, payer_id, payee_id, amount, method, status, completed_at)
       VALUES ($1, $2, $3, $4, $5::payment_method, 'completed', NOW())
       RETURNING *`,
      [id, collectorId, listing.owner_id, payAmount, payment_method || 'cash']
    );

    // Notify house owner
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, 'payment_received', 'Payment Received!', $2, $3)`,
      [
        listing.owner_id,
        `You received RS ${payAmount} for your garbage pickup.`,
        JSON.stringify({ listing_id: id, payment_id: paymentResult.rows[0].id }),
      ]
    );

    res.json({ listing: listingResult.rows[0], payment: paymentResult.rows[0] });
  } catch (err) {
    console.error('completePayment error:', err);
    res.status(500).json({ error: 'Failed to complete payment' });
  }
}

async function getAssignedListings(req, res) {
  try {
    const collectorId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE l.collector_id = $1';
    const params = [collectorId];
    let idx = 2;

    if (status) {
      whereClause += ` AND l.status = $${idx++}`;
      params.push(status);
    } else {
      whereClause += ` AND l.status IN ('assigned', 'in_progress', 'collected')`;
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM listings l ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), parseInt(offset));
    const result = await db.query(
      `SELECT l.id, l.listing_number, l.status, l.latitude, l.longitude, l.full_address, l.city,
              l.photo_urls, l.estimated_weight, l.actual_weight, l.asking_price, l.final_price,
              l.description, l.posted_at, l.assigned_at, l.collected_at,
              gt.name as garbage_type_name, gt.icon as garbage_type_icon,
              u.name as owner_name, u.phone as owner_phone
       FROM listings l
       LEFT JOIN garbage_types gt ON gt.id = l.garbage_type_id
       LEFT JOIN users u ON u.id = l.owner_id
       ${whereClause}
       ORDER BY l.posted_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({ listings: result.rows, total, page: parseInt(page) });
  } catch (err) {
    console.error('getAssignedListings error:', err);
    res.status(500).json({ error: 'Failed to fetch assigned listings' });
  }
}

module.exports = {
  createListing,
  getMyListings,
  getNearbyListings,
  getAssignedListings,
  getListing,
  acceptListing,
  collectListing,
  completePayment,
};
