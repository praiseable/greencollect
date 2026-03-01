const db = require('../config/db');

async function getGarbageTypes(req, res) {
  try {
    const result = await db.query(
      `SELECT id, name, slug, description, icon, image_url, base_price_per_kg,
              min_price_per_kg, max_price_per_kg, color, is_recyclable
       FROM garbage_types WHERE is_active = TRUE ORDER BY sort_order, name`
    );
    res.json({ types: result.rows });
  } catch (err) {
    console.error('getGarbageTypes error:', err);
    res.status(500).json({ error: 'Failed to fetch garbage types' });
  }
}

async function createGarbageType(req, res) {
  try {
    const { name, slug, description, icon, image_url, base_price_per_kg, min_price_per_kg, max_price_per_kg, color } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    const result = await db.query(
      `INSERT INTO garbage_types (name, slug, description, icon, image_url, base_price_per_kg, min_price_per_kg, max_price_per_kg, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, slug, description || null, icon || '♻️', image_url || null, base_price_per_kg || 0, min_price_per_kg || 0, max_price_per_kg || 0, color || '#22c55e']
    );

    res.status(201).json({ type: result.rows[0] });
  } catch (err) {
    console.error('createGarbageType error:', err);
    res.status(500).json({ error: 'Failed to create garbage type' });
  }
}

module.exports = { getGarbageTypes, createGarbageType };
