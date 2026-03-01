const db = require('../config/db');

async function getAvailableInventory(req, res) {
  try {
    const { city, garbage_type, min_weight = 0 } = req.query;

    let whereExtra = '';
    const params = [parseFloat(min_weight)];
    let idx = 2;

    if (city) {
      whereExtra += ` AND cp.city = $${idx++}`;
      params.push(city);
    }
    if (garbage_type) {
      whereExtra += ` AND gt.slug = $${idx++}`;
      params.push(garbage_type);
    }

    const result = await db.query(
      `SELECT cp.id as collection_point_id, cp.name as collection_point_name,
              cp.city, cp.state, cp.address,
              gt.name as garbage_type, gt.slug as garbage_type_slug, gt.id as garbage_type_id,
              i.available_weight_kg, i.total_weight_kg,
              gt.base_price_per_kg as suggested_price_per_kg
       FROM inventory i
       JOIN collection_points cp ON cp.id = i.collection_point_id
       JOIN garbage_types gt ON gt.id = i.garbage_type_id
       WHERE i.available_weight_kg >= $1 AND cp.is_active = TRUE
       ${whereExtra}
       ORDER BY i.available_weight_kg DESC`,
      params
    );

    res.json({ inventory: result.rows });
  } catch (err) {
    console.error('getAvailableInventory error:', err);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
}

async function getMyOrders(req, res) {
  try {
    const buyerId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereExtra = '';
    const params = [buyerId];
    let idx = 2;

    if (status) {
      whereExtra += ` AND bo.status = $${idx++}`;
      params.push(status);
    }

    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(
      `SELECT bo.*, cp.name as collection_point_name, cp.city,
              gt.name as garbage_type_name
       FROM bulk_orders bo
       JOIN collection_points cp ON cp.id = bo.collection_point_id
       JOIN garbage_types gt ON gt.id = bo.garbage_type_id
       WHERE bo.buyer_id = $1 ${whereExtra}
       ORDER BY bo.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({ orders: result.rows });
  } catch (err) {
    console.error('getMyOrders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

async function createOrder(req, res) {
  try {
    const buyerId = req.user.id;
    const { collection_point_id, garbage_type_id, requested_weight_kg, offered_price_per_kg } = req.body;

    if (!collection_point_id || !garbage_type_id || !requested_weight_kg || !offered_price_per_kg) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const invResult = await db.query(
      'SELECT available_weight_kg FROM inventory WHERE collection_point_id = $1 AND garbage_type_id = $2',
      [collection_point_id, garbage_type_id]
    );

    if (invResult.rows.length === 0 || invResult.rows[0].available_weight_kg < requested_weight_kg) {
      return res.status(400).json({ error: 'Insufficient inventory' });
    }

    const totalAmount = parseFloat(requested_weight_kg) * parseFloat(offered_price_per_kg);

    const result = await db.query(
      `INSERT INTO bulk_orders (buyer_id, collection_point_id, garbage_type_id, requested_weight_kg, agreed_price_per_kg, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [buyerId, collection_point_id, garbage_type_id, requested_weight_kg, offered_price_per_kg, totalAmount]
    );

    res.status(201).json({ order: result.rows[0] });
  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
}

async function pickupDone(req, res) {
  try {
    const { id } = req.params;
    const buyerId = req.user.id;

    const result = await db.query(
      `UPDATE bulk_orders SET status = 'completed', completed_at = NOW()
       WHERE id = $1 AND buyer_id = $2 AND status = 'confirmed' RETURNING *`,
      [id, buyerId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Order not found or not confirmed' });
    }

    const order = result.rows[0];

    await db.query(
      `UPDATE inventory SET available_weight_kg = GREATEST(available_weight_kg - $1, 0), last_updated = NOW()
       WHERE collection_point_id = $2 AND garbage_type_id = $3`,
      [order.requested_weight_kg, order.collection_point_id, order.garbage_type_id]
    );

    res.json({ order: result.rows[0] });
  } catch (err) {
    console.error('pickupDone error:', err);
    res.status(500).json({ error: 'Failed to complete pickup' });
  }
}

module.exports = { getAvailableInventory, getMyOrders, createOrder, pickupDone };
