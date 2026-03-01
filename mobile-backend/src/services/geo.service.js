const db = require('../config/db');

async function findNearbyUsers(latitude, longitude, radiusKm, role) {
  const radiusMeters = radiusKm * 1000;

  const result = await db.query(
    `SELECT u.id, u.name, u.fcm_token,
            ST_Y(a.location::geometry) as latitude,
            ST_X(a.location::geometry) as longitude,
            ROUND((ST_Distance(a.location, ST_MakePoint($1, $2)::geography) / 1000)::numeric, 2) as distance_km
     FROM users u
     JOIN addresses a ON a.user_id = u.id AND a.is_default = TRUE
     WHERE u.role = $3
       AND u.is_active = TRUE
       AND ST_DWithin(a.location, ST_MakePoint($1, $2)::geography, $4)
     ORDER BY distance_km ASC`,
    [parseFloat(longitude), parseFloat(latitude), role, radiusMeters]
  );

  return result.rows;
}

async function reverseGeocode(latitude, longitude) {
  // In production, use Google Maps Geocoding API
  return {
    latitude,
    longitude,
    formatted_address: `${latitude}, ${longitude}`,
  };
}

module.exports = { findNearbyUsers, reverseGeocode };
