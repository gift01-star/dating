import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../database.js';

const router = express.Router();

// Middleware to verify token
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

// Get user profile
router.get('/profile/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, gender, university, course, year, interests, bio, profileImage } = req.body;

    const user = await User.updateOne(
      { _id: req.userId },
      {
        name: name || undefined,
        gender,
        university,
        course,
        year,
        interests,
        bio,
        profileImage,
        updatedAt: new Date()
      }
    );
    

    res.json({ message: 'Profile updated', user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get users for matching (with filters)
router.get('/discover', verifyToken, async (req, res) => {
  try {
    const { gender, university, minAge, maxAge, page = 1 } = req.query;

    const currentUser = await User.findById(req.userId);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    let allUsers = await User.find({});
    
    // Filter users
    let filteredUsers = allUsers.filter(u => {
      if (u._id === req.userId) return false;
      if (currentUser.blocked && currentUser.blocked.includes(u._id)) return false;
      if (gender && u.gender !== gender) return false;
      if (university && u.university !== university) return false;
      return true;
    });

    const pageNum = parseInt(page) || 1;
    const limit = 20;
    const start = (pageNum - 1) * limit;
    const users = filteredUsers.slice(start, start + limit).map(u => u.toJSON());

    res.json({
      users,
      pagination: {
        current: pageNum,
        total: Math.ceil(filteredUsers.length / limit),
        count: users.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Block user
router.post('/block/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (!user.blocked) user.blocked = [];
    if (!user.blocked.includes(req.params.id)) {
      user.blocked.push(req.params.id);
    }
    
    await User.updateOne({ _id: req.userId }, { blocked: user.blocked });

    res.json({ message: 'User blocked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unblock user
router.post('/unblock/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.blocked = (user.blocked || []).filter(id => id !== req.params.id);
    
    await User.updateOne({ _id: req.userId }, { blocked: user.blocked });

    res.json({ message: 'User unblocked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
