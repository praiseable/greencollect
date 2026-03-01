const db = require('../config/db');

async function getProfile(req, res) {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT id, name, phone, email, role, is_verified, is_active, profile_photo,
              avg_rating, total_reviews, wallet_balance, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get addresses
    const addresses = await db.query(
      `SELECT id, label, full_address, city, state, pincode, latitude, longitude, is_default
       FROM addresses WHERE user_id = $1 ORDER BY is_default DESC`,
      [userId]
    );

    // Get stats
    const statsResult = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'completed') as completed_listings,
         COUNT(*) FILTER (WHERE status = 'open') as open_listings,
         COALESCE(SUM(final_price) FILTER (WHERE status = 'completed'), 0) as total_earned
       FROM listings WHERE owner_id = $1 OR collector_id = $1`,
      [userId]
    );

    res.json({
      user: result.rows[0],
      addresses: addresses.rows,
      stats: statsResult.rows[0],
    });
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { name, email, fcm_token } = req.body;
    const profilePhoto = req.file ? `/uploads/${req.file.filename}` : undefined;

    const fields = [];
    const values = [];
    let idx = 1;

    if (name) { fields.push(`name = $${idx++}`); values.push(name); }
    if (email) { fields.push(`email = $${idx++}`); values.push(email); }
    if (fcm_token) { fields.push(`fcm_token = $${idx++}`); values.push(fcm_token); }
    if (profilePhoto) { fields.push(`profile_photo = $${idx++}`); values.push(profilePhoto); }
    fields.push('updated_at = NOW()');

    if (values.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);
    const result = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, name, phone, email, role, is_verified, profile_photo, avg_rating, wallet_balance`,
      values
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

async function addAddress(req, res) {
  try {
    const userId = req.user.id;
    const { label, full_address, city, state, pincode, latitude, longitude, is_default } = req.body;

    if (!full_address || !latitude || !longitude) {
      return res.status(400).json({ error: 'full_address, latitude, and longitude are required' });
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await db.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [userId]);
    }

    const result = await db.query(
      `INSERT INTO addresses (user_id, label, full_address, city, state, pincode, latitude, longitude, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [userId, label || 'Home', full_address, city || null, state || null, pincode || null,
        parseFloat(latitude), parseFloat(longitude), is_default || false]
    );

    res.status(201).json({ address: result.rows[0] });
  } catch (err) {
    console.error('addAddress error:', err);
    res.status(500).json({ error: 'Failed to add address' });
  }
}

async function deleteAddress(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json({ message: 'Address deleted' });
  } catch (err) {
    console.error('deleteAddress error:', err);
    res.status(500).json({ error: 'Failed to delete address' });
  }
}

module.exports = { getProfile, updateProfile, addAddress, deleteAddress };
