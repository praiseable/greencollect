const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize } = require('../middleware/auth');

// GET /languages
router.get('/', async (req, res) => {
  try {
    const languages = await prisma.language.findMany({ where: { isActive: true }, orderBy: { isDefault: 'desc' } });
    res.json(languages);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch languages' } });
  }
});

// GET /languages/:id
router.get('/:id', async (req, res) => {
  try {
    const lang = await prisma.language.findUnique({ where: { id: req.params.id } });
    if (!lang) return res.status(404).json({ error: { message: 'Language not found' } });
    res.json(lang);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch language' } });
  }
});

// POST /languages — Add language (admin)
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { id, name, nativeName, direction, flagEmoji } = req.body;
    const lang = await prisma.language.create({ data: { id, name, nativeName, direction: direction || 'LTR', flagEmoji } });
    res.status(201).json(lang);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to create language' } });
  }
});

// PUT /languages/:id/toggle
router.put('/:id/toggle', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const l = await prisma.language.findUnique({ where: { id: req.params.id } });
    const updated = await prisma.language.update({ where: { id: req.params.id }, data: { isActive: !l.isActive } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to toggle language' } });
  }
});

module.exports = router;
