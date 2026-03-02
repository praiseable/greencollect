const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize } = require('../middleware/auth');

// GET /translations/:languageId — Full translation map
router.get('/:languageId', async (req, res) => {
  try {
    const translations = await prisma.translation.findMany({
      where: { languageId: req.params.languageId },
    });

    // Group by namespace
    const grouped = {};
    translations.forEach(t => {
      if (!grouped[t.namespace]) grouped[t.namespace] = {};
      grouped[t.namespace][t.key] = t.value;
    });

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch translations' } });
  }
});

// GET /translations/:languageId/:namespace — Namespace-specific
router.get('/:languageId/:namespace', async (req, res) => {
  try {
    const translations = await prisma.translation.findMany({
      where: { languageId: req.params.languageId, namespace: req.params.namespace },
    });
    const map = {};
    translations.forEach(t => { map[t.key] = t.value; });
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch translations' } });
  }
});

// POST /translations — Create/update translation (admin)
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { languageId, namespace, key, value, isRTL } = req.body;
    const translation = await prisma.translation.upsert({
      where: { languageId_namespace_key: { languageId, namespace, key } },
      update: { value, isRTL },
      create: { languageId, namespace, key, value, isRTL: isRTL || false },
    });
    res.json(translation);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to save translation' } });
  }
});

// POST /translations/bulk-import — Bulk import (admin)
router.post('/bulk-import', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { languageId, namespace, translations } = req.body;
    const results = [];
    for (const [key, value] of Object.entries(translations)) {
      const t = await prisma.translation.upsert({
        where: { languageId_namespace_key: { languageId, namespace, key } },
        update: { value },
        create: { languageId, namespace, key, value },
      });
      results.push(t);
    }
    res.json({ imported: results.length });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to import translations' } });
  }
});

// GET /translations/export/:langId — Export as JSON (admin)
router.get('/export/:langId', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const translations = await prisma.translation.findMany({
      where: { languageId: req.params.langId },
    });
    const grouped = {};
    translations.forEach(t => {
      if (!grouped[t.namespace]) grouped[t.namespace] = {};
      grouped[t.namespace][t.key] = t.value;
    });
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to export translations' } });
  }
});

module.exports = router;
