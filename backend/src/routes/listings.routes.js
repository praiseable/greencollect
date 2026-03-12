const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { success, error, paginated } = require('../utils/apiResponse');
const { addFormattedPrice } = require('../services/currency.service');
const { buildGeoFenceWhere, canUserViewListing } = require('../services/geoFencing.service');
const { notifyZoneDealersOnNewListing } = require('../services/escalation.service');
const multer = require('multer');
const path = require('path');

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  }
});

// GET /listings — Browse listings (with geo-fencing)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1, limit = 20, categoryId, productTypeId,
      geoZoneId, cityName, minPrice, maxPrice, status = 'ACTIVE',
      sortBy = 'createdAt', sortOrder = 'desc', search, countryId = 'PK',
    } = req.query;

    const lang = req.lang || 'en';

    // Admins can bypass geo-fencing
    const isAdmin = req.user && ['SUPER_ADMIN', 'ADMIN', 'COLLECTION_MANAGER'].includes(req.user.role);

    // Build where clause
    const where = {
      status,
      countryId,
    };

    // Apply geo-fencing for non-admins (dealers see PUBLIC + their territory; unauthenticated see only PUBLIC)
    if (!isAdmin) {
      const geoFenceWhere = await buildGeoFenceWhere(req.user, { countryId });
      if (geoFenceWhere.OR) {
        where.AND = [{ OR: geoFenceWhere.OR }];
      } else if (geoFenceWhere.visibilityLevel) {
        where.visibilityLevel = geoFenceWhere.visibilityLevel;
      }
    }

    // Add other filters
    if (categoryId) where.categoryId = categoryId;
    if (productTypeId) where.productTypeId = productTypeId;
    if (geoZoneId) where.geoZoneId = geoZoneId; // Admins can filter by any zone
    if (cityName) where.cityName = { contains: cityName, mode: 'insensitive' };
    if (minPrice) where.pricePaisa = { ...where.pricePaisa, gte: BigInt(minPrice) };
    if (maxPrice) where.pricePaisa = { ...where.pricePaisa, lte: BigInt(maxPrice) };

    // Search: merge with existing AND conditions
    if (search) {
      const searchOr = {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      };

      if (where.AND) {
        where.AND.push(searchOr);
      } else {
        where.AND = [searchOr];
      }
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: { include: { translations: { where: { languageId: lang } } } },
          productType: { include: { translations: { where: { languageId: lang } } } },
          unit: { include: { translations: { where: { languageId: lang } } } },
          currency: true,
          seller: { select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, city: true } },
          geoZone: { select: { id: true, name: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 3 },
          _count: { select: { transactions: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    // Add formatted prices
    const data = listings.map(l => {
      const item = { ...l, pricePaisa: l.pricePaisa.toString() };
      item.priceFormatted = `₨ ${Number(l.pricePaisa).toLocaleString('en-PK')}`;
      item.categoryName = l.category?.translations[0]?.name || l.category?.slug;
      item.productTypeName = l.productType?.translations[0]?.name || l.productType?.slug;
      item.unitName = l.unit?.translations[0]?.abbreviation || l.unit?.slug;
      return item;
    });

    res.json({ data, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('List listings error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch listings' } });
  }
});

// GET /listings/favorites — Own favourited listings (spec 2.7)
router.get('/favorites', authenticate, async (req, res) => {
  try {
    const lang = req.lang || 'en';
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [favs, total] = await Promise.all([
      prisma.listingFavorite.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          listing: {
            include: {
              category: { include: { translations: { where: { languageId: lang } } } },
              productType: { include: { translations: { where: { languageId: lang } } } },
              unit: { include: { translations: { where: { languageId: lang } } } },
              seller: { select: { id: true, firstName: true, lastName: true, displayName: true, city: true } },
              images: { orderBy: { sortOrder: 'asc' }, take: 3 },
            },
          },
        },
      }),
      prisma.listingFavorite.count({ where: { userId: req.user.id } }),
    ]);
    const listings = favs.map(f => {
      const l = f.listing;
      return {
        ...l,
        pricePaisa: l.pricePaisa.toString(),
        priceFormatted: `₨ ${Number(l.pricePaisa).toLocaleString('en-PK')}`,
        categoryName: l.category?.translations?.[0]?.name || l.category?.slug,
        productTypeName: l.productType?.translations?.[0]?.name || l.productType?.slug,
      };
    });
    const totalPages = Math.ceil(total / parseInt(limit));
    res.json(paginated(listings, { page: parseInt(page), limit: parseInt(limit), total, totalPages }));
  } catch (err) {
    console.error('List favorites error:', err);
    res.status(500).json(error('Failed to fetch favorites', 'INTERNAL_ERROR'));
  }
});

