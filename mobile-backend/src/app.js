require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { initFirebase } = require('./config/firebase');
const { startExpandRadiusJob } = require('./jobs/expandRadius.job');

const app = express();
const server = http.createServer(app);

// Socket.io for real-time
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Initialize Firebase
initFirebase();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads folder
const fs = require('fs');
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/v1/auth', require('./routes/auth.routes'));
app.use('/v1/listings', require('./routes/listings.routes'));
app.use('/v1/garbage-types', require('./routes/garbageTypes.routes'));
app.use('/v1/collection-points', require('./routes/collectionPoints.routes'));
app.use('/v1/bulk-orders', require('./routes/bulkOrders.routes'));
app.use('/v1/notifications', require('./routes/notifications.routes'));
app.use('/v1/payments', require('./routes/payments.routes'));
app.use('/v1/users', require('./routes/users.routes'));
app.use('/v1/reviews', require('./routes/reviews.routes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mobile-backend', timestamp: new Date().toISOString() });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Mobile Backend API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);

  // Start background jobs
  startExpandRadiusJob();
});

module.exports = { app, server, io };
