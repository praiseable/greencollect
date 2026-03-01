const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { getRedisClient } = require('../config/redis');

// In-memory OTP store for development (use Redis in production)
const otpStore = new Map();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  return { accessToken, refreshToken };
}

async function sendOtp(req, res) {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const otp = generateOtp();
    const otpId = 'otp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Store OTP with 5 min expiry
    try {
      const redis = await getRedisClient();
      await redis.setEx(`otp:${otpId}`, 300, JSON.stringify({ phone, otp }));
    } catch {
      // Fallback to in-memory
      otpStore.set(otpId, { phone, otp, expires: Date.now() + 300000 });
    }

    // In production, send OTP via Twilio/MSG91
    console.log(`[DEV] OTP for ${phone}: ${otp}`);

    res.json({ message: 'OTP sent', otp_id: otpId, ...(process.env.NODE_ENV === 'development' ? { otp } : {}) });
  } catch (err) {
    console.error('sendOtp error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
}

async function verifyOtp(req, res) {
  try {
    const { phone, otp, otp_id } = req.body;
    if (!phone || !otp || !otp_id) {
      return res.status(400).json({ error: 'Phone, OTP, and OTP ID are required' });
    }

    // Verify OTP
    let storedData = null;
    try {
      const redis = await getRedisClient();
      const data = await redis.get(`otp:${otp_id}`);
      if (data) storedData = JSON.parse(data);
    } catch {
      const entry = otpStore.get(otp_id);
      if (entry && entry.expires > Date.now()) storedData = entry;
    }

    if (!storedData || storedData.phone !== phone || storedData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Clean up OTP
    try {
      const redis = await getRedisClient();
      await redis.del(`otp:${otp_id}`);
    } catch {
      otpStore.delete(otp_id);
    }

    // Find or create user
    let result = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    let user = result.rows[0];
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const insertResult = await db.query(
        'INSERT INTO users (phone) VALUES ($1) RETURNING *',
        [phone]
      );
      user = insertResult.rows[0];
    }

    const tokens = generateTokens(user.id);

    res.json({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        profile_photo: user.profile_photo,
      },
      is_new_user: isNewUser,
    });
  } catch (err) {
    console.error('verifyOtp error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
}

async function refreshToken(req, res) {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const result = await db.query('SELECT id FROM users WHERE id = $1 AND is_active = TRUE', [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    const accessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    res.json({ access_token: accessToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}

async function registerDetails(req, res) {
  try {
    const { name, role, fcm_token, email } = req.body;
    const userId = req.user.id;

    const validRoles = ['house_owner', 'local_collector', 'regional_collector'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (name) { fields.push(`name = $${idx++}`); values.push(name); }
    if (role) { fields.push(`role = $${idx++}`); values.push(role); }
    if (fcm_token) { fields.push(`fcm_token = $${idx++}`); values.push(fcm_token); }
    if (email) { fields.push(`email = $${idx++}`); values.push(email); }
    fields.push(`updated_at = NOW()`);

    if (fields.length === 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);
    const result = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, phone, email, role, is_verified, profile_photo, fcm_token`,
      values
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('registerDetails error:', err);
    res.status(500).json({ error: 'Failed to update details' });
  }
}

module.exports = { sendOtp, verifyOtp, refreshToken, registerDetails };
