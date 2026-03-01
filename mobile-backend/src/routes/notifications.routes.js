const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getNotifications, markRead } = require('../controllers/notifications.controller');

router.get('/', authenticate, getNotifications);
router.put('/mark-read', authenticate, markRead);

module.exports = router;
