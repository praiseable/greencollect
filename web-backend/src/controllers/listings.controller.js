const db = require('../config/db');

async function createListing(req, res) {
  try {
    const userId = req.user.id;
    const {
      garbage_type_id, latitude, longitude,
      full_address, city, estimated_weight,
      asking_price, description,
    } = req.body;

    if (!garbage_type_id || !latitude || !longitude) {
      return res.status(400).json({ error: 'Garbage type, latitude and longitude are required' });
    }

    // Build photo URL array from uploaded files
    const photoUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        photoUrls.push('/api/uploads/' + file.filename);
      }
    }

    const result = await db.query(
      `INSERT INTO listings
        (owner_id, garbage_type_id, latitude, longitude, full_address, city,
         estimated_weight, asking_price, description, photo_urls, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'open')
       RETURNING *`,
      [
        userId,
        garbage_type_id,
        parseFloat(latitude),
        parseFloat(longitude),
        full_address || '',
        city || '',
        estimated_weight ? parseFloat(estimated_weight) : null,
        asking_price ? parseFloat(asking_price) : null,
        description || '',
        photoUrls,
      ]
    );

    // Create admin/manager notification for the web portal
    try {
      const listing = result.rows[0];
      const adminUsers = await db.query(
        "SELECT id FROM users WHERE role IN ('admin', 'collection_manager') AND is_active = true"
      );
      for (const admin of adminUsers.rows) {
        await db.query(
          `INSERT INTO notifications (user_id, type, title, body, data)
           VALUES ($1, 'new_listing', '📸 New Listing Posted!',
                   $2, $3)`,
          [
            admin.id,
            `${weight ? weight + ' kg' : ''} ${description || 'Garbage'} at ${full_address || city || 'Unknown location'}`.trim(),
            JSON.stringify({ listing_id: listing.id }),
          ]
        );
      }
    } catch (adminNotifErr) {
      console.error('Admin notification error (non-fatal):', adminNotifErr.message);
    }

    // Notify nearby collectors (best-effort, don't fail the request)
    try {
      const listing = result.rows[0];
      const collectors = await db.query(
        `SELECT DISTINCT u.id, u.fcm_token, u.name
         FROM users u
         JOIN addresses a ON a.user_id = u.id
         WHERE u.role = 'local_collector'
           AND u.is_active = true
           AND u.fcm_token IS NOT NULL
           AND ST_DWithin(
             a.location,
             ST_MakePoint($1, $2)::geography,
             $3
           )`,
        [parseFloat(longitude), parseFloat(latitude), 5000]
      );

      if (collectors.rows.length > 0) {
        // Insert in-app notifications for nearby collectors
        for (const c of collectors.rows) {
          await db.query(
            `INSERT INTO notifications (user_id, type, title, body, data)
             VALUES ($1, 'new_listing', 'New Garbage Listing Nearby!',
                     $2, $3)`,
            [
              c.id,
              `${listing.estimated_weight || '?'} kg of waste available at ${full_address || 'nearby location'}`,
              JSON.stringify({ listing_id: listing.id }),
            ]
          );
        }
      }
    } catch (notifErr) {
      console.error('Notification error (non-fatal):', notifErr.message);
    }

    res.status(201).json({ listing: result.rows[0], message: 'Listing posted! Nearby collectors notified.' });
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
}

async function getGarbageTypesForForm(req, res) {
  try {
    const result = await db.query(
      'SELECT id, name, slug, base_price_per_kg, color FROM garbage_types WHERE is_active = true ORDER BY sort_order'
    );
    res.json({ garbageTypes: result.rows });
  } catch (err) {
    console.error('Get garbage types error:', err);
    res.status(500).json({ error: 'Failed to fetch garbage types' });
  }
}

async function getListingDetail(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT l.*, 
              gt.name as garbage_type, gt.slug as garbage_type_slug, gt.icon as garbage_type_icon, gt.color as garbage_type_color,
              gt.base_price_per_kg,
              owner.name as owner_name, owner.phone as owner_phone, owner.email as owner_email, owner.role as owner_role,
              collector.name as collector_name, collector.phone as collector_phone,
              cp.name as collection_point_name, cp.address as collection_point_address
       FROM listings l
       LEFT JOIN garbage_types gt ON gt.id = l.garbage_type_id
       LEFT JOIN users owner ON owner.id = l.owner_id
       LEFT JOIN users collector ON collector.id = l.collector_id
       LEFT JOIN collection_points cp ON cp.id = l.collection_point_id
       WHERE l.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json({ listing: result.rows[0] });
  } catch (err) {
    console.error('getListingDetail error:', err);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
}

async function getNotifications(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // For admin/manager: show all new_listing notifications + system notifications
    const result = await db.query(
      `SELECT n.id, n.type, n.title, n.body, n.data, n.is_read, n.sent_at,
              u.name as user_name
       FROM notifications n
       LEFT JOIN users u ON u.id = n.user_id
       WHERE n.type IN ('new_listing', 'system', 'bulk_order')
       ORDER BY n.sent_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM notifications WHERE type IN ('new_listing', 'system', 'bulk_order') AND is_read = false`
    );

    res.json({
      notifications: result.rows,
      unread_count: parseInt(countResult.rows[0].count),
    });
  } catch (err) {
    console.error('getNotifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    await db.query('UPDATE notifications SET is_read = true WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('markNotificationRead error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}

async function markAllNotificationsRead(req, res) {
  try {
    await db.query(
      `UPDATE notifications SET is_read = true WHERE type IN ('new_listing', 'system', 'bulk_order') AND is_read = false`
    );
    res.json({ success: true });
  } catch (err) {
    console.error('markAllNotificationsRead error:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
}

module.exports = {
  createListing, getGarbageTypesForForm, getListingDetail,
  getNotifications, markNotificationRead, markAllNotificationsRead,
};
