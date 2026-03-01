const db = require('../config/db');
const { admin } = require('../config/firebase');

async function notifyNearbyCollectors(listing) {
  const { latitude, longitude, id: listingId, garbage_type_name, asking_price, radius } = listing;
  const searchRadius = radius || 5000; // default 5km

  const result = await db.query(`
    SELECT u.id, u.fcm_token, u.name,
      ROUND((ST_Distance(
        a.location,
        ST_MakePoint($1, $2)::geography
      ) / 1000)::numeric, 1) AS distance_km
    FROM users u
    JOIN addresses a ON a.user_id = u.id AND a.is_default = TRUE
    WHERE u.role = 'local_collector'
      AND u.is_active = TRUE
      AND u.fcm_token IS NOT NULL
      AND ST_DWithin(
        a.location,
        ST_MakePoint($1, $2)::geography,
        $3
      )
    ORDER BY distance_km ASC
    LIMIT 20
  `, [longitude, latitude, searchRadius]);

  const collectors = result.rows;
  console.log(`Found ${collectors.length} nearby collectors for listing ${listingId}`);

  for (const collector of collectors) {
    // Save notification to DB
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, 'new_listing', $2, $3, $4)`,
      [
        collector.id,
        `New Pickup Nearby (${collector.distance_km}km)`,
        `${garbage_type_name} — RS ${asking_price} asking price`,
        JSON.stringify({ listing_id: listingId, distance_km: collector.distance_km }),
      ]
    );

    // Send FCM push if available
    if (collector.fcm_token && admin.apps && admin.apps.length > 0) {
      try {
        await admin.messaging().send({
          token: collector.fcm_token,
          notification: {
            title: `♻️ New Pickup Nearby (${collector.distance_km}km)`,
            body: `${garbage_type_name} — RS ${asking_price} asking price`,
          },
          data: {
            type: 'new_listing',
            listing_id: listingId,
            distance_km: String(collector.distance_km),
          },
          android: { priority: 'high' },
          apns: { payload: { aps: { sound: 'default' } } },
        });
      } catch (err) {
        console.error(`FCM send error for collector ${collector.id}:`, err.message);
      }
    }
  }

  return collectors.length;
}

async function sendPushNotification(fcmToken, title, body, data) {
  if (!fcmToken || !admin.apps || admin.apps.length === 0) return;

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: data || {},
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });
  } catch (err) {
    console.error('Push notification error:', err.message);
  }
}

module.exports = { notifyNearbyCollectors, sendPushNotification };
