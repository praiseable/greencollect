const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate } = require('../middleware/auth');
const { enrichNotification, getNotificationCatalog } = require('../services/notificationCatalog.service');

// GET /notifications/catalog — supported event catalog + deep-link contract
router.get('/catalog', authenticate, (req, res) => {
  res.json({ success: true, data: getNotificationCatalog() });
});

// GET /notifications/unread-count — spec 2.9
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to get unread count' } });
  }
});

// GET /notifications — User's notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const where = { userId: req.user.id };
    if (unreadOnly === 'true') where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
    ]);

    res.json({
      data: notifications.map(enrichNotification),
      total,
      unreadCount,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit || 20)),
    });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch notifications' } });
  }
});

// Mark single as read (PUT and PATCH so app PATCH calls succeed)
const markOneRead = async (req, res) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ error: { message: 'Notification not found', code: 'NOTIFICATION_NOT_FOUND' } });
    }

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } });

    res.json({ success: true, message: 'Marked as read', data: enrichNotification(updated), unreadCount });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to mark as read' } });
  }
};
router.put('/:id/read', authenticate, markOneRead);
router.patch('/:id/read', authenticate, markOneRead);

// Mark all as read (PUT and PATCH)
const markAllRead = async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
    res.json({ success: true, message: 'All marked as read', updatedCount: result.count, unreadCount: 0 });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to mark all as read' } });
  }
};
router.put('/read-all', authenticate, markAllRead);
router.patch('/read-all', authenticate, markAllRead);

module.exports = router;
