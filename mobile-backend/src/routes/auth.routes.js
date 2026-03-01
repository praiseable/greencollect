const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, refreshToken, registerDetails } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/refresh', refreshToken);
router.put('/register-details', authenticate, registerDetails);

module.exports = router;
