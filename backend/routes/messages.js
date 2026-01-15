import express from 'express';
import jwt from 'jsonwebtoken';
import { Message, Match } from '../database.js';

const router = express.Router();

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
      message: message.trim()
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

export default router;
