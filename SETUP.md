# 📡 Mobile Backend — Setup Guide

## Stack: Node.js + Express + PostgreSQL + PostGIS + Redis

---

## Project Structure

```
mobile-backend/
├── src/
│   ├── config/
│   │   ├── db.js              # PostgreSQL connection
│   │   ├── redis.js           # Redis connection
│   │   └── firebase.js        # FCM setup
│   ├── middleware/
│   │   ├── auth.js            # JWT verification
│   │   ├── roleCheck.js       # Role-based access
│   │   └── upload.js          # Multer / S3 upload
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── listings.routes.js
│   │   ├── garbageTypes.routes.js
│   │   ├── collectionPoints.routes.js
│   │   ├── bulkOrders.routes.js
│   │   ├── notifications.routes.js
│   │   ├── payments.routes.js
│   │   └── users.routes.js
│   ├── controllers/           # Business logic per route
│   ├── services/
│   │   ├── notification.service.js   # FCM push logic
│   │   ├── geo.service.js            # PostGIS queries
│   │   └── payment.service.js        # Payment gateway
│   ├── jobs/
│   │   └── expandRadius.job.js       # Background job: expand search radius
│   └── app.js
├── migrations/                # SQL migration files
├── seeds/                     # Seed data (garbage types, test users)
├── .env.example
├── package.json
└── Dockerfile
```

---

## Initial Setup

```bash
# 1. Clone and install
cd mobile-backend
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your values

# 3. Start PostgreSQL with PostGIS (Docker)
docker run -d \
  --name greencollect-db \
  -e POSTGRES_DB=greencollect \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=secret \
  -p 5432:5432 \
  postgis/postgis:15-3.3

# 4. Start Redis
docker run -d --name greencollect-redis -p 6379:6379 redis:7

# 5. Run migrations
npm run migrate

# 6. Seed garbage types
npm run seed

# 7. Start server
npm run dev
```

---

## .env.example

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://admin:secret@localhost:5432/greencollect

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Firebase (FCM)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# File Storage (Cloudinary or S3)
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# SMS (for OTP)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Payment Gateway
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Geo defaults
DEFAULT_RADIUS_KM=5
RADIUS_EXPAND_MINUTES=30
MAX_RADIUS_KM=20
```

---

## package.json dependencies

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.11.0",
    "redis": "^4.6.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "firebase-admin": "^11.0.0",
    "multer": "^1.4.5",
    "cloudinary": "^1.37.0",
    "twilio": "^4.0.0",
    "razorpay": "^2.9.0",
    "express-validator": "^7.0.0",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "morgan": "^1.10.0",
    "dotenv": "^16.0.0",
    "node-cron": "^3.0.0",
    "socket.io": "^4.6.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  },
  "scripts": {
    "dev": "nodemon src/app.js",
    "start": "node src/app.js",
    "migrate": "node migrations/run.js",
    "seed": "node seeds/run.js"
  }
}
```

---

## Key Service: Notification (geo-based)

```javascript
// services/notification.service.js
const db = require('../config/db');
const admin = require('../config/firebase');

async function notifyNearbyCollectors(listing) {
  const { latitude, longitude, id: listingId, garbage_type_name, asking_price } = listing;

  // Find collectors within radius using PostGIS
  const result = await db.query(`
    SELECT u.id, u.fcm_token, u.name,
      ROUND(ST_Distance(
        a.location,
        ST_MakePoint($1, $2)::geography
      ) / 1000, 1) AS distance_km
    FROM users u
    JOIN addresses a ON a.user_id = u.id AND a.is_default = TRUE
    WHERE u.role = 'local_collector'
      AND u.is_active = TRUE
      AND u.fcm_token IS NOT NULL
      AND ST_DWithin(
        a.location,
        ST_MakePoint($1, $2)::geography,
        $3
      )
    ORDER BY distance_km ASC
    LIMIT 10
  `, [longitude, latitude, 5000]); // 5km default

  const collectors = result.rows;

  for (const collector of collectors) {
    if (!collector.fcm_token) continue;
    
    await admin.messaging().send({
      token: collector.fcm_token,
      notification: {
        title: `♻️ New Pickup Nearby (${collector.distance_km}km)`,
        body: `${garbage_type_name} — ₹${asking_price} asking price`,
      },
      data: {
        type: 'new_listing',
        listing_id: listingId,
        distance_km: String(collector.distance_km),
      },
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } }
    });
  }

  // Schedule radius expansion if no one accepts in 30 min
  scheduleRadiusExpansion(listingId, latitude, longitude, 10000, 30);
}
```

---

## Dockerfile

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "src/app.js"]
```