// POST /listings/:id/favorite — Toggle favourite (spec 2.7)
router.post('/:id/favorite', authenticate, async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json(error('Listing not found', 'NOT_FOUND'));
    const existing = await prisma.listingFavorite.findUnique({
      where: { userId_listingId: { userId: req.user.id, listingId: req.params.id } },
    });
    if (existing) {
      await prisma.listingFavorite.delete({ where: { id: existing.id } });
      return res.json(success({ favorited: false }));
    }
    await prisma.listingFavorite.create({
      data: { userId: req.user.id, listingId: req.params.id },
    });
    return res.json(success({ favorited: true }));
  } catch (err) {
    console.error('Toggle favorite error:', err);
    res.status(500).json(error('Failed to update favorite', 'INTERNAL_ERROR'));
  }
});

// POST /listings/:id/report — Report listing (spec 2.7); auto-flag at 5 reports
router.post('/:id/report', authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return res.status(400).json(error('Reason is required (min 5 characters)', 'VALIDATION_ERROR'));
    }
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json(error('Listing not found', 'NOT_FOUND'));
    const existing = await prisma.listingReport.findUnique({
      where: { listingId_reporterId: { listingId: req.params.id, reporterId: req.user.id } },
    });
    if (existing) return res.status(409).json(error('You have already reported this listing', 'ALREADY_REPORTED'));
    await prisma.listingReport.create({
      data: { listingId: req.params.id, reporterId: req.user.id, reason: reason.trim() },
    });
    const reportCount = await prisma.listingReport.count({ where: { listingId: req.params.id } });
    if (reportCount >= 5) {
      await prisma.listing.update({
        where: { id: req.params.id },
        data: { isFlagged: true, flagCount: reportCount },
      });
      const io = req.app.get('io');
      if (io) {
        const admins = await prisma.user.findMany({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } }, select: { id: true } });
        admins.forEach(({ id: userId }) => io.to(`user-${userId}`).emit('notification', { type: 'LISTING_FLAGGED', listingId: req.params.id, title: 'Listing flagged', body: `Listing has received ${reportCount} reports.` }));
      }
    }
    return res.json(success({ reported: true }));
  } catch (err) {
    console.error('Report listing error:', err);
    res.status(500).json(error('Failed to submit report', 'INTERNAL_ERROR'));
  }
});

// GET /listings/my — Own listings (all statuses) — spec 2.7
router.get('/my', authenticate, async (req, res) => {
  try {
    const lang = req.lang || 'en';
    const { page = 1, limit = 20, status } = req.query;
    const where = { sellerId: req.user.id };
    if (status) where.status = status;
    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { updatedAt: 'desc' },
        include: {
          category: { include: { translations: { where: { languageId: lang } } } },
          productType: { include: { translations: { where: { languageId: lang } } } },
          unit: { include: { translations: { where: { languageId: lang } } } },
          images: { orderBy: { sortOrder: 'asc' }, take: 3 },
        },
      }),
      prisma.listing.count({ where }),
    ]);
    const data = listings.map(l => ({
      ...l,
      pricePaisa: l.pricePaisa.toString(),
      priceFormatted: `₨ ${Number(l.pricePaisa).toLocaleString('en-PK')}`,
    }));
    const totalPages = Math.ceil(total / parseInt(limit));
    res.json(paginated(data, { page: parseInt(page), limit: parseInt(limit), total, totalPages }));
  } catch (err) {
    console.error('List my listings error:', err);
    res.status(500).json(error('Failed to fetch your listings', 'INTERNAL_ERROR'));
  }
});

// GET /listings/:id — Listing detail
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const lang = req.lang || 'en';
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        category: { include: { translations: true } },
        productType: { include: { translations: true } },
        unit: { include: { translations: true } },
        currency: true,
        seller: { select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, phone: true, city: true } },
        geoZone: true,
        images: { orderBy: { sortOrder: 'asc' } },
        attributeValues: {
          include: {
            attribute: { include: { translations: { where: { languageId: lang } } } },
            option: { include: { translations: { where: { languageId: lang } } } },
          },
        },
        _count: { select: { transactions: true } },
      },
    });

    if (!listing) return res.status(404).json({ error: { message: 'Listing not found' } });

    // Check geo-fencing (admins can view any listing)
    const isAdmin = req.user && ['SUPER_ADMIN', 'ADMIN', 'COLLECTION_MANAGER'].includes(req.user.role);
    if (!isAdmin) {
      const canView = await canUserViewListing(req.user, listing);
      if (!canView) {
        return res.status(403).json({
          error: {
            message: 'This listing is not available in your area',
            code: 'GEO_FENCE_RESTRICTED',
          },
        });
      }
    }

    // Increment view count
    await prisma.listing.update({ where: { id: req.params.id }, data: { viewCount: { increment: 1 } } });

    const result = {
      ...listing,
      pricePaisa: listing.pricePaisa.toString(),
      priceFormatted: `₨ ${Number(listing.pricePaisa).toLocaleString('en-PK')}`,
    };

    res.json(result);
  } catch (err) {
    console.error('Get listing error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch listing' } });
  }
});

