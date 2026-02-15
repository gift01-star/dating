import express from 'express';
import jwt from 'jsonwebtoken';
import { Match, User } from '../database.js';

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

// Require minimum 50% profile completion before accessing certain features
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

// Like a user
router.post('/like/:userId', verifyToken, requireMinimumProfile, async (req, res) => {
  try {
    const targetUserId = req.params.userId;

    // Check if already matched or liked
    let match = await Match.findOne({
      user1: req.userId,
      user2: targetUserId
    });

    if (!match) {
      match = await Match.findOne({
        user1: targetUserId,
        user2: req.userId
      });
    }

    if (match) {
      return res.status(400).json({ error: 'Already matched or liked' });
    }

    // Create like
    match = await Match.create({
      user1: req.userId,
      user2: targetUserId,
      status: 'pending'
    });

    // Check if target user already liked current user
    const reverseMatch = await Match.findOne({
      user1: targetUserId,
      user2: req.userId
    });

    if (reverseMatch && reverseMatch.status === 'pending') {
      // Mutual like = Match!
      await Match.findOneAndUpdate({ _id: reverseMatch._id }, { status: 'matched', matchedAt: new Date() });
      await Match.findOneAndUpdate({ _id: match._id }, { status: 'matched', matchedAt: new Date() });

      const updatedMatch = await Match.findOne({ _id: match._id });

      return res.status(201).json({
        message: 'It\'s a match!',
        match: updatedMatch.toJSON()
      });
    }

    res.status(201).json({
      message: 'Like sent',
      match: match.toJSON()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pass on a user
router.post('/pass/:userId', verifyToken, async (req, res) => {
  try {
    const match = await Match.create({
      user1: req.userId,
      user2: req.params.userId,
      status: 'rejected'
    });

    res.json({ message: 'Passed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all likes received (must come before /:id to match correctly)
router.get('/likes', verifyToken, requireMinimumProfile, async (req, res) => {
  try {
    const allMatches = await Match.find({});
    
    const likesReceived = allMatches.filter(m => {
      return m.status === 'pending' && String(m.user2) === String(req.userId);
    });

    const likesWithUsers = await Promise.all(likesReceived.map(async (like) => {
      try {
        const user = await User.findById(like.user1);
        const userObj = user ? user.toJSON() : null;

        // Compute online status: active flag + recent activity within 5 minutes
        if (userObj) {
          const FIVE_MIN = 5 * 60 * 1000;
          const lastActive = userObj.lastActive ? new Date(userObj.lastActive).getTime() : 0;
          userObj.isOnline = !!(userObj.active && lastActive && (Date.now() - lastActive) < FIVE_MIN);
        }

        return {
          ...like.toJSON(),
          user: userObj
        };
      } catch (err) {
        console.error('Error processing like:', err);
        return null;
      }
    })).then(results => results.filter(Boolean));

    // Sort by online status first, then by most recent likes
    const sorted = likesWithUsers.sort((a, b) => {
      if (a.user?.isOnline && !b.user?.isOnline) return -1;
      if (!a.user?.isOnline && b.user?.isOnline) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({ likes: sorted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get matches
router.get('/', verifyToken, async (req, res) => {
  try {
    const allMatches = await Match.find({});

    // Include matches that are matched or have messages (so users see active conversations)
    const candidateMatches = await Promise.all(allMatches.map(async (m) => {
      if (!(String(m.user1) === req.userId || String(m.user2) === req.userId)) return null;

      const Message = (await import('../database.js')).Message;
      const messages = await Message.find({ matchId: m._id });

      if (m.status === 'matched' || (messages && messages.length > 0)) {
        return { match: m, messages };
      }
      return null;
    }));

    const userMatches = candidateMatches.filter(Boolean);

    const formattedMatches = userMatches.map(async ({ match, messages }) => {
      const otherUserId = String(match.user1) === req.userId ? match.user2 : match.user1;
      const otherUser = await User.findById(otherUserId);

      const userObj = otherUser ? otherUser.toJSON() : { _id: otherUserId };

      // Compute online status: active flag + recent activity within 5 minutes
      const FIVE_MIN = 5 * 60 * 1000;
      const lastActive = userObj.lastActive ? new Date(userObj.lastActive).getTime() : 0;
      userObj.isOnline = !!(userObj.active && lastActive && (Date.now() - lastActive) < FIVE_MIN);

      // Use matchedAt when available, otherwise fall back to last message or createdAt
      const sortAt = match.matchedAt || (messages && messages.length > 0 ? messages[messages.length - 1].createdAt : match.createdAt);

      return {
        _id: match._id,
        user: userObj,
        matchedAt: sortAt
      };
    });

    const result = await Promise.all(formattedMatches);
    // Sort by online status first (active users appear first), then by most recent
    res.json(result.sort((a, b) => {
      // Prioritize online users
      if (a.user.isOnline && !b.user.isOnline) return -1;
      if (!a.user.isOnline && b.user.isOnline) return 1;
      // Then sort by most recent
      return new Date(b.matchedAt) - new Date(a.matchedAt);
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get match by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const match = await Match.findOne({ _id: req.params.id });

    if (!match) return res.status(404).json({ error: 'Match not found' });

    const user1 = await User.findById(match.user1);
    const user2 = await User.findById(match.user2);

    // Helper function to compute online status
    const getOnlineStatus = (userObj) => {
      if (!userObj) return false;
      const FIVE_MIN = 5 * 60 * 1000;
      const lastActive = userObj.lastActive ? new Date(userObj.lastActive).getTime() : 0;
      return !!(userObj.active && lastActive && (Date.now() - lastActive) < FIVE_MIN);
    };

    const user1Obj = user1 ? user1.toJSON() : { _id: match.user1 };
    const user2Obj = user2 ? user2.toJSON() : { _id: match.user2 };

    if (user1Obj && Object.keys(user1Obj).length > 1) {
      user1Obj.isOnline = getOnlineStatus(user1);
    }
    if (user2Obj && Object.keys(user2Obj).length > 1) {
      user2Obj.isOnline = getOnlineStatus(user2);
    }

    res.json({
      ...match.toJSON(),
      user1: user1Obj,
      user2: user2Obj
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like back (mutual match)
router.post('/like-back/:matchId', verifyToken, requireMinimumProfile, async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);
    
    if (!match) {
      return res.status(404).json({ error: 'Like not found' });
    }

    if (String(match.user2) !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Match.findOneAndUpdate({ _id: match._id }, { status: 'matched', matchedAt: new Date() });
    const updated = await Match.findOne({ _id: match._id });

    res.json({ message: 'It\'s a match!', match: updated.toJSON() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pass on a like
router.post('/pass-like/:matchId', verifyToken, requireMinimumProfile, async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);
    
    if (!match) {
      return res.status(404).json({ error: 'Like not found' });
    }

    if (String(match.user2) !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Match.findOneAndUpdate({ _id: match._id }, { status: 'rejected' });

    res.json({ message: 'Passed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
