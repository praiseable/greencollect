const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');
const { idempotency } = require('../middleware/idempotency');
const { created, ok, noContent } = require('../utils/dto');

// GET /categories — Category tree (public, with translations)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const lang = req.lang || 'en';
    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        translations: { where: { languageId: lang } },
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            translations: { where: { languageId: lang } },
            children: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              include: { translations: { where: { languageId: lang } } },
            },
          },
        },
        _count: { select: { listings: true, productTypes: true } },
      },
    });

    // Flatten translations
    const result = categories.map(cat => ({
      ...cat,
      name: cat.translations[0]?.name || cat.slug,
      description: cat.translations[0]?.description || null,
      children: cat.children.map(child => ({
        ...child,
        name: child.translations[0]?.name || child.slug,
        description: child.translations[0]?.description || null,
        children: child.children?.map(gc => ({
          ...gc,
          name: gc.translations[0]?.name || gc.slug,
        })),
      })),
    }));

    res.json(result);
  } catch (err) {
    console.error('Categories error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch categories' } });
  }
});

// GET /categories/:id — Category detail
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        translations: true,
        children: { include: { translations: true } },
        productTypes: {
          where: { isActive: true },
          include: { translations: true },
        },
        _count: { select: { listings: true } },
      },
    });
    if (!category) return res.status(404).json({ error: { message: 'Category not found' } });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch category' } });
  }
});

// GET /categories/:id/product-types — Product types in category
router.get('/:id/product-types', optionalAuth, async (req, res) => {
  try {
    const lang = req.lang || 'en';
    const types = await prisma.productType.findMany({
      where: { categoryId: req.params.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        translations: { where: { languageId: lang } },
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

    const result = types.map(t => ({
      ...t,
      name: t.translations[0]?.name || t.slug,
      description: t.translations[0]?.description || null,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch product types' } });
  }
});

// POST /categories — Create category (admin)
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), idempotency(), auditLog('Category', (req) => null, (req) => req.body), async (req, res) => {
  try {
    const { slug, parentId, colorHex, icon, sortOrder, translations } = req.body;

    const category = await prisma.category.create({
      data: {
        slug,
        parentId: parentId || null,
        colorHex: colorHex || null,
        icon: icon || null,
        sortOrder: sortOrder || 0,
        translations: translations ? {
          create: translations.map(t => ({
            languageId: t.languageId,
            name: t.name,
            description: t.description || null,
          })),
        } : undefined,
      },
      include: { translations: true },
    });

    res.status(201).json(created(category));
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: { message: 'Failed to create category' } });
  }
});

// PUT /categories/:id — Update category (admin)
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), auditLog('Category', (req) => req.params.id, (req) => req.body), async (req, res) => {
  try {
    const { slug, parentId, colorHex, icon, sortOrder, isActive } = req.body;
    const data = {};
    if (slug !== undefined) data.slug = slug;
    if (parentId !== undefined) data.parentId = parentId;
    if (colorHex !== undefined) data.colorHex = colorHex;
    if (icon !== undefined) data.icon = icon;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (isActive !== undefined) data.isActive = isActive;

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data,
      include: { translations: true },
    });

    res.json(ok(category));
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to update category' } });
  }
});

// POST /categories/:id/translations — Add/update translation
router.post('/:id/translations', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { languageId, name, description } = req.body;
    const translation = await prisma.categoryTranslation.upsert({
      where: { categoryId_languageId: { categoryId: req.params.id, languageId } },
      update: { name, description },
      create: { categoryId: req.params.id, languageId, name, description },
    });
    res.json(translation);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to update translation' } });
  }
});

// DELETE /categories/:id — Soft delete
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), auditLog('Category', (req) => req.params.id), async (req, res) => {
  try {
    await prisma.category.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json(noContent());
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to delete category' } });
  }
});

module.exports = router;
