const db = require('../config/db');

async function getPaymentHistory(req, res) {
  try {
    const userId = req.user.id;
    const { role = 'payee', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const column = role === 'payer' ? 'payer_id' : 'payee_id';

    const result = await db.query(
      `SELECT p.id, p.amount, p.method, p.status, p.reference_id, p.created_at,
              l.id as listing_id, gt.name as garbage_type,
              payer.name as payer_name, payee.name as payee_name
       FROM payments p
       JOIN listings l ON l.id = p.listing_id
       LEFT JOIN garbage_types gt ON gt.id = l.garbage_type_id
       JOIN users payer ON payer.id = p.payer_id
       JOIN users payee ON payee.id = p.payee_id
       WHERE p.${column} = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    // Get totals
    const totalResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total_amount, COUNT(*) as total_count
       FROM payments WHERE ${column} = $1 AND status = 'completed'`,
      [userId]
    );

    res.json({
      payments: result.rows,
      total_amount: parseFloat(totalResult.rows[0].total_amount),
      total_count: parseInt(totalResult.rows[0].total_count),
    });
  } catch (err) {
    console.error('getPaymentHistory error:', err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
}

module.exports = { getPaymentHistory };
