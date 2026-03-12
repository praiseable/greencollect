const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate } = require('../middleware/auth');

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

    res.json({ data: notifications, total, unreadCount, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch notifications' } });
  }
});

// Mark single as read (PUT and PATCH so app PATCH calls succeed)
const markOneRead = async (req, res) => {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to mark as read' } });
  }
};
router.put('/:id/read', authenticate, markOneRead);
router.patch('/:id/read', authenticate, markOneRead);

// Mark all as read (PUT and PATCH)
const markAllRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to mark all as read' } });
  }
};
router.put('/read-all', authenticate, markAllRead);
router.patch('/read-all', authenticate, markAllRead);

module.exports = router;
