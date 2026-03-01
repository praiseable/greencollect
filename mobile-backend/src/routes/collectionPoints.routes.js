const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const {
  getNearbyCollectionPoints,
  getCollectionPointInventory,
  createCollectionPoint,
} = require('../controllers/collectionPoints.controller');

router.get('/nearby', authenticate, getNearbyCollectionPoints);
router.get('/:id/inventory', authenticate, getCollectionPointInventory);
router.post('/', authenticate, requireRole('local_collector', 'admin'), createCollectionPoint);

module.exports = router;
