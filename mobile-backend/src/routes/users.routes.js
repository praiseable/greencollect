const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { getProfile, updateProfile, addAddress, deleteAddress } = require('../controllers/users.controller');
const { getReviewsForUser } = require('../controllers/reviews.controller');

router.get('/me', authenticate, getProfile);
router.put('/me', authenticate, upload.single('profile_photo'), updateProfile);
router.post('/me/addresses', authenticate, addAddress);
router.delete('/me/addresses/:id', authenticate, deleteAddress);
router.get('/:userId/reviews', authenticate, getReviewsForUser);

module.exports = router;
