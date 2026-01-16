import express from 'express';
import jwt from 'jsonwebtoken';
import { Message, Match } from '../database.js';

const router = express.Router();

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Send message
router.post('/:matchId', verifyToken, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const match = await Match.findOne({ _id: req.params.matchId });
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const receiverId = match.user1 === req.userId ? match.user2 : match.user1;

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
      if (msg.receiverId === req.userId && !msg.read) {
        msg.read = true;
        msg.readAt = new Date();
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
    const messages = await Message.find({ matchId: req.params.matchId, receiverId: req.userId });
    
    messages.forEach(msg => {
      msg.read = true;
      msg.readAt = new Date();
    });

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread count
router.get('/unread/count', verifyToken, async (req, res) => {
  try {
    const msgs = await Message.find({});
    const unreadCount = msgs.filter(m => m.receiverId === req.userId && !m.read).length;

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all conversations for a user
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const { Match, User } = await import('../database.js');
    
    // Get all matches for this user
    const allMatches = await Match.find({});
    const userMatches = allMatches.filter(m => 
      m.status === 'matched' && (m.user1 === req.userId || m.user2 === req.userId)
    );

    // Get last message for each match
    const conversations = await Promise.all(userMatches.map(async (match) => {
      const otherUserId = match.user1 === req.userId ? match.user2 : match.user1;
      const otherUser = await User.findById(otherUserId);
      
      const messages = await Message.find({ matchId: match._id });
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      
      const unreadCount = messages.filter(m => 
        m.receiverId === req.userId && !m.read
      ).length;

      return {
        _id: match._id,
        user: otherUser ? otherUser.toJSON() : null,
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
