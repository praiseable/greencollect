const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

// GET /units
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { type } = req.query;
    const lang = req.lang || 'en';
    const where = { isActive: true };
    if (type) where.type = type;

    const units = await prisma.unit.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: { translations: { where: { languageId: lang } } },
    });

    res.json(units.map(u => ({
      ...u,
      name: u.translations[0]?.name || u.slug,
      abbreviation: u.translations[0]?.abbreviation || u.slug,
    })));
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch units' } });
  }
});

// POST /units (admin)
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { slug, type, isBaseUnit, conversionFactor, translations } = req.body;
    const unit = await prisma.unit.create({
      data: {
        slug,
        type,
        isBaseUnit: isBaseUnit || false,
        conversionFactor: conversionFactor || 1,
        translations: translations ? {
          create: translations.map(t => ({ languageId: t.languageId, name: t.name, abbreviation: t.abbreviation })),
        } : undefined,
      },
      include: { translations: true },
    });
    res.status(201).json(unit);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to create unit' } });
  }
});

module.exports = router;
