const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createReview, getReviewsForUser } = require('../controllers/reviews.controller');

router.post('/', authenticate, createReview);
router.get('/user/:userId', authenticate, getReviewsForUser);

module.exports = router;
