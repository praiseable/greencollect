const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { addFormattedPrice } = require('../services/currency.service');
const multer = require('multer');
const path = require('path');

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only images allowed'), false);
}});

// GET /listings — Browse listings (public)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1, limit = 20, categoryId, productTypeId,
      geoZoneId, cityName, minPrice, maxPrice, status = 'ACTIVE',
      sortBy = 'createdAt', sortOrder = 'desc', search, countryId = 'PK',
    } = req.query;

    const lang = req.lang || 'en';
    const where = { status, countryId };
    if (categoryId) where.categoryId = categoryId;
    if (productTypeId) where.productTypeId = productTypeId;
    if (geoZoneId) where.geoZoneId = geoZoneId;
    if (cityName) where.cityName = { contains: cityName, mode: 'insensitive' };
    if (minPrice) where.pricePaisa = { ...where.pricePaisa, gte: BigInt(minPrice) };
    if (maxPrice) where.pricePaisa = { ...where.pricePaisa, lte: BigInt(maxPrice) };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
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

    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        categoryId,
        productTypeId: productTypeId || null,
        pricePaisa: BigInt(pricePaisa),
        currencyId: 'PKR',
        priceNegotiable: priceNegotiable !== false,
        quantity: parseFloat(quantity),
        unitId,
        minOrderQuantity: minOrderQuantity ? parseFloat(minOrderQuantity) : null,
        sellerId: req.user.id,
        geoZoneId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address,
        cityName,
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

    // Notify admins/managers of new listing
    const admins = await prisma.user.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'COLLECTION_MANAGER'] }, isActive: true },
      select: { id: true },
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(a => ({
          userId: a.id,
          type: 'NEW_LISTING',
          title: 'New Listing Posted',
          body: `${req.user.firstName} posted: ${title}`,
          data: { listingId: listing.id },
        })),
      });
    }

    res.status(201).json({ ...listing, pricePaisa: listing.pricePaisa.toString() });
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ error: { message: 'Failed to create listing' } });
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

// DELETE /listings/:id — Close listing
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: { message: 'Listing not found' } });
    if (listing.sellerId !== req.user.id && !['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Not authorized' } });
    }

    await prisma.listing.update({ where: { id: req.params.id }, data: { status: 'CLOSED' } });
    res.json({ message: 'Listing closed' });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to close listing' } });
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
