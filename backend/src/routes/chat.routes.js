const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate } = require('../middleware/auth');

// GET /chat/conversations — List conversations
router.get('/conversations', authenticate, async (req, res) => {
  try {
    // Get distinct conversation partners
    const sent = await prisma.chatMessage.findMany({
      where: { fromUserId: req.user.id },
      distinct: ['toUserId'],
      orderBy: { createdAt: 'desc' },
      include: { toUser: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });
    const received = await prisma.chatMessage.findMany({
      where: { toUserId: req.user.id },
      distinct: ['fromUserId'],
      orderBy: { createdAt: 'desc' },
      include: { fromUser: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });

    // Merge unique conversations
    const partnerMap = new Map();
    sent.forEach(m => partnerMap.set(m.toUserId, { user: m.toUser, lastMessage: m.message, lastAt: m.createdAt }));
    received.forEach(m => {
      const existing = partnerMap.get(m.fromUserId);
      if (!existing || m.createdAt > existing.lastAt) {
        partnerMap.set(m.fromUserId, { user: m.fromUser, lastMessage: m.message, lastAt: m.createdAt });
      }
    });

    const conversations = Array.from(partnerMap.entries()).map(([userId, data]) => ({
      userId,
      ...data,
    })).sort((a, b) => b.lastAt - a.lastAt);

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch conversations' } });
  }
});

// GET /chat/:userId — Messages with specific user
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { fromUserId: req.user.id, toUserId: req.params.userId },
          { fromUserId: req.params.userId, toUserId: req.user.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });

    // Mark messages as read
    await prisma.chatMessage.updateMany({
      where: { fromUserId: req.params.userId, toUserId: req.user.id, isRead: false },
      data: { isRead: true },
    });

    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch messages' } });
  }
});

// POST /chat/:userId — Send message
router.post('/:userId', authenticate, async (req, res) => {
  try {
    const { message } = req.body;
    const msg = await prisma.chatMessage.create({
      data: { fromUserId: req.user.id, toUserId: req.params.userId, message },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: req.params.userId,
        type: 'CHAT_MESSAGE',
        title: `Message from ${req.user.firstName}`,
        body: message.substring(0, 100),
        data: { fromUserId: req.user.id },
      },
    });

    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to send message' } });
  }
});

module.exports = router;
