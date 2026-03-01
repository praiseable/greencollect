const db = require('../config/db');

async function getStats(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [
      totalListings, completedListings, openListings, listingsToday,
      collectedKg, activeCollectors, revenueToday, totalRevenue,
      byType, totalUsers, totalCPs, totalInventory,
    ] = await Promise.all([
      db.query('SELECT COUNT(*) FROM listings'),
      db.query("SELECT COUNT(*) FROM listings WHERE status = 'completed'"),
      db.query("SELECT COUNT(*) FROM listings WHERE status = 'open'"),
      db.query('SELECT COUNT(*) FROM listings WHERE DATE(posted_at) = $1', [today]),
      db.query(
        `SELECT COALESCE(SUM(COALESCE(actual_weight, estimated_weight)), 0) as total
         FROM listings WHERE status = 'completed'`
      ),
      db.query(
        `SELECT COUNT(DISTINCT collector_id) FROM listings
         WHERE status IN ('assigned','in_progress','collected')`
      ),
      db.query(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM payments WHERE status = 'completed' AND DATE(created_at) = $1`,
        [today]
      ),
      db.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'`
      ),
      db.query(
        `SELECT gt.name as type, gt.icon, gt.color,
                COALESCE(SUM(COALESCE(l.actual_weight, l.estimated_weight)), 0) as weight_kg,
                COUNT(*) as count
         FROM listings l
         JOIN garbage_types gt ON gt.id = l.garbage_type_id
         WHERE l.status = 'completed'
         GROUP BY gt.name, gt.icon, gt.color
         ORDER BY weight_kg DESC`
      ),
      db.query('SELECT role, COUNT(*) as count FROM users GROUP BY role'),
      db.query('SELECT COUNT(*) FROM collection_points WHERE is_active = TRUE'),
      db.query('SELECT COALESCE(SUM(available_weight_kg), 0) as total FROM inventory'),
    ]);

    res.json({
      total_listings: parseInt(totalListings.rows[0].count),
      completed_listings: parseInt(completedListings.rows[0].count),
      open_listings: parseInt(openListings.rows[0].count),
      total_listings_today: parseInt(listingsToday.rows[0].count),
      total_collected_kg: parseFloat(collectedKg.rows[0].total),
      active_collectors: parseInt(activeCollectors.rows[0].count),
      revenue_today: parseFloat(revenueToday.rows[0].total),
      total_revenue: parseFloat(totalRevenue.rows[0].total),
      by_garbage_type: byType.rows,
      users_by_role: totalUsers.rows,
      total_collection_points: parseInt(totalCPs.rows[0].count),
      total_inventory_kg: parseFloat(totalInventory.rows[0].total),
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

async function getWeeklyStats(req, res) {
  try {
    const result = await db.query(
      `SELECT DATE(posted_at) as date,
              COUNT(*) as listings_count,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN COALESCE(actual_weight, estimated_weight) ELSE 0 END), 0) as collected_kg,
              COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN final_price ELSE 0 END), 0) as revenue
       FROM listings
       WHERE posted_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(posted_at)
       ORDER BY date`
    );

    res.json({ weekly_stats: result.rows });
  } catch (err) {
    console.error('getWeeklyStats error:', err);
    res.status(500).json({ error: 'Failed to fetch weekly stats' });
  }
}

async function getMonthlyStats(req, res) {
  try {
    const result = await db.query(
      `SELECT DATE_TRUNC('month', posted_at)::date as month,
              COUNT(*) as listings_count,
              COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN COALESCE(actual_weight, estimated_weight) ELSE 0 END), 0) as collected_kg,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN final_price ELSE 0 END), 0) as revenue
       FROM listings
       WHERE posted_at >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', posted_at)
       ORDER BY month`
    );

    res.json({ monthly_stats: result.rows });
  } catch (err) {
    console.error('getMonthlyStats error:', err);
    res.status(500).json({ error: 'Failed to fetch monthly stats' });
  }
}

async function getGarbageTypeStats(req, res) {
  try {
    const result = await db.query(
      `SELECT gt.name, gt.slug, gt.icon, gt.color,
              COUNT(l.id) as total_listings,
              COALESCE(SUM(COALESCE(l.actual_weight, l.estimated_weight)), 0) as total_weight_kg,
              COALESCE(SUM(l.final_price), 0) as total_revenue,
              COUNT(CASE WHEN l.status = 'completed' THEN 1 END) as completed_listings
       FROM garbage_types gt
       LEFT JOIN listings l ON l.garbage_type_id = gt.id
       WHERE gt.is_active = TRUE
       GROUP BY gt.id, gt.name, gt.slug, gt.icon, gt.color
       ORDER BY total_weight_kg DESC`
    );

    res.json({ garbage_type_stats: result.rows });
  } catch (err) {
    console.error('getGarbageTypeStats error:', err);
    res.status(500).json({ error: 'Failed to fetch garbage type stats' });
  }
}

async function getCityStats(req, res) {
  try {
    const result = await db.query(
      `SELECT city,
              COUNT(*) as total_listings,
              COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
              COALESCE(SUM(COALESCE(actual_weight, estimated_weight)) FILTER (WHERE status = 'completed'), 0) as collected_kg
       FROM listings
       WHERE city IS NOT NULL
       GROUP BY city
       ORDER BY total_listings DESC
       LIMIT 20`
    );
    res.json({ city_stats: result.rows });
  } catch (err) {
    console.error('getCityStats error:', err);
    res.status(500).json({ error: 'Failed to fetch city stats' });
  }
}

module.exports = { getStats, getWeeklyStats, getMonthlyStats, getGarbageTypeStats, getCityStats };
