require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Socket.io for real-time
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "ws:", "wss:", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
const fs = require('fs');
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ── API Routes ─────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/categories', require('./routes/categories.routes'));
app.use('/api/product-types', require('./routes/productTypes.routes'));
app.use('/api/listings', require('./routes/listings.routes'));
app.use('/api/currencies', require('./routes/currencies.routes'));
app.use('/api/languages', require('./routes/languages.routes'));
app.use('/api/countries', require('./routes/countries.routes'));
app.use('/api/geo-zones', require('./routes/geoZones.routes'));
app.use('/api/units', require('./routes/units.routes'));
app.use('/api/translations', require('./routes/translations.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/subscriptions', require('./routes/subscriptions.routes'));
app.use('/api/payments', require('./routes/payments.routes'));
app.use('/api/transactions', require('./routes/transactions.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/territories', require('./routes/territories.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/admin/dealers', require('./routes/dealers.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/collections', require('./routes/collections.routes'));
app.use('/api/kyc', require('./routes/kyc.routes'));

// ── Mobile-specific routes (v1 prefix for backward compat) ──
app.use('/v1/auth', require('./routes/auth.routes'));
app.use('/v1/listings', require('./routes/listings.routes'));
app.use('/v1/categories', require('./routes/categories.routes'));
app.use('/v1/units', require('./routes/units.routes'));
app.use('/v1/geo-zones', require('./routes/geoZones.routes'));
app.use('/v1/notifications', require('./routes/notifications.routes'));
app.use('/v1/territories', require('./routes/territories.routes'));
app.use('/v1/collections', require('./routes/collections.routes'));
app.use('/v1/kyc', require('./routes/kyc.routes'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'geo-franchise-marketplace-api',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    country: 'PK',
    currency: 'PKR',
  });
});

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-room', (userId) => {
    socket.join(`user-${userId}`);
  });

  socket.on('join-chat', ({ userId, otherUserId }) => {
    const room = [userId, otherUserId].sort().join('-');
    socket.join(`chat-${room}`);
  });

  socket.on('send-message', async (data) => {
    const room = [data.fromUserId, data.toUserId].sort().join('-');
    io.to(`chat-${room}`).emit('new-message', data);
    io.to(`user-${data.toUserId}`).emit('notification', {
      type: 'CHAT_MESSAGE',
      title: 'New message',
      body: data.message,
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.set('io', io);

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
    },
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found', code: 'NOT_FOUND' } });
});

// ── Escalation Cron Jobs ──────────────────────────────────
const { runEscalation, runCollectionEscalation } = require('./services/escalation.service');

function startEscalationCron() {
  const LISTING_INTERVAL = 60 * 60 * 1000;     // 1 hour — listing visibility
  const COLLECTION_INTERVAL = 15 * 60 * 1000;  // 15 min — collection deadline checks

  console.log(`⏰ Listing escalation cron: every ${LISTING_INTERVAL / 60000} min`);
  console.log(`⏰ Collection escalation cron: every ${COLLECTION_INTERVAL / 60000} min`);
  
  // Run once on startup (after 30s delay to let DB settle)
  setTimeout(() => {
    runEscalation(io);
    runCollectionEscalation(io);
  }, 30000);
  
  // Recurring
  setInterval(() => runEscalation(io), LISTING_INTERVAL);
  setInterval(() => runCollectionEscalation(io), COLLECTION_INTERVAL);
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Geo-Franchise Marketplace API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Country: Pakistan (PKR, +92)`);
  
  // Start the escalation engine
  startEscalationCron();
});

module.exports = { app, server, io };
