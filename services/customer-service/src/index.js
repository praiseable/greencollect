/**
 * Customer Service
 * 
 * Customer portal APIs.
 * Trusts X-User-* headers from gateway.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust headers middleware (for authenticated routes)
const { trustHeaders } = require('./middleware/trustHeaders');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'customer-service' });
});

// Public routes (categories, listings, etc.) - optional auth
app.use('/categories', require('./routes/categories.routes'));
app.use('/listings', require('./routes/listings.routes'));

// Customer routes - require customer portal
app.use('/customer', trustHeaders, (req, res, next) => {
  if (req.user?.portal !== 'customer') {
    return res.status(403).json({
      error: { message: 'Access denied: Customer portal required', code: 'PORTAL_FORBIDDEN' }
    });
  }
  next();
}, require('./routes/customer.routes'));

// Start server
app.listen(PORT, () => {
  console.log(`✅ Customer Service running on port ${PORT}`);
});

module.exports = app;
