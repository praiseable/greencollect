const db = require('../config/db');

async function createReview(req, res) {
  try {
    const reviewerId = req.user.id;
    const { listing_id, reviewee_id, rating, comment } = req.body;

    if (!listing_id || !reviewee_id || !rating) {
      return res.status(400).json({ error: 'listing_id, reviewee_id, and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check listing exists and is completed
    const listingResult = await db.query(
      'SELECT id FROM listings WHERE id = $1 AND status = $2',
      [listing_id, 'completed']
    );
    if (listingResult.rows.length === 0) {
      return res.status(400).json({ error: 'Listing not found or not completed' });
    }

    // Check no duplicate review
    const existing = await db.query(
      'SELECT id FROM reviews WHERE listing_id = $1 AND reviewer_id = $2',
      [listing_id, reviewerId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already reviewed' });
    }

    const result = await db.query(
      `INSERT INTO reviews (listing_id, reviewer_id, reviewee_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [listing_id, reviewerId, reviewee_id, rating, comment || null]
    );

    // Update reviewee's avg_rating and total_reviews
    await db.query(
      `UPDATE users SET
         avg_rating = (SELECT AVG(rating)::numeric(3,2) FROM reviews WHERE reviewee_id = $1),
         total_reviews = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = $1),
         updated_at = NOW()
       WHERE id = $1`,
      [reviewee_id]
    );

    res.status(201).json({ review: result.rows[0] });
  } catch (err) {
    console.error('createReview error:', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
}

async function getReviewsForUser(req, res) {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.name as reviewer_name
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    const avgResult = await db.query(
      'SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as total FROM reviews WHERE reviewee_id = $1',
      [userId]
    );

    res.json({
      reviews: result.rows,
      avg_rating: parseFloat(avgResult.rows[0].avg_rating) || 0,
      total: parseInt(avgResult.rows[0].total),
    });
  } catch (err) {
    console.error('getReviewsForUser error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
}

module.exports = { createReview, getReviewsForUser };
