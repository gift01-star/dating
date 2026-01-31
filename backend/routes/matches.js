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

// Require a minimal profile completion before accessing certain features
const requireCompleteProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const hasNickname = !!user.nickname;
    const hasPhoto = user.photos && user.photos.length > 0;

    if (!hasNickname || !hasPhoto) {
      return res.status(403).json({ error: 'Please complete your profile (add a nickname and at least one photo) before using this feature.' });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Like a user
router.post('/like/:userId', verifyToken, requireCompleteProfile, async (req, res) => {
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

// Get matches
router.get('/', verifyToken, async (req, res) => {
  try {
    const allMatches = await Match.find({});
    
    const userMatches = allMatches.filter(m => {
      // Compare as strings to handle ObjectId vs string mismatch
      return m.status === 'matched' && (String(m.user1) === req.userId || String(m.user2) === req.userId);
    });

    const formattedMatches = userMatches.map(async (match) => {
      const otherUserId = String(match.user1) === req.userId ? match.user2 : match.user1;
      const otherUser = await User.findById(otherUserId);

      const userObj = otherUser ? otherUser.toJSON() : { _id: otherUserId };

      // Compute online status: active flag + recent activity within 5 minutes
      const FIVE_MIN = 5 * 60 * 1000;
      const lastActive = userObj.lastActive ? new Date(userObj.lastActive).getTime() : 0;
      userObj.isOnline = !!(userObj.active && lastActive && (Date.now() - lastActive) < FIVE_MIN);

      return {
        _id: match._id,
        user: userObj,
        matchedAt: match.matchedAt
      };
    });

    const result = await Promise.all(formattedMatches);
    res.json(result.sort((a, b) => new Date(b.matchedAt) - new Date(a.matchedAt)));
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

    res.json({
      ...match.toJSON(),
      user1: user1 ? user1.toJSON() : { _id: match.user1 },
      user2: user2 ? user2.toJSON() : { _id: match.user2 }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all likes received
router.get('/likes', verifyToken, async (req, res) => {
  try {
    const allMatches = await Match.find({});
    
    const likesReceived = allMatches.filter(m => {
      return m.status === 'pending' && String(m.user2) === req.userId;
    });

    const likesWithUsers = await Promise.all(likesReceived.map(async (like) => {
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
    }));

    res.json({ likes: likesWithUsers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like back (mutual match)
router.post('/like-back/:matchId', verifyToken, requireCompleteProfile, async (req, res) => {
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
router.post('/pass-like/:matchId', verifyToken, requireCompleteProfile, async (req, res) => {
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
