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

module.exports = { createListing, getGarbageTypesForForm };
