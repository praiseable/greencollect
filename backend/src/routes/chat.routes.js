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
      include: { toUser: { select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true } } },
    });
    const received = await prisma.chatMessage.findMany({
      where: { toUserId: req.user.id },
      distinct: ['fromUserId'],
      orderBy: { createdAt: 'desc' },
      include: { fromUser: { select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true } } },
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

    const conversations = Array.from(partnerMap.entries()).map(([userId, data]) => {
      const u = data.user;
      const name = u ? [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.displayName || 'User' : 'User';
      return {
        userId,
        otherUserId: userId,
        ...data,
        name,
        updatedAt: data.lastAt,
      };
    }).sort((a, b) => b.lastAt - a.lastAt);

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
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true, displayName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true, displayName: true } },
      },
    });

    const senderName = [req.user.firstName, req.user.lastName].filter(Boolean).join(' ').trim()
      || req.user.displayName || 'Someone';
    await prisma.notification.create({
      data: {
        userId: req.params.userId,
        type: 'CHAT_MESSAGE',
        title: `Message from ${senderName}`,
        body: message.substring(0, 100),
        data: { fromUserId: req.user.id, chatUserId: req.params.userId },
      },
    });

    // Emit socket events for real-time delivery
    const io = req.app.get('io');
    if (io) {
      // Emit to chat room (both users)
      const room = [req.user.id, req.params.userId].sort().join('-');
      io.to(`chat-${room}`).emit('new-message', {
        id: msg.id,
        fromUserId: msg.fromUserId,
        toUserId: msg.toUserId,
        message: msg.message,
        createdAt: msg.createdAt.toISOString(),
        isRead: msg.isRead,
      });

      // Emit notification to recipient's personal room
      io.to(`user-${req.params.userId}`).emit('notification', {
        type: 'CHAT_MESSAGE',
        title: `Message from ${senderName}`,
        body: message.substring(0, 100),
        data: { fromUserId: req.user.id, chatUserId: req.params.userId },
      });
    }

    res.status(201).json(msg);
  } catch (err) {
    console.error('POST /chat/:userId error:', err);
    res.status(500).json({ error: { message: 'Failed to send message' } });
  }
});

module.exports = router;
