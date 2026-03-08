/**
 * Collection Routes — CRUD + workflow for garbage collection tracking
 * 
 * Endpoints:
 *   GET    /api/collections          — List collections (filtered by dealer/status)
 *   GET    /api/collections/:id      — Get single collection detail
 *   POST   /api/collections          — Create collection (assign dealer to listing)
 *   PATCH  /api/collections/:id/status — Update collection status (workflow steps)
 *   POST   /api/collections/:id/verify-gps — GPS location verification
 *   POST   /api/collections/:id/photos  — Upload proof photos
 *   PATCH  /api/collections/:id/weight  — Confirm collected weight
 *   POST   /api/collections/:id/rate    — Rate the collection (by seller or collector)
 *   GET    /api/collections/dealer/:dealerId/rating — Get dealer performance rating
 *   GET    /api/collections/analytics/carbon — Carbon credit analytics
 */

const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { body, param, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// ── GPS verification: check if dealer is within acceptable distance ──
function isWithinRange(lat1, lng1, lat2, lng2, maxMeters = 500) {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return { withinRange: distance <= maxMeters, distanceMeters: Math.round(distance) };
}

// ── Carbon offset calculation ──
const CARBON_FACTORS = {
  'Metals': 4.0,
  'Plastics': 1.5,
  'Paper & Cardboard': 1.1,
  'Electronics': 2.5,
  'Organic': 0.5,
  'Furniture': 0.8,
  'Household': 0.6,
  'Glass': 0.3,
};

function calculateCarbonOffset(categoryName, weightKg) {
  const factor = CARBON_FACTORS[categoryName] || 1.0;
  return weightKg * factor;
}

// ═══════════════════════════════════════════════════════════
// GET /api/collections — List collections with filters
// ═══════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { dealerId, status, listingId, page = 1, limit = 20 } = req.query;
    const where = {};

    if (dealerId) where.collectorId = dealerId;
    if (status) where.status = status;
    if (listingId) where.listingId = listingId;

    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        include: {
          listing: {
            select: { id: true, title: true, cityName: true, visibilityLevel: true },
          },
          collector: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.collection.count({ where }),
    ]);

    res.json({ data: collections, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Error fetching collections:', err);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /api/collections/:id — Get collection detail
// ═══════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const collection = await prisma.collection.findUnique({
      where: { id: req.params.id },
      include: {
        listing: {
          include: {
            category: true,
            geoZone: true,
          },
        },
        collector: {
          select: {
            id: true, firstName: true, lastName: true,
            phone: true, email: true,
          },
        },
        carbonCredit: true,
        dealerRatings: true,
      },
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    res.json(collection);
  } catch (err) {
    console.error('Error fetching collection:', err);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/collections — Create/assign collection
// ═══════════════════════════════════════════════════════════
router.post(
  '/',
  [
    body('listingId').isUUID(),
    body('collectorId').isUUID(),
    body('collectionDate').isISO8601(),
    body('collectedQuantity').isDecimal(),
  ],
  validate,
  async (req, res) => {
    try {
      const { listingId, collectorId, collectionDate, collectedQuantity } = req.body;

      // Verify listing exists and is active
      const listing = await prisma.listing.findUnique({ where: { id: listingId } });
      if (!listing) return res.status(404).json({ error: 'Listing not found' });

      // Verify collector exists and is a dealer/franchise
      const collector = await prisma.user.findUnique({ where: { id: collectorId } });
      if (!collector || !['DEALER', 'FRANCHISE_OWNER', 'WHOLESALE_BUYER'].includes(collector.role)) {
        return res.status(400).json({ error: 'Invalid collector role' });
      }

      const collection = await prisma.collection.create({
        data: {
          listingId,
          collectorId,
          collectionDate: new Date(collectionDate),
          status: 'PENDING',
          collectedQuantity,
        },
        include: {
          listing: { select: { title: true } },
          collector: { select: { firstName: true, lastName: true } },
        },
      });

      // Update listing status
      await prisma.listing.update({
        where: { id: listingId },
        data: { status: 'COLLECTION_PENDING' },
      });

      // Notify collector
      const io = req.app.get('io');
      if (io) {
        io.to(`user-${collectorId}`).emit('notification', {
          type: 'COLLECTION_ASSIGNED',
          title: 'New Collection Assigned',
          body: `"${listing.title}" has been assigned to you for collection.`,
          data: { collectionId: collection.id, listingId },
        });
      }

      res.status(201).json(collection);
    } catch (err) {
      console.error('Error creating collection:', err);
      res.status(500).json({ error: 'Failed to create collection' });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// PATCH /api/collections/:id/status — Update collection status
// ═══════════════════════════════════════════════════════════
router.patch(
  '/:id/status',
  [
    param('id').isUUID(),
    body('status').isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'VERIFIED']),
    body('notes').optional().isString(),
  ],
  validate,
  async (req, res) => {
    try {
      const { status, notes } = req.body;
      const collection = await prisma.collection.findUnique({
        where: { id: req.params.id },
        include: { listing: true },
      });

      if (!collection) return res.status(404).json({ error: 'Collection not found' });

      const updateData = { status };
      if (notes) updateData.adminNotes = notes;

      // Update listing status based on collection status
      let listingStatus = null;
      switch (status) {
        case 'IN_PROGRESS':
          listingStatus = 'COLLECTION_IN_PROGRESS';
          break;
        case 'COMPLETED':
          listingStatus = 'COLLECTION_COMPLETED';
          break;
        case 'VERIFIED':
          updateData.verifiedByAdmin = true;
          listingStatus = 'COLLECTION_COMPLETED';
          // Calculate carbon credits
          if (collection.collectedWeight || collection.collectedQuantity) {
            const weight = parseFloat(collection.collectedWeight || collection.collectedQuantity);
            const categoryName = collection.listing?.categoryName || 'Metals';
            const carbonKg = calculateCarbonOffset(categoryName, weight);
            const creditValue = carbonKg * 2.5; // PKR per kg CO2

            await prisma.carbonCredit.create({
              data: {
                listingId: collection.listingId,
                collectionId: collection.id,
                carbonAmountKg: carbonKg,
                creditValue: creditValue,
              },
            });
          }
          break;
      }

      const updated = await prisma.collection.update({
        where: { id: req.params.id },
        data: updateData,
      });

      if (listingStatus) {
        await prisma.listing.update({
          where: { id: collection.listingId },
          data: { status: listingStatus },
        });
      }

      res.json(updated);
    } catch (err) {
      console.error('Error updating collection status:', err);
      res.status(500).json({ error: 'Failed to update collection status' });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// POST /api/collections/:id/verify-gps — GPS location verification
// ═══════════════════════════════════════════════════════════
router.post(
  '/:id/verify-gps',
  [
    param('id').isUUID(),
    body('latitude').isFloat(),
    body('longitude').isFloat(),
  ],
  validate,
  async (req, res) => {
    try {
      const { latitude, longitude } = req.body;
      const collection = await prisma.collection.findUnique({
        where: { id: req.params.id },
        include: { listing: true },
      });

      if (!collection) return res.status(404).json({ error: 'Collection not found' });

      const listingLat = parseFloat(collection.listing.latitude || 0);
      const listingLng = parseFloat(collection.listing.longitude || 0);

      const gpsCheck = isWithinRange(latitude, longitude, listingLat, listingLng, 500);

      const updated = await prisma.collection.update({
        where: { id: req.params.id },
        data: {
          collectorLatitude: latitude,
          collectorLongitude: longitude,
        },
      });

      res.json({
        verified: gpsCheck.withinRange,
        distanceMeters: gpsCheck.distanceMeters,
        maxAllowedMeters: 500,
        collection: updated,
      });
    } catch (err) {
      console.error('Error verifying GPS:', err);
      res.status(500).json({ error: 'Failed to verify GPS' });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// PATCH /api/collections/:id/weight — Confirm weight
// ═══════════════════════════════════════════════════════════
router.patch(
  '/:id/weight',
  [
    param('id').isUUID(),
    body('collectedWeight').isDecimal(),
    body('notes').optional().isString(),
  ],
  validate,
  async (req, res) => {
    try {
      const updated = await prisma.collection.update({
        where: { id: req.params.id },
        data: {
          collectedWeight: parseFloat(req.body.collectedWeight),
          adminNotes: req.body.notes || undefined,
        },
      });
      res.json(updated);
    } catch (err) {
      console.error('Error updating weight:', err);
      res.status(500).json({ error: 'Failed to update weight' });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// POST /api/collections/:id/rate — Rate collection
// ═══════════════════════════════════════════════════════════
router.post(
  '/:id/rate',
  [
    param('id').isUUID(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('raterType').isIn(['seller', 'collector']),
    body('comment').optional().isString(),
  ],
  validate,
  async (req, res) => {
    try {
      const { rating, raterType, comment } = req.body;
      const collection = await prisma.collection.findUnique({
        where: { id: req.params.id },
        include: { listing: true },
      });

      if (!collection) return res.status(404).json({ error: 'Collection not found' });

      const updateField = raterType === 'seller'
        ? { ratingGivenBySeller: rating }
        : { ratingGivenByCollector: rating };

      await prisma.collection.update({
        where: { id: req.params.id },
        data: updateField,
      });

      // Create DealerRating record
      const dealerRating = await prisma.dealerRating.create({
        data: {
          dealerId: collection.collectorId,
          raterId: raterType === 'seller' ? collection.listing.sellerId : collection.collectorId,
          listingId: collection.listingId,
          collectionId: collection.id,
          rating,
          comment,
        },
      });

      res.json({ message: 'Rating submitted', dealerRating });
    } catch (err) {
      console.error('Error rating collection:', err);
      res.status(500).json({ error: 'Failed to rate collection' });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// GET /api/collections/dealer/:dealerId/rating — Dealer performance
// ═══════════════════════════════════════════════════════════
router.get('/dealer/:dealerId/rating', async (req, res) => {
  try {
    const { dealerId } = req.params;

    // Get all ratings for this dealer
    const ratings = await prisma.dealerRating.findMany({
      where: { dealerId },
      orderBy: { createdAt: 'desc' },
    });

    // Get collection stats
    const [total, completed, cancelled] = await Promise.all([
      prisma.collection.count({ where: { collectorId: dealerId } }),
      prisma.collection.count({ where: { collectorId: dealerId, status: 'COMPLETED' } }),
      prisma.collection.count({ where: { collectorId: dealerId, status: 'CANCELLED' } }),
    ]);

    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    res.json({
      dealerId,
      averageRating: Math.round(avgRating * 10) / 10,
      totalRatings: ratings.length,
      totalCollections: total,
      completedCollections: completed,
      cancelledCollections: cancelled,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      recentRatings: ratings.slice(0, 10),
    });
  } catch (err) {
    console.error('Error fetching dealer rating:', err);
    res.status(500).json({ error: 'Failed to fetch dealer rating' });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /api/collections/analytics/carbon — Carbon credit analytics
// ═══════════════════════════════════════════════════════════
router.get('/analytics/carbon', async (req, res) => {
  try {
    const { period = 'month', geoZoneId } = req.query;

    // Get all carbon credits
    const where = {};
    if (geoZoneId) {
      where.listing = { geoZoneId };
    }

    const credits = await prisma.carbonCredit.findMany({
      where,
      include: {
        listing: {
          select: {
            id: true, title: true, cityName: true,
            category: { select: { name: true } },
            geoZone: { select: { name: true, type: true } },
          },
        },
        collection: {
          select: {
            collectedQuantity: true, collectedWeight: true,
            collectorId: true,
            collector: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { issuedDate: 'desc' },
    });

    // Aggregate by category
    const byCategory = {};
    credits.forEach((c) => {
      const cat = c.listing?.category?.name || 'Unknown';
      if (!byCategory[cat]) {
        byCategory[cat] = { totalWeightKg: 0, totalCarbonKg: 0, totalCreditPkr: 0, count: 0 };
      }
      byCategory[cat].totalWeightKg += parseFloat(c.collection?.collectedWeight || c.collection?.collectedQuantity || 0);
      byCategory[cat].totalCarbonKg += parseFloat(c.carbonAmountKg);
      byCategory[cat].totalCreditPkr += parseFloat(c.creditValue);
      byCategory[cat].count++;
    });

    // Aggregate by zone
    const byZone = {};
    credits.forEach((c) => {
      const zone = c.listing?.geoZone?.name || 'Unknown';
      if (!byZone[zone]) {
        byZone[zone] = { totalCarbonKg: 0, totalCreditPkr: 0, count: 0 };
      }
      byZone[zone].totalCarbonKg += parseFloat(c.carbonAmountKg);
      byZone[zone].totalCreditPkr += parseFloat(c.creditValue);
      byZone[zone].count++;
    });

    // Totals
    const totalCarbonKg = credits.reduce((sum, c) => sum + parseFloat(c.carbonAmountKg), 0);
    const totalCreditPkr = credits.reduce((sum, c) => sum + parseFloat(c.creditValue), 0);

    res.json({
      summary: {
        totalCollections: credits.length,
        totalCarbonOffsetKg: Math.round(totalCarbonKg * 100) / 100,
        totalCreditValuePkr: Math.round(totalCreditPkr * 100) / 100,
        estimatedTreesEquivalent: Math.round(totalCarbonKg / 21), // ~21 kg CO2 per tree/year
      },
      byCategory,
      byZone,
      recentCredits: credits.slice(0, 20),
    });
  } catch (err) {
    console.error('Error fetching carbon analytics:', err);
    res.status(500).json({ error: 'Failed to fetch carbon analytics' });
  }
});

module.exports = router;
