const db = require('../config/db');

async function getUsers(req, res) {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (role) {
      whereClause += ` AND u.role = $${idx++}`;
      params.push(role);
    }
    if (search) {
      whereClause += ` AND (u.name ILIKE $${idx} OR u.phone ILIKE $${idx} OR u.email ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    const countResult = await db.query(`SELECT COUNT(*) FROM users u ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), parseInt(offset));
    const result = await db.query(
      `SELECT u.id, u.name, u.phone, u.email, u.role, u.is_verified, u.is_active,
              u.profile_photo, u.avg_rating, u.total_reviews, u.wallet_balance, u.created_at
       FROM users u ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({ users: result.rows, total, page: parseInt(page) });
  } catch (err) {
    console.error('getUsers error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

async function verifyUser(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(
      'UPDATE users SET is_verified = TRUE, updated_at = NOW() WHERE id = $1 RETURNING id, name, phone, role, is_verified',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0], message: 'User verified successfully' });
  } catch (err) {
    console.error('verifyUser error:', err);
    res.status(500).json({ error: 'Failed to verify user' });
  }
}

async function banUser(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(
      'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id, name, phone, role, is_active',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0], message: 'User banned successfully' });
  } catch (err) {
    console.error('banUser error:', err);
    res.status(500).json({ error: 'Failed to ban user' });
  }
}

async function unbanUser(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(
      'UPDATE users SET is_active = TRUE, updated_at = NOW() WHERE id = $1 RETURNING id, name, phone, role, is_active',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0], message: 'User unbanned successfully' });
  } catch (err) {
    console.error('unbanUser error:', err);
    res.status(500).json({ error: 'Failed to unban user' });
  }
}

async function getListings(req, res) {
  try {
    const { status, city, garbage_type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (status) {
      whereClause += ` AND l.status = $${idx++}`;
      params.push(status);
    }
    if (city) {
      whereClause += ` AND l.city ILIKE $${idx++}`;
      params.push(`%${city}%`);
    }
    if (garbage_type) {
      whereClause += ` AND gt.slug = $${idx++}`;
      params.push(garbage_type);
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM listings l LEFT JOIN garbage_types gt ON gt.id = l.garbage_type_id ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), parseInt(offset));
    const result = await db.query(
      `SELECT l.id, l.listing_number, l.status, l.asking_price, l.final_price,
              l.estimated_weight, l.actual_weight,
              l.description, l.photo_urls, l.posted_at, l.assigned_at, l.collected_at, l.completed_at,
              l.latitude, l.longitude, l.full_address, l.city,
              gt.name as garbage_type, gt.slug as garbage_type_slug, gt.icon as garbage_type_icon,
              owner.name as owner_name, owner.phone as owner_phone,
              collector.name as collector_name, collector.phone as collector_phone,
              cp.name as collection_point_name
       FROM listings l
       LEFT JOIN garbage_types gt ON gt.id = l.garbage_type_id
       LEFT JOIN users owner ON owner.id = l.owner_id
       LEFT JOIN users collector ON collector.id = l.collector_id
       LEFT JOIN collection_points cp ON cp.id = l.collection_point_id
       ${whereClause}
       ORDER BY l.posted_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({ listings: result.rows, total, page: parseInt(page) });
  } catch (err) {
    console.error('getListings error:', err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
}

async function getCollectionPoints(req, res) {
  try {
    const result = await db.query(
      `SELECT cp.id, cp.name, cp.address, cp.city, cp.state, cp.is_active,
              cp.latitude, cp.longitude, cp.phone as cp_phone, cp.capacity_kg,
              cp.operating_hours,
              u.name as manager_name, u.phone as manager_phone
       FROM collection_points cp
       LEFT JOIN users u ON u.id = cp.manager_id
       ORDER BY cp.name`
    );

    res.json({ collection_points: result.rows });
  } catch (err) {
    console.error('getCollectionPoints error:', err);
    res.status(500).json({ error: 'Failed to fetch collection points' });
  }
}

async function getGarbageTypes(req, res) {
  try {
    const result = await db.query(
      `SELECT id, name, slug, description, icon, image_url, base_price_per_kg,
              min_price_per_kg, max_price_per_kg, color, is_active, is_recyclable
       FROM garbage_types ORDER BY sort_order, name`
    );
    res.json({ types: result.rows });
  } catch (err) {
    console.error('getGarbageTypes error:', err);
    res.status(500).json({ error: 'Failed to fetch garbage types' });
  }
}

async function updateGarbageType(req, res) {
  try {
    const { id } = req.params;
    const { name, base_price_per_kg, min_price_per_kg, max_price_per_kg, is_active } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
    if (base_price_per_kg !== undefined) { fields.push(`base_price_per_kg = $${idx++}`); values.push(base_price_per_kg); }
    if (min_price_per_kg !== undefined) { fields.push(`min_price_per_kg = $${idx++}`); values.push(min_price_per_kg); }
    if (max_price_per_kg !== undefined) { fields.push(`max_price_per_kg = $${idx++}`); values.push(max_price_per_kg); }
    if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }
    fields.push('updated_at = NOW()');

    if (values.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(id);
    const result = await db.query(
      `UPDATE garbage_types SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Garbage type not found' });

    res.json({ type: result.rows[0] });
  } catch (err) {
    console.error('updateGarbageType error:', err);
    res.status(500).json({ error: 'Failed to update garbage type' });
  }
}

async function getDisputes(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (status) {
      whereClause += ` AND d.status = $${idx++}`;
      params.push(status);
    }

    params.push(parseInt(limit), parseInt(offset));
    const result = await db.query(
      `SELECT d.*, r.name as raised_by_name, a.name as against_name,
              l.listing_number, l.status as listing_status
       FROM disputes d
       LEFT JOIN users r ON r.id = d.raised_by
       LEFT JOIN users a ON a.id = d.against
       LEFT JOIN listings l ON l.id = d.listing_id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({ disputes: result.rows });
  } catch (err) {
    console.error('getDisputes error:', err);
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
}

async function resolveDispute(req, res) {
  try {
    const { id } = req.params;
    const { resolution } = req.body;
    const adminId = req.user.id;

    const result = await db.query(
      `UPDATE disputes SET status = 'resolved', resolution = $1, resolved_by = $2, resolved_at = NOW()
       WHERE id = $3 AND status = 'open' RETURNING *`,
      [resolution, adminId, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Dispute not found or already resolved' });

    res.json({ dispute: result.rows[0] });
  } catch (err) {
    console.error('resolveDispute error:', err);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
}

module.exports = {
  getUsers, verifyUser, banUser, unbanUser,
  getListings, getCollectionPoints,
  getGarbageTypes, updateGarbageType,
  getDisputes, resolveDispute,
};
