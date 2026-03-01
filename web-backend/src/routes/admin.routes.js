const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const {
  getUsers, verifyUser, banUser, unbanUser,
  getListings, getCollectionPoints,
  getGarbageTypes, updateGarbageType,
  getDisputes, resolveDispute,
} = require('../controllers/admin.controller');
const { getStats, getWeeklyStats, getMonthlyStats, getGarbageTypeStats, getCityStats } = require('../controllers/analytics.controller');

// All admin routes require authentication + admin role
router.use(authenticate, adminOnly);

// Stats & Analytics
router.get('/stats', getStats);
router.get('/stats/weekly', getWeeklyStats);
router.get('/stats/monthly', getMonthlyStats);
router.get('/stats/garbage-types', getGarbageTypeStats);
router.get('/stats/cities', getCityStats);

// User management
router.get('/users', getUsers);
router.put('/users/:id/verify', verifyUser);
router.put('/users/:id/ban', banUser);
router.put('/users/:id/unban', unbanUser);

// Listings
router.get('/listings', getListings);

// Collection Points
router.get('/collection-points', getCollectionPoints);

// Garbage Types
router.get('/garbage-types', getGarbageTypes);
router.put('/garbage-types/:id', updateGarbageType);

// Disputes
router.get('/disputes', getDisputes);
router.put('/disputes/:id/resolve', resolveDispute);

module.exports = router;
