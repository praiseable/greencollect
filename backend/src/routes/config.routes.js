/**
 * Config routes — app version for force-update (Kabariya spec 2.4)
 * GET /api/config/app-version?platform=android|ios
 */

const router = require('express').Router();
const prisma = require('../services/prisma');
const { success, error } = require('../utils/apiResponse');

const DEFAULT_VERSION = { minVersion: '1.0.0', latestVersion: '1.0.0', forceUpdate: false };

async function getAppVersion(platform) {
  const key = platform === 'ios' ? 'app_version_ios' : 'app_version_android';
  const row = await prisma.platformConfig.findUnique({ where: { key } });
  if (!row || !row.value) return DEFAULT_VERSION;
  try {
    return JSON.parse(row.value);
  } catch (_) {
    return DEFAULT_VERSION;
  }
}

// GET /config/app-version?platform=android|ios
router.get('/app-version', async (req, res) => {
  try {
    const platform = (req.query.platform || 'android').toLowerCase();
    if (platform !== 'android' && platform !== 'ios') {
      return res.status(400).json(error('Invalid platform. Use android or ios.', 'VALIDATION_ERROR'));
    }
    const version = await getAppVersion(platform);
    return res.json(success(version));
  } catch (err) {
    console.error('App version config error:', err);
    return res.status(500).json(error('Failed to get app version', 'INTERNAL_ERROR'));
  }
});

module.exports = router;
