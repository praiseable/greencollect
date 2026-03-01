const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { upload } = require('../middleware/upload');
const {
  createListing,
  getMyListings,
  getNearbyListings,
  getAssignedListings,
  getListing,
  acceptListing,
  collectListing,
  completePayment,
} = require('../controllers/listings.controller');

router.post('/', authenticate, requireRole('house_owner'), upload.array('photos', 5), createListing);
router.get('/my', authenticate, requireRole('house_owner'), getMyListings);
router.get('/nearby', authenticate, requireRole('local_collector'), getNearbyListings);
router.get('/assigned', authenticate, requireRole('local_collector'), getAssignedListings);
router.get('/:id', authenticate, getListing);
router.put('/:id/accept', authenticate, requireRole('local_collector'), acceptListing);
router.put('/:id/collect', authenticate, requireRole('local_collector'), collectListing);
router.put('/:id/complete-payment', authenticate, requireRole('local_collector'), completePayment);

module.exports = router;
