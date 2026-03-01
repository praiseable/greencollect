const db = require('../config/db');

async function getAvailableLots(req, res) {
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
              cp.city, cp.state,
              gt.name as garbage_type, gt.slug as garbage_type_slug, gt.id as garbage_type_id,
              i.available_weight_kg,
              gt.base_price_per_kg as suggested_price_per_kg
       FROM inventory i
       JOIN collection_points cp ON cp.id = i.collection_point_id
       JOIN garbage_types gt ON gt.id = i.garbage_type_id
       WHERE i.available_weight_kg >= $1 AND cp.is_active = TRUE
       ${whereExtra}
       ORDER BY i.available_weight_kg DESC`,
      params
    );

    res.json({ lots: result.rows });
  } catch (err) {
    console.error('getAvailableLots error:', err);
    res.status(500).json({ error: 'Failed to fetch available lots' });
  }
}

async function createBulkOrder(req, res) {
  try {
    const buyerId = req.user.id;
    const { collection_point_id, garbage_type_id, requested_weight_kg, offered_price_per_kg } = req.body;

    if (!collection_point_id || !garbage_type_id || !requested_weight_kg || !offered_price_per_kg) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check available inventory
    const invResult = await db.query(
      'SELECT available_weight_kg FROM inventory WHERE collection_point_id = $1 AND garbage_type_id = $2',
      [collection_point_id, garbage_type_id]
    );

    if (invResult.rows.length === 0 || invResult.rows[0].available_weight_kg < requested_weight_kg) {
      return res.status(400).json({ error: 'Insufficient inventory' });
    }

    const totalAmount = parseFloat(requested_weight_kg) * parseFloat(offered_price_per_kg);

    const result = await db.query(
      `INSERT INTO bulk_orders (buyer_id, collection_point_id, garbage_type_id, requested_weight_kg, offered_price_per_kg, agreed_price_per_kg, total_amount)
       VALUES ($1, $2, $3, $4, $5, $5, $6) RETURNING *`,
      [buyerId, collection_point_id, garbage_type_id, requested_weight_kg, offered_price_per_kg, totalAmount]
    );

    // Notify CP manager
    const cpResult = await db.query('SELECT manager_id FROM collection_points WHERE id = $1', [collection_point_id]);
    if (cpResult.rows[0]?.manager_id) {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, body, data)
         VALUES ($1, 'bulk_order_placed', 'New Bulk Order!', $2, $3)`,
        [
          cpResult.rows[0].manager_id,
          `Regional buyer wants ${requested_weight_kg}kg at RS ${offered_price_per_kg}/kg`,
          JSON.stringify({ order_id: result.rows[0].id }),
        ]
      );
    }

    res.status(201).json({ order: result.rows[0] });
  } catch (err) {
    console.error('createBulkOrder error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
}

async function confirmOrder(req, res) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE bulk_orders SET status = 'confirmed', confirmed_at = NOW()
       WHERE id = $1 AND status = 'pending' RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Order not found or not pending' });
    }

    // Notify buyer
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, 'order_confirmed', 'Order Confirmed!', 'Your bulk order has been confirmed. Schedule your pickup.', $2)`,
      [result.rows[0].buyer_id, JSON.stringify({ order_id: id })]
    );

    res.json({ order: result.rows[0] });
  } catch (err) {
    console.error('confirmOrder error:', err);
    res.status(500).json({ error: 'Failed to confirm order' });
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

    // Reduce inventory
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

async function getMyOrders(req, res) {
  try {
    const buyerId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
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
      `SELECT bo.*, cp.name as collection_point_name, gt.name as garbage_type_name
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

module.exports = { getAvailableLots, createBulkOrder, confirmOrder, pickupDone, getMyOrders };
