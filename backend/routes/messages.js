import express from 'express';
import jwt from 'jsonwebtoken';
import { Message, Match, User } from '../database.js';

const router = express.Router();

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.id;

    // Touch lastActive to keep online status fresh (non-blocking)
    User.updateOne({ _id: decoded.id }, { lastActive: new Date() }).catch(err => console.error('Error updating lastActive', err));

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireCompleteProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const hasNickname = !!user.nickname;
    const hasPhoto = user.photos && user.photos.length > 0;

    if (!hasNickname || !hasPhoto) {
      return res.status(403).json({ error: 'Please complete your profile (add a nickname and at least one photo) before using messaging features.' });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Send message
router.post('/:matchId', verifyToken, requireCompleteProfile, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const match = await Match.findOne({ _id: req.params.matchId });
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const receiverId = String(match.user1) === req.userId ? match.user2 : match.user1;

    // Check two-free-message limit per conversation
    const user = await User.findById(req.userId);
    const allMessagesForMatch = await Message.find({ matchId: req.params.matchId });
    const sentByUserCount = allMessagesForMatch.filter(m => String(m.senderId) === req.userId).length;

    // Allow send if user has subscription, has unlocked this match, or is within the free 2 messages
    const unlockedThisMatch = user?.unlockedMatches?.includes(req.params.matchId);
    if (!(user?.subscriptionActive || user?.messagesUnlocked || unlockedThisMatch || sentByUserCount < 2)) {
      // Create a pending payment record (default to premium subscription) and return a checkout URL so the frontend can redirect immediately
      try {
        const payment = await (await import('../database.js')).Payment.create({
          userId: req.userId,
          planId: 'premium',
          amount: 4999,
          currency: 'USD',
          status: 'pending',
          matchId: req.params.matchId
        });

        const checkoutUrl = `${process.env.FRONTEND_URL}/payments?sessionId=${payment._id}&matchId=${req.params.matchId}`;

        return res.status(402).json({
          error: 'Message limit reached',
          paymentRequired: true,
          message: 'You have used your two free messages for this conversation. Please subscribe to continue.',
          checkoutUrl,
          paymentId: payment._id
        });
      } catch (err) {
        console.error('Error creating pending payment for message limit:', err.message || err);
        const checkoutUrl = `${process.env.FRONTEND_URL}/payments?matchId=${req.params.matchId}&plan=premium`;
        return res.status(402).json({ error: 'Message limit reached', paymentRequired: true, message: 'You have used your two free messages for this conversation. Please subscribe to continue.', checkoutUrl });
      }
    }

    const newMessage = await Message.create({
      matchId: req.params.matchId,
      senderId: req.userId,
      receiverId,
      message: message.trim(),
      read: false,
      readAt: null,
      createdAt: new Date()
    });

    res.status(201).json({
      message: 'Message sent',
      data: newMessage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a match
router.get('/:matchId', verifyToken, async (req, res) => {
  try {
    const match = await Match.findOne({ _id: req.params.matchId });
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const msgs = await Message.find({ matchId: req.params.matchId });

    // Mark as read
    msgs.forEach(msg => {
      if (String(msg.receiverId) === req.userId && !msg.read) {
        msg.read = true;
        msg.readAt = new Date();
        // Persist change
        msg.save().catch(err => console.error('Error saving message read status', err));
      }
    });

    res.json(msgs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark messages as read
router.put('/:matchId/read', verifyToken, async (req, res) => {
  try {
    await Message.updateMany({ matchId: req.params.matchId, receiverId: req.userId, read: false }, { read: true, readAt: new Date() });

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread count
router.get('/unread/count', verifyToken, async (req, res) => {
  try {
    const msgs = await Message.find({});
    const unreadCount = msgs.filter(m => String(m.receiverId) === req.userId && !m.read).length;

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all conversations for a user
router.get('/conversations', verifyToken, requireCompleteProfile, async (req, res) => {
  try {
    const { Match, User } = await import('../database.js');
    
    // Get all matches for this user
    const allMatches = await Match.find({});
    const userMatches = allMatches.filter(m => 
      m.status === 'matched' && (String(m.user1) === req.userId || String(m.user2) === req.userId)
    );

    // Get last message for each match
    const conversations = await Promise.all(userMatches.map(async (match) => {
      const otherUserId = String(match.user1) === req.userId ? match.user2 : match.user1;
      const otherUser = await User.findById(otherUserId);
      
      const messages = await Message.find({ matchId: match._id });
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      
      const unreadCount = messages.filter(m => 
        String(m.receiverId) === req.userId && !m.read
      ).length;

      const userObj = otherUser ? otherUser.toJSON() : null;
      if (userObj) {
        const FIVE_MIN = 5 * 60 * 1000;
        const lastActive = userObj.lastActive ? new Date(userObj.lastActive).getTime() : 0;
        userObj.isOnline = !!(userObj.active && lastActive && (Date.now() - lastActive) < FIVE_MIN);
      }

      return {
        _id: match._id,
        user: userObj,
        lastMessage: lastMessage ? {
          message: lastMessage.message,
          createdAt: lastMessage.createdAt,
          senderId: lastMessage.senderId
        } : null,
        unreadCount
      };
    }));

    // Sort by last message date
    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
