import express from 'express';
import jwt from 'jsonwebtoken';
import { Message, Match, User } from '../database.js';

const router = express.Router();

// Normalize message rows (DB may return snake_case keys)
function normalizeMsg(m) {
  if (!m) return m;
  return {
    _id: m._id || m.id || m._id,
    matchId: m.matchId || m.match_id || m.matchId,
    senderId: m.senderId || m.sender_id || m.senderId,
    receiverId: m.receiverId || m.receiver_id || m.receiverId,
    message: m.message,
    read: m.read,
    readAt: m.readAt || m.read_at || null,
    createdAt: m.createdAt || m.created_at || m.createdAt
  };
}

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

const requireMinimumProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Must have at least 50% profile completion
    if ((user.profileCompletion || 0) < 50) {
      return res.status(403).json({ 
        error: 'Please complete at least 50% of your profile before using this feature.',
        profileCompletion: user.profileCompletion || 0,
        required: 50
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// === SPECIFIC ROUTES (must come FIRST before /:matchId pattern routes) ===

// Get all conversations for a user
router.get('/conversations', verifyToken, requireMinimumProfile, async (req, res) => {
  try {
    const { Match, User } = await import('../database.js');
    
    // Get all matches for this user and include any match that has messages (so ongoing conversations show even if not 'matched')
    const allMatches = await Match.find({});
    const candidateMatches = await Promise.all(allMatches.map(async (m) => {
      // Skip matches not involving the user
      if (!(String(m.user1) === req.userId || String(m.user2) === req.userId)) return null;

      // See if there are messages for this match
      const rawMsgs = await Message.find({ matchId: m._id });
      const msgs = Array.isArray(rawMsgs) ? rawMsgs.map(normalizeMsg) : rawMsgs;

      // Include if matched or there are any messages
      if (m.status === 'matched' || (msgs && msgs.length > 0)) {
        return { match: m, msgs };
      }

      return null;
    }));

    const userMatches = candidateMatches.filter(Boolean);

    // Get last message for each match (use already fetched msgs when available)
    const conversations = await Promise.all(userMatches.map(async ({ match, msgs }) => {
      const otherUserId = String(match.user1) === req.userId ? match.user2 : match.user1;
      const otherUser = await User.findById(otherUserId);

      const messages = msgs || (await (async () => (await Message.find({ matchId: match._id })).map(normalizeMsg))());
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

      const unreadCount = messages.filter(m => String(m.receiverId) === req.userId && !m.read).length;

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

    // Sort by online status first, then by last message date
    conversations.sort((a, b) => {
      // Prioritize online users
      if (a.user?.isOnline && !b.user?.isOnline) return -1;
      if (!a.user?.isOnline && b.user?.isOnline) return 1;
      // Then sort by most recent message
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread count per conversation
router.get('/unread/conversations', verifyToken, async (req, res) => {
  try {
    const msgs = await Message.find({});
    const conversationUnread = {};
    
    // Group unread messages by matchId
    msgs.forEach(m => {
      if (String(m.receiverId) === String(req.userId) && !m.read) {
        const matchId = String(m.matchId);
        conversationUnread[matchId] = (conversationUnread[matchId] || 0) + 1;
      }
    });
    
    res.json(conversationUnread);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get total unread count
router.get('/unread/count', verifyToken, async (req, res) => {
  try {
    const msgs = await Message.find({});
    const unreadCount = msgs.filter(m => String(m.receiverId) === req.userId && !m.read).length;

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark messages as read for a specific conversation
router.post('/mark-read/:matchId', verifyToken, async (req, res) => {
  try {
    const { matchId } = req.params;
    
    // Only mark messages where current user is the receiver and from this specific conversation
    await Message.updateMany(
      { matchId, receiverId: req.userId, read: false },
      { read: true, readAt: new Date() }
    );
    
    res.json({ message: 'Messages in conversation marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all unread messages for current user as read (fallback)
router.post('/mark-all-read', verifyToken, async (req, res) => {
  try {
    await Message.updateMany({ receiverId: req.userId, read: false }, { read: true, readAt: new Date() });
    res.json({ message: 'All messages marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === PATTERN-BASED ROUTES (/:matchId routes) ===

// Send message
router.post('/:matchId', verifyToken, requireMinimumProfile, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    console.log('[Messages] Sending message for matchId:', req.params.matchId, 'from userId:', req.userId);

    const match = await Match.findOne({ _id: req.params.matchId });
    if (!match) {
      console.log('[Messages] Match not found:', req.params.matchId);
      return res.status(404).json({ error: 'Match not found' });
    }

    console.log('[Messages] Found match. User1:', match.user1, 'User2:', match.user2, 'Status:', match.status);

    const receiverId = String(match.user1) === req.userId ? match.user2 : match.user1;

    // Prevent messaging if either user has blocked the other
    const receiverUser = await User.findById(receiverId);
    const senderUser = await User.findById(req.userId);

    if (!receiverUser) {
      console.log('[Messages] Receiver user not found:', receiverId);
      return res.status(404).json({ error: 'Receiver user not found' });
    }

    if (!senderUser) {
      console.log('[Messages] Sender user not found:', req.userId);
      return res.status(404).json({ error: 'Sender user not found' });
    }

    if (receiverUser?.blocked && receiverUser.blocked.includes(req.userId)) {
      console.log('[Messages] Receiver has blocked sender');
      return res.status(403).json({ error: 'You cannot send messages to this user (they have blocked you).' });
    }

    if (senderUser?.blocked && senderUser.blocked.includes(String(receiverId))) {
      console.log('[Messages] Sender has blocked receiver');
      return res.status(403).json({ error: 'You cannot message a user you have blocked. Unblock them first to continue.' });
    }

    // Messaging is unlimited — no payment required anymore
    // (Legacy fields like subscription/messagesUnlocked/unlockedMatches are ignored)
    // We still record the message below as usual.

    const newMessageRaw = await Message.create({
      matchId: req.params.matchId,
      senderId: req.userId,
      receiverId,
      message: message.trim(),
      read: false,
      readAt: null,
      createdAt: new Date()
    });

    const newMessage = normalizeMsg(newMessageRaw);
    console.log('[Messages] Message created successfully:', newMessage._id);

    res.status(201).json({
      message: 'Message sent',
      data: newMessage
    });
  } catch (error) {
    console.error('[Messages] Error sending message:', error.message || error);
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a match
router.get('/:matchId', verifyToken, async (req, res) => {
  try {
    console.log('[Messages] Fetching messages for matchId:', req.params.matchId, 'userId:', req.userId);
    
    const match = await Match.findOne({ _id: req.params.matchId });
    if (!match) {
      console.log('[Messages] Match not found:', req.params.matchId);
      return res.status(404).json({ error: 'Match not found' });
    }

    // Verify user is part of this match
    if (String(match.user1) !== req.userId && String(match.user2) !== req.userId) {
      console.log('[Messages] User not part of this match. User:', req.userId, 'Match users:', match.user1, match.user2);
      return res.status(403).json({ error: 'You are not part of this match' });
    }

    const rawMsgs = await Message.find({ matchId: req.params.matchId });
    const msgs = Array.isArray(rawMsgs) ? rawMsgs.map(normalizeMsg) : rawMsgs;
    console.log('[Messages] Found', msgs.length, 'messages');

    // Mark as read (persist using updateOne for in-memory DB compatibility)
    for (const msg of msgs) {
      if (String(msg.receiverId) === req.userId && !msg.read) {
        msg.read = true;
        msg.readAt = new Date();
        // Persist change (use updateOne to work with both mongoose and in-memory DB)
        try {
          await Message.updateOne({ _id: msg._id }, { read: true, readAt: msg.readAt });
        } catch (err) {
          console.error('Error updating message read status', err);
        }
      }
    }

    res.json(msgs);
  } catch (error) {
    console.error('[Messages] Error fetching messages:', error);
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

export default router;
