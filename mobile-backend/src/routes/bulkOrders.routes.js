const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const {
  getAvailableLots,
  createBulkOrder,
  confirmOrder,
  pickupDone,
  getMyOrders,
} = require('../controllers/bulkOrders.controller');

router.get('/available', authenticate, getAvailableLots);
router.get('/my', authenticate, requireRole('regional_collector'), getMyOrders);
router.post('/', authenticate, requireRole('regional_collector'), createBulkOrder);
router.put('/:id/confirm', authenticate, requireRole('admin', 'collection_manager'), confirmOrder);
router.put('/:id/pickup-done', authenticate, requireRole('regional_collector'), pickupDone);

module.exports = router;
