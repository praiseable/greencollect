const db = require('../config/db');

async function getNearbyCollectionPoints(req, res) {
  try {
    const { lat, lng, radius = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const radiusMeters = parseFloat(radius) * 1000;

    const result = await db.query(
      `SELECT cp.id, cp.name, cp.address, cp.city, cp.state,
              cp.latitude, cp.longitude, cp.phone, cp.photo_url,
              cp.operating_hours,
              ROUND((ST_Distance(cp.location, ST_MakePoint($1, $2)::geography) / 1000)::numeric, 1) as distance_km
       FROM collection_points cp
       WHERE cp.is_active = TRUE
         AND ST_DWithin(cp.location, ST_MakePoint($1, $2)::geography, $3)
       ORDER BY distance_km ASC`,
      [parseFloat(lng), parseFloat(lat), radiusMeters]
    );

    res.json({ points: result.rows });
  } catch (err) {
    console.error('getNearbyCollectionPoints error:', err);
    res.status(500).json({ error: 'Failed to fetch collection points' });
  }
}

async function getCollectionPointInventory(req, res) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT gt.name as garbage_type, gt.slug, gt.icon,
              i.available_weight_kg, i.total_weight_kg, i.reserved_weight_kg, i.last_updated
       FROM inventory i
       JOIN garbage_types gt ON gt.id = i.garbage_type_id
       WHERE i.collection_point_id = $1 AND i.available_weight_kg > 0
       ORDER BY gt.name`,
      [id]
    );

    res.json({ inventory: result.rows });
  } catch (err) {
    console.error('getCollectionPointInventory error:', err);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
}

async function createCollectionPoint(req, res) {
  try {
    const { name, address, latitude, longitude, city, state, phone } = req.body;

    if (!name || !address || !latitude || !longitude) {
      return res.status(400).json({ error: 'Name, address, latitude, longitude are required' });
    }

    const result = await db.query(
      `INSERT INTO collection_points (name, manager_id, address, latitude, longitude, city, state, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, req.user.id, address, parseFloat(latitude), parseFloat(longitude), city || null, state || null, phone || null]
    );

    res.status(201).json({ collection_point: result.rows[0] });
  } catch (err) {
    console.error('createCollectionPoint error:', err);
    res.status(500).json({ error: 'Failed to create collection point' });
  }
}

module.exports = { getNearbyCollectionPoints, getCollectionPointInventory, createCollectionPoint };
