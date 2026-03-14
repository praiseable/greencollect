/**
 * Auth Service
 * 
 * Dedicated authentication and authorization service.
 * Handles all auth-related endpoints.
 */

require('dotenv').config();

// Validate config FIRST (skill requirement)
const { validateConfig } = require('./config/validate');
validateConfig();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

// Auth routes
app.use('/auth', require('./routes/auth.routes'));

// Start server
app.listen(PORT, () => {
  console.log(`✅ Auth Service running on port ${PORT}`);
});

module.exports = app;
