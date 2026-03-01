const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getAvailableInventory, getMyOrders, createOrder, pickupDone } = require('../controllers/regional.controller');

router.use(authenticate);

router.get('/inventory', getAvailableInventory);
router.get('/orders', getMyOrders);
router.post('/orders', createOrder);
router.put('/orders/:id/pickup', pickupDone);

module.exports = router;
