/**
 * Admin Service
 * 
 * Admin portal APIs.
 * Trusts X-User-* headers from gateway.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust headers middleware (validates X-Internal-Service-Secret and extracts X-User-*)
const { trustHeaders } = require('./middleware/trustHeaders');
app.use(trustHeaders); // All routes require trusted headers

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'admin-service' });
});

// Admin routes
app.use('/admin', require('./routes/admin.routes'));

// Start server
app.listen(PORT, () => {
  console.log(`✅ Admin Service running on port ${PORT}`);
});

module.exports = app;
