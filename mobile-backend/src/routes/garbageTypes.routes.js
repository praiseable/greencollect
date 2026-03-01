const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { getGarbageTypes, createGarbageType } = require('../controllers/garbageTypes.controller');

router.get('/', authenticate, getGarbageTypes);
router.post('/', authenticate, requireRole('admin'), createGarbageType);

module.exports = router;
