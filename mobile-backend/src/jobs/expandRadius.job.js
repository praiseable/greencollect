const cron = require('node-cron');
const db = require('../config/db');
const { notifyNearbyCollectors } = require('../services/notification.service');

// Check for unaccepted listings every 10 minutes and expand radius
function startExpandRadiusJob() {
  cron.schedule('*/10 * * * *', async () => {
    try {
      const expandMinutes = parseInt(process.env.RADIUS_EXPAND_MINUTES) || 30;
      const maxRadiusKm = parseInt(process.env.MAX_RADIUS_KM) || 20;

      // Find open listings older than expandMinutes and not yet expired
      const result = await db.query(
        `SELECT l.id, l.asking_price, l.latitude, l.longitude,
                l.current_radius_km, l.notify_count,
                gt.name as garbage_type_name,
                EXTRACT(EPOCH FROM (NOW() - l.posted_at)) / 60 as minutes_old
         FROM listings l
         LEFT JOIN garbage_types gt ON gt.id = l.garbage_type_id
         WHERE l.status = 'open'
           AND l.posted_at < NOW() - INTERVAL '${expandMinutes} minutes'
           AND l.collector_id IS NULL
           AND (l.expires_at IS NULL OR l.expires_at > NOW())
         ORDER BY l.posted_at ASC
         LIMIT 20`
      );

      for (const listing of result.rows) {
        const currentRadius = listing.current_radius_km || 5;
        let newRadius = currentRadius;

        const minutesOld = parseFloat(listing.minutes_old);
        if (minutesOld > 120) newRadius = maxRadiusKm;
        else if (minutesOld > 60) newRadius = Math.min(15, maxRadiusKm);
        else if (minutesOld > 30) newRadius = Math.min(10, maxRadiusKm);

        if (newRadius > currentRadius) {
          console.log(`Expanding radius from ${currentRadius}km to ${newRadius}km for listing ${listing.id}`);

          // Update listing's current_radius_km and notify_count
          await db.query(
            'UPDATE listings SET current_radius_km = $1, notify_count = notify_count + 1 WHERE id = $2',
            [newRadius, listing.id]
          );

          // Re-notify with expanded radius
          await notifyNearbyCollectors({
            id: listing.id,
            latitude: parseFloat(listing.latitude),
            longitude: parseFloat(listing.longitude),
            garbage_type_name: listing.garbage_type_name,
            asking_price: listing.asking_price || 0,
            radius: newRadius * 1000,
          });
        }
      }

      // Expire old listings
      const expireResult = await db.query(
        `UPDATE listings SET status = 'expired' WHERE status = 'open' AND expires_at < NOW() RETURNING id`
      );
      if (expireResult.rowCount > 0) {
        console.log(`Expired ${expireResult.rowCount} listing(s)`);
      }
    } catch (err) {
      console.error('expandRadius job error:', err);
    }
  });

  console.log('Expand radius job started (runs every 10 minutes)');
}

module.exports = { startExpandRadiusJob };
