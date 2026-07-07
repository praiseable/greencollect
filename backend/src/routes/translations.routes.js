const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate, authorize } = require('../middleware/auth');

function groupTranslations(rows) {
  const grouped = {};
  rows.forEach((t) => {
    if (!grouped[t.namespace]) grouped[t.namespace] = {};
    grouped[t.namespace][t.key] = t.value;
  });
  return grouped;
}

function rowsToMap(rows) {
  const map = {};
  rows.forEach((t) => { map[t.key] = t.value; });
  return map;
}

async function getLanguageOrFallback(languageId) {
  const [requested, fallback] = await Promise.all([
    prisma.language.findUnique({ where: { id: languageId } }),
    prisma.language.findUnique({ where: { id: 'en' } }),
  ]);
  return requested || fallback;
}

// GET /translations/export/:langId — Export as JSON (admin)
// Keep this before /:languageId dynamic routes.
router.get('/export/:langId', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const translations = await prisma.translation.findMany({
      where: { languageId: req.params.langId },
      orderBy: [{ namespace: 'asc' }, { key: 'asc' }],
    });
    res.json(groupTranslations(translations));
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to export translations' } });
  }
});

// GET /translations/:languageId — Full translation map with English fallback.
router.get('/:languageId', async (req, res) => {
  try {
    const language = await getLanguageOrFallback(req.params.languageId);
    if (!language) return res.status(404).json({ error: { message: 'Language not found', code: 'NOT_FOUND' } });

    const [fallbackRows, requestedRows] = await Promise.all([
      prisma.translation.findMany({ where: { languageId: 'en' } }),
      prisma.translation.findMany({ where: { languageId: language.id } }),
    ]);

    const fallback = groupTranslations(fallbackRows);
    const requested = groupTranslations(requestedRows);
    const merged = { ...fallback };
    for (const [namespace, entries] of Object.entries(requested)) {
      merged[namespace] = { ...(merged[namespace] || {}), ...entries };
    }

    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch translations' } });
  }
});

// GET /translations/:languageId/:namespace — Namespace-specific with English fallback.
router.get('/:languageId/:namespace', async (req, res) => {
  try {
    const language = await getLanguageOrFallback(req.params.languageId);
    if (!language) return res.status(404).json({ error: { message: 'Language not found', code: 'NOT_FOUND' } });

    const [fallbackRows, requestedRows] = await Promise.all([
      prisma.translation.findMany({ where: { languageId: 'en', namespace: req.params.namespace } }),
      prisma.translation.findMany({ where: { languageId: language.id, namespace: req.params.namespace } }),
    ]);

    res.json({ ...rowsToMap(fallbackRows), ...rowsToMap(requestedRows) });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch translations' } });
  }
});

// POST /translations — Create/update translation (admin)
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { languageId, namespace, key, value, isRTL } = req.body;
    if (!languageId || !namespace || !key || typeof value !== 'string') {
      return res.status(400).json({ error: { message: 'languageId, namespace, key and string value are required', code: 'VALIDATION_ERROR' } });
    }
    const translation = await prisma.translation.upsert({
      where: { languageId_namespace_key: { languageId, namespace, key } },
      update: { value, isRTL: Boolean(isRTL) },
      create: { languageId, namespace, key, value, isRTL: Boolean(isRTL) },
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
    if (!languageId || !namespace || !translations || typeof translations !== 'object') {
      return res.status(400).json({ error: { message: 'languageId, namespace and translations object are required', code: 'VALIDATION_ERROR' } });
    }
    const results = [];
    for (const [key, value] of Object.entries(translations)) {
      const t = await prisma.translation.upsert({
        where: { languageId_namespace_key: { languageId, namespace, key } },
        update: { value: String(value) },
        create: { languageId, namespace, key, value: String(value) },
      });
      results.push(t);
    }
    res.json({ imported: results.length });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to import translations' } });
  }
});

module.exports = router;