// POST /listings — Create listing
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      title, description, categoryId, productTypeId,
      pricePaisa, priceNegotiable, quantity, unitId,
      minOrderQuantity, geoZoneId, latitude, longitude,
      address, cityName, contactNumber, attributeValues,
    } = req.body;

    // Validate required fields
    if (!title || !categoryId || !pricePaisa || !quantity || !unitId) {
      return res.status(400).json({
        error: { message: 'Missing required fields: title, categoryId, pricePaisa, quantity, unitId', code: 'VALIDATION_ERROR' },
      });
    }

    // Resolve geoZoneId: explicit id > cityName lookup > user's zone > first city
    let resolvedGeoZoneId = geoZoneId;
    let resolvedLat = latitude ? parseFloat(latitude) : null;
    let resolvedLng = longitude ? parseFloat(longitude) : null;
    let resolvedCity = cityName || null;

    if (!resolvedGeoZoneId && cityName && typeof cityName === 'string' && cityName.trim()) {
      const cityZone = await prisma.geoZone.findFirst({
        where: { type: 'CITY', countryId: 'PK', isActive: true, name: { equals: cityName.trim(), mode: 'insensitive' } },
      });
      if (cityZone) {
        resolvedGeoZoneId = cityZone.id;
        resolvedCity = resolvedCity || cityZone.name;
        resolvedLat = resolvedLat || cityZone.latitude;
        resolvedLng = resolvedLng || cityZone.longitude;
      }
    }

    if (!resolvedGeoZoneId) {
      if (req.user.geoZoneId) {
        resolvedGeoZoneId = req.user.geoZoneId;
      } else {
        const defaultCity = await prisma.geoZone.findFirst({ where: { type: 'CITY', countryId: 'PK', isActive: true } });
        if (defaultCity) {
          resolvedGeoZoneId = defaultCity.id;
          resolvedCity = resolvedCity || defaultCity.name;
          resolvedLat = resolvedLat || defaultCity.latitude;
          resolvedLng = resolvedLng || defaultCity.longitude;
        }
      }
    }

    // If still no coordinates, look up from the zone
    if ((!resolvedLat || !resolvedLng) && resolvedGeoZoneId) {
      const zone = await prisma.geoZone.findUnique({ where: { id: resolvedGeoZoneId } });
      if (zone) {
        resolvedLat = resolvedLat || zone.latitude || 24.8607;
        resolvedLng = resolvedLng || zone.longitude || 67.0011;
        resolvedCity = resolvedCity || zone.name;
      }
    }

    // Final fallback coordinates (Karachi)
    resolvedLat = resolvedLat || 24.8607;
    resolvedLng = resolvedLng || 67.0011;

    if (!resolvedGeoZoneId) {
      return res.status(400).json({
        error: { message: 'No city/zone provided and no default found. Please select a city.', code: 'VALIDATION_ERROR' },
      });
    }

    const listing = await prisma.listing.create({
      data: {
        title,
        description: description || title,
        categoryId,
        productTypeId: productTypeId || null,
        pricePaisa: BigInt(pricePaisa),
        currencyId: 'PKR',
        priceNegotiable: priceNegotiable !== false,
        quantity: parseFloat(quantity),
        unitId,
        minOrderQuantity: minOrderQuantity ? parseFloat(minOrderQuantity) : null,
        sellerId: req.user.id,
        geoZoneId: resolvedGeoZoneId,
        latitude: resolvedLat,
        longitude: resolvedLng,
        address: address || null,
        cityName: resolvedCity,
        countryId: 'PK',
        contactNumber: contactNumber || null,
        attributeValues: attributeValues ? {
          create: attributeValues.map(av => ({
            attributeId: av.attributeId,
            optionId: av.optionId || null,
            textValue: av.textValue || null,
            numberValue: av.numberValue || null,
          })),
        } : undefined,
      },
      include: {
        category: true,
        productType: true,
        unit: true,
        images: true,
        seller: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Notify zone dealers + admins (territory-based notification routing)
    const io = req.app.get('io');
    await notifyZoneDealersOnNewListing(listing, req.user, io);

    res.status(201).json({ ...listing, pricePaisa: listing.pricePaisa.toString() });
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ error: { message: 'Failed to create listing', details: err.message } });
  }
});

