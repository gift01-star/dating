import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../database.js';
import { calculateMatchScore, getRecommendedMatches, getMatchDetails } from '../utils/matchingAlgorithm.js';

const router = express.Router();

// Middleware to verify token
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
    const { nickname, name, gender, dob, location, height, bodyType, university, course, year, interests, bio, relationshipGoal } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Update fields
    if (nickname) user.nickname = nickname;
    if (name) user.name = name;
    if (gender) user.gender = gender;
    if (dob) user.dob = new Date(dob);
    if (location) user.location = location;
    if (height) user.height = parseInt(height);
    if (bodyType) user.bodyType = bodyType;
    if (university) user.university = university;
    if (course) user.course = course;
    if (year) user.year = year;
    if (interests) user.interests = interests;
    if (bio) user.bio = bio;
    if (relationshipGoal) user.relationshipGoal = relationshipGoal;

    user.updatedAt = new Date();

    await User.updateOne({ _id: req.userId }, {
      nickname: user.nickname,
      name: user.name,
      gender: user.gender,
      dob: user.dob,
      location: user.location,
      height: user.height,
      bodyType: user.bodyType,
      university: user.university,
      course: user.course,
      year: user.year,
      interests: user.interests,
      bio: user.bio,
      relationshipGoal: user.relationshipGoal,
      updatedAt: user.updatedAt
    });

    // Recalculate profileCompletion server-side for reliability
    const completionFields = [
      !!user.nickname,
      !!user.gender,
      !!user.dob,
      !!user.university,
      !!user.course,
      !!user.year,
      (user.interests && user.interests.length > 0),
      !!user.bio,
      !!user.location,
      (user.photos && user.photos.length > 0),
      !!user.relationshipGoal
    ];

    const completedCount = completionFields.filter(Boolean).length;
    const profilePercentage = Math.round((completedCount / completionFields.length) * 100);

    const prevCompletion = user.profileCompletion || 0;
    await User.updateOne({ _id: req.userId }, { profileCompletion: profilePercentage });

    // Log changes to profile completion
    if (profilePercentage !== prevCompletion) {
      console.info(`User ${req.userId} profile completion changed: ${prevCompletion}% -> ${profilePercentage}%`);
      if (profilePercentage >= 50 && prevCompletion < 100) {
        console.info(`User ${req.userId} has completed their profile (100%).`);
      }
    }

    // Return updated user
    const updatedUser = await User.findById(req.userId);

    res.json({ message: 'Profile updated', user: updatedUser.toJSON() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get users for matching (with filters)
router.get('/discover', verifyToken, async (req, res) => {
  try {
    const { gender, university, location, minAge, maxAge, minHeight, maxHeight, page = 1 } = req.query;

    const currentUser = await User.findById(req.userId);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    // Require minimum 50% profile completion before accessing discover
    if ((currentUser.profileCompletion || 0) < 50) {
      return res.status(403).json({ 
        error: 'Please complete at least 50% of your profile before discovering profiles.',
        profileCompletion: currentUser.profileCompletion || 0,
        required: 50
      });
    }

    let allUsers = await User.find({});
    
    // Filter users (default: only show users with a university — student-only platform)
    let filteredUsers = allUsers.filter(u => {
      // Compare as strings to handle ObjectId vs string mismatch
      if (String(u._id) === req.userId) return false;
      if (currentUser.blocked && currentUser.blocked.includes(u._id)) return false;
      // Only show profiles that have university set to keep the platform student-focused
      if (!u.university) return false;
      if (gender && u.gender !== gender) return false;
      if (university && u.university !== university) return false;
      if (location && u.location !== location) return false;
      if (minHeight && u.height && u.height < parseInt(minHeight)) return false;
      if (maxHeight && u.height && u.height > parseInt(maxHeight)) return false;
      // Relationship filter
      if (req.query.relationship && u.relationshipGoal !== req.query.relationship) return false;
      return true;
    });

    // Prefer users with the same relationship goal as the current user to surface relevant results
    if (currentUser.relationshipGoal) {
      filteredUsers.sort((a, b) => {
        const aMatch = a.relationshipGoal === currentUser.relationshipGoal ? 1 : 0;
        const bMatch = b.relationshipGoal === currentUser.relationshipGoal ? 1 : 0;
        return bMatch - aMatch; // put matching goals first
      });
    }

    const pageNum = parseInt(page) || 1;
    const limit = 20;
    const start = (pageNum - 1) * limit;
    const users = filteredUsers.slice(start, start + limit).map(u => {
      const userObj = u.toJSON();
      
      // Compute online status: active flag + recent activity within 5 minutes
      const FIVE_MIN = 5 * 60 * 1000;
      const lastActive = userObj.lastActive ? new Date(userObj.lastActive).getTime() : 0;
      userObj.isOnline = !!(userObj.active && lastActive && (Date.now() - lastActive) < FIVE_MIN);
      
      return userObj;
    });

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
    
    // Check if already blocked (compare as strings to handle ObjectId vs string)
    const alreadyBlocked = user.blocked.some(id => String(id) === String(req.params.id));
    if (!alreadyBlocked) {
      user.blocked.push(req.params.id);
    }
    
    await User.updateOne({ _id: req.userId }, { blocked: user.blocked });

    res.json({ message: 'User blocked', blocked: user.blocked });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload photo
router.post('/photos', verifyToken, async (req, res) => {
  try {
    const { photoUrl } = req.body;
    
    if (!photoUrl) {
      return res.status(400).json({ error: 'Photo URL is required' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.photos) user.photos = [];
    
    // Add new photo
    user.photos.push({
      url: photoUrl,
      publicId: `photo_${user._id}_${Date.now()}`,
      uploadedAt: new Date()
    });

    // Limit to 5 photos
    if (user.photos.length > 5) {
      user.photos = user.photos.slice(-5);
    }

    await User.updateOne({ _id: req.userId }, { photos: user.photos });

    // Update profileCompletion after photo change
    const completionFields = [
      !!user.nickname,
      !!user.gender,
      !!user.dob,
      !!user.university,
      !!user.course,
      !!user.year,
      (user.interests && user.interests.length > 0),
      !!user.bio,
      !!user.location,
      (user.photos && user.photos.length > 0),
      !!user.relationshipGoal
    ];
    const completedCount = completionFields.filter(Boolean).length;
    const profilePercentage = Math.round((completedCount / completionFields.length) * 100);
    await User.updateOne({ _id: req.userId }, { profileCompletion: profilePercentage });

    // Log profile completion change after photo upload
    const updatedUser = await User.findById(req.userId);
    if ((updatedUser.profileCompletion || 0) !== (user.profileCompletion || 0)) {
      console.info(`User ${req.userId} profile completion changed after photo upload: ${user.profileCompletion || 0}% -> ${updatedUser.profileCompletion}%`);
      if ((updatedUser.profileCompletion || 0) >= 100) console.info(`User ${req.userId} has completed their profile (100%).`);
    }

    res.json({
      message: 'Photo uploaded successfully',
      photos: user.photos,
      user: updatedUser.toJSON()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete photo
router.delete('/photos/:photoId', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.photos = user.photos.filter(p => p._id.toString() !== req.params.photoId);
    await User.updateOne({ _id: req.userId }, { photos: user.photos });

    // Update profileCompletion after photo change
    const completionFields = [
      !!user.nickname,
      !!user.gender,
      !!user.dob,
      !!user.university,
      !!user.course,
      !!user.year,
      (user.interests && user.interests.length > 0),
      !!user.bio,
      !!user.location,
      (user.photos && user.photos.length > 0),
      !!user.relationshipGoal
    ];
    const completedCount = completionFields.filter(Boolean).length;
    const profilePercentage = Math.round((completedCount / completionFields.length) * 100);
    await User.updateOne({ _id: req.userId }, { profileCompletion: profilePercentage });

    // Log profile completion change after photo delete
    const updatedUser = await User.findById(req.userId);
    if ((updatedUser.profileCompletion || 0) !== (user.profileCompletion || 0)) {
      console.info(`User ${req.userId} profile completion changed after photo deletion: ${user.profileCompletion || 0}% -> ${updatedUser.profileCompletion}%`);
      if ((updatedUser.profileCompletion || 0) >= 100) console.info(`User ${req.userId} has completed their profile (100%).`);
    }

    res.json({
      message: 'Photo deleted successfully',
      photos: user.photos,
      user: updatedUser.toJSON()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unblock user
router.post('/unblock/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Filter blocked list, comparing as strings to handle ObjectId vs string
    user.blocked = (user.blocked || []).filter(id => String(id) !== String(req.params.id));
    
    await User.updateOne({ _id: req.userId }, { blocked: user.blocked });

    res.json({ message: 'User unblocked', blocked: user.blocked });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
