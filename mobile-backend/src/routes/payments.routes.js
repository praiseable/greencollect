const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getPaymentHistory } = require('../controllers/payments.controller');

router.get('/history', authenticate, getPaymentHistory);

module.exports = router;