// POST /listings/:id/images — Upload images
router.post('/:id/images', authenticate, upload.array('images', 5), async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: { message: 'Listing not found' } });
    if (listing.sellerId !== req.user.id && !['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Not authorized' } });
    }

    const images = await Promise.all(
      req.files.map((file, i) =>
        prisma.listingImage.create({
          data: {
            listingId: req.params.id,
            url: `/uploads/${file.filename}`,
            sortOrder: i,
          },
        })
      )
    );

    res.status(201).json(images);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to upload images' } });
  }
});

// PUT /listings/:id — Update listing
router.put('/:id', authenticate, async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: { message: 'Listing not found' } });
    if (listing.sellerId !== req.user.id && !['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Not authorized' } });
    }

    const { title, description, pricePaisa, status, quantity, priceNegotiable } = req.body;
    const data = {};
    if (title) data.title = title;
    if (description) data.description = description;
    if (pricePaisa) data.pricePaisa = BigInt(pricePaisa);
    if (status) data.status = status;
    if (quantity) data.quantity = parseFloat(quantity);
    if (priceNegotiable !== undefined) data.priceNegotiable = priceNegotiable;

    const updated = await prisma.listing.update({ where: { id: req.params.id }, data });
    res.json({ ...updated, pricePaisa: updated.pricePaisa.toString() });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to update listing' } });
  }
});

// PATCH /listings/:id/deactivate — spec 2.7 (owner or admin)
router.patch('/:id/deactivate', authenticate, async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: { message: 'Listing not found' } });
    if (listing.sellerId !== req.user.id && !['SUPER_ADMIN', 'ADMIN', 'COLLECTION_MANAGER'].includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Not authorized' } });
    }
    await prisma.listing.update({ where: { id: req.params.id }, data: { status: 'CLOSED' } });
    res.json(success({ status: 'CLOSED' }));
  } catch (err) {
    res.status(500).json(error('Failed to deactivate listing', 'INTERNAL_ERROR'));
  }
});

// PATCH /listings/:id/reactivate — spec 2.7 (owner only)
router.patch('/:id/reactivate', authenticate, async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: { message: 'Listing not found' } });
    if (listing.sellerId !== req.user.id) return res.status(403).json({ error: { message: 'Not authorized' } });
    await prisma.listing.update({ where: { id: req.params.id }, data: { status: 'ACTIVE' } });
    res.json(success({ status: 'ACTIVE' }));
  } catch (err) {
    res.status(500).json(error('Failed to reactivate listing', 'INTERNAL_ERROR'));
  }
});

// DELETE /listings/:id — Soft close / delete (owner or admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: { message: 'Listing not found' } });
    if (listing.sellerId !== req.user.id && !['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Not authorized' } });
    }

    await prisma.listing.update({ where: { id: req.params.id }, data: { status: 'CLOSED' } });
    res.json(success({ message: 'Listing closed' }));
  } catch (err) {
    res.status(500).json(error('Failed to close listing', 'INTERNAL_ERROR'));
  }
});

// POST /listings/:id/interest — Express interest / make offer
router.post('/:id/interest', authenticate, async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: { message: 'Listing not found' } });

    const { offerPricePaisa, quantity, notes } = req.body;

    const transaction = await prisma.transaction.create({
      data: {
        listingId: req.params.id,
        buyerId: req.user.id,
        sellerId: listing.sellerId,
        amountPaisa: BigInt(offerPricePaisa || listing.pricePaisa),
        currencyId: 'PKR',
        quantity: parseFloat(quantity || listing.quantity),
        status: 'OFFER_MADE',
        notes,
      },
    });

    // Update interested count
    await prisma.listing.update({ where: { id: req.params.id }, data: { interestedCount: { increment: 1 } } });

    // Notify seller
    await prisma.notification.create({
      data: {
        userId: listing.sellerId,
        type: 'OFFER_RECEIVED',
        title: 'New Offer Received',
        body: `${req.user.firstName} made an offer on "${listing.title}"`,
        data: { listingId: listing.id, transactionId: transaction.id },
      },
    });

    res.status(201).json({ ...transaction, amountPaisa: transaction.amountPaisa.toString() });
  } catch (err) {
    console.error('Interest error:', err);
    res.status(500).json({ error: { message: 'Failed to express interest' } });
  }
});

module.exports = router;
