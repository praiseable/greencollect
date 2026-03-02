const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

// GET /product-types — All product types (paginated)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { categoryId, page = 1, limit = 50 } = req.query;
    const lang = req.lang || 'en';
    const where = { isActive: true };
    if (categoryId) where.categoryId = categoryId;

    const [types, total] = await Promise.all([
      prisma.productType.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { sortOrder: 'asc' },
        include: {
          translations: { where: { languageId: lang } },
          category: { include: { translations: { where: { languageId: lang } } } },
          _count: { select: { listings: true } },
        },
      }),
      prisma.productType.count({ where }),
    ]);

    res.json({ data: types.map(t => ({ ...t, name: t.translations[0]?.name || t.slug })), total });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch product types' } });
  }
});

// GET /product-types/:id — Detail with attributes
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const lang = req.lang || 'en';
    const type = await prisma.productType.findUnique({
      where: { id: req.params.id },
      include: {
        translations: true,
        category: { include: { translations: true } },
        attributes: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            translations: { where: { languageId: lang } },
            options: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              include: { translations: { where: { languageId: lang } } },
            },
          },
        },
      },
    });
    if (!type) return res.status(404).json({ error: { message: 'Product type not found' } });
    res.json(type);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch product type' } });
  }
});

// GET /product-types/:id/attributes — Attributes + options for listing form
router.get('/:id/attributes', optionalAuth, async (req, res) => {
  try {
    const lang = req.lang || 'en';
    const attrs = await prisma.productAttribute.findMany({
      where: { productTypeId: req.params.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        translations: { where: { languageId: lang } },
        options: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: { translations: { where: { languageId: lang } } },
        },
      },
    });
    res.json(attrs);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch attributes' } });
  }
});

// POST /product-types — Create (admin)
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { slug, categoryId, icon, sortOrder, translations } = req.body;
    const type = await prisma.productType.create({
      data: {
        slug,
        categoryId,
        icon,
        sortOrder: sortOrder || 0,
        translations: translations ? {
          create: translations.map(t => ({
            languageId: t.languageId,
            name: t.name,
            description: t.description,
            unitLabel: t.unitLabel,
          })),
        } : undefined,
      },
      include: { translations: true },
    });
    res.status(201).json(type);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to create product type' } });
  }
});

// PUT /product-types/:id — Update (admin)
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { slug, categoryId, icon, sortOrder, isActive } = req.body;
    const data = {};
    if (slug !== undefined) data.slug = slug;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (icon !== undefined) data.icon = icon;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (isActive !== undefined) data.isActive = isActive;

    const type = await prisma.productType.update({
      where: { id: req.params.id },
      data,
      include: { translations: true },
    });
    res.json(type);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to update product type' } });
  }
});

// POST /product-types/:id/attributes — Add attribute
router.post('/:id/attributes', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { slug, inputType, isRequired, isFilterable, sortOrder, translations, options } = req.body;
    const attr = await prisma.productAttribute.create({
      data: {
        productTypeId: req.params.id,
        slug,
        inputType: inputType || 'SELECT',
        isRequired: isRequired || false,
        isFilterable: isFilterable !== false,
        sortOrder: sortOrder || 0,
        translations: translations ? {
          create: translations.map(t => ({ languageId: t.languageId, label: t.label })),
        } : undefined,
        options: options ? {
          create: options.map((o, i) => ({
            slug: o.slug,
            sortOrder: i,
            translations: o.translations ? {
              create: o.translations.map(t => ({ languageId: t.languageId, label: t.label })),
            } : undefined,
          })),
        } : undefined,
      },
      include: { translations: true, options: { include: { translations: true } } },
    });
    res.status(201).json(attr);
  } catch (err) {
    console.error('Create attribute error:', err);
    res.status(500).json({ error: { message: 'Failed to create attribute' } });
  }
});

module.exports = router;
