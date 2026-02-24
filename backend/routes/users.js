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
    
    // Track profile view if viewing another user's profile
    if (String(req.params.id) !== req.userId) {
      const alreadyViewed = user.profileViews?.some(v => String(v.viewerId) === req.userId);
      
      if (!alreadyViewed) {
        if (!user.profileViews) user.profileViews = [];
        user.profileViews.push({
          viewerId: req.userId,
          viewedAt: new Date()
        });
        
        // Keep only last 100 views
        if (user.profileViews.length > 100) {
          user.profileViews = user.profileViews.slice(-100);
        }
        
        await user.save();
      }
    }
    
    const resp = user.toJSON();
    resp.age = calculateAge(user.dob) || user.age || null;
    res.json(resp);
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

    // Also update computed age based on DOB
    const newAge = calculateAge(user.dob);
    if (newAge !== null) {
      await User.updateOne({ _id: req.userId }, { age: newAge });
    }

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

// Helper function to calculate age from DOB
const calculateAge = (dob) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Get users for matching (with filters)
router.get('/discover', verifyToken, async (req, res) => {
  try {
    const { gender, university, location, minAge, maxAge, minHeight, maxHeight, interests, page = 1 } = req.query;

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
    
    // Filter users: show everyone except self and blocked users
    // New users (without full profiles) are shown but with lower priority in sorting
    let filteredUsers = allUsers.filter(u => {
      // Compare as strings to handle ObjectId vs string mismatch
      if (String(u._id) === req.userId) return false;
      if (currentUser.blocked && currentUser.blocked.includes(u._id)) return false;
      // Apply optional filters: only exclude if the filter is specified and user doesn't match
      if (gender && u.gender !== gender) return false;
      if (university && u.university !== university) return false;
      if (location && u.location !== location) return false;
      if (minHeight && u.height && u.height < parseInt(minHeight)) return false;
      if (maxHeight && u.height && u.height > parseInt(maxHeight)) return false;
      // Age range filter (calculate from DOB)
      if (minAge || maxAge) {
        const userAge = calculateAge(u.dob);
        if (userAge === null) return false; // Exclude if no DOB set
        if (minAge && userAge < parseInt(minAge)) return false;
        if (maxAge && userAge > parseInt(maxAge)) return false;
      }
      // Relationship filter
      if (req.query.relationship && u.relationshipGoal !== req.query.relationship) return false;
      // Interests filter (user must have at least one matching interest)
      if (interests) {
        const filterInterests = interests.split(',').map(i => i.trim().toLowerCase()).filter(Boolean);
        const userInterests = (u.interests || []).map(i => i.toLowerCase());
        const hasMatchingInterest = filterInterests.some(fi => userInterests.includes(fi));
        if (!hasMatchingInterest) return false;
      }
      return true;
    });

    // Smart sorting: prioritize based on relevance and activity
    // New users are shown but with lower priority
    filteredUsers.sort((a, b) => {
      // Compute online status for both users
      const FIVE_MIN = 5 * 60 * 1000;
      const aLastActive = a.lastActive ? new Date(a.lastActive).getTime() : 0;
      const bLastActive = b.lastActive ? new Date(b.lastActive).getTime() : 0;
      const aIsOnline = !!(a.active && aLastActive && (Date.now() - aLastActive) < FIVE_MIN);
      const bIsOnline = !!(b.active && bLastActive && (Date.now() - bLastActive) < FIVE_MIN);

      // First priority: Online users first
      if (aIsOnline && !bIsOnline) return -1;
      if (!aIsOnline && bIsOnline) return 1;

      // Second priority: Users with university set (to keep platform student-focused)
      const aHasUni = !!a.university;
      const bHasUni = !!b.university;
      if (aHasUni && !bHasUni) return -1;
      if (!aHasUni && bHasUni) return 1;

      // Third priority: Matching relationship goals
      const aGoalMatch = a.relationshipGoal === currentUser.relationshipGoal ? 1 : 0;
      const bGoalMatch = b.relationshipGoal === currentUser.relationshipGoal ? 1 : 0;
      if (aGoalMatch !== bGoalMatch) return bGoalMatch - aGoalMatch;

      // Fourth priority: Matching interests (count matching interests)
      const currentUserInterests = (currentUser.interests || []).map(i => i.toLowerCase());
      const aInterestMatches = (a.interests || []).filter(i => 
        currentUserInterests.includes(i.toLowerCase())
      ).length;
      const bInterestMatches = (b.interests || []).filter(i => 
        currentUserInterests.includes(i.toLowerCase())
      ).length;
      if (aInterestMatches !== bInterestMatches) return bInterestMatches - aInterestMatches;

      // Fifth priority: Most recently active (accounts with more complete profiles and recent activity)
      const aProfileCompletion = a.profileCompletion || 0;
      const bProfileCompletion = b.profileCompletion || 0;
      if (aProfileCompletion !== bProfileCompletion) return bProfileCompletion - aProfileCompletion;

      // Final priority: Most recently active/created
      return bLastActive - aLastActive;
    });

    const pageNum = parseInt(page) || 1;
    const limit = 20;
    const start = (pageNum - 1) * limit;
    const users = filteredUsers.slice(start, start + limit).map(u => {
      const userObj = u.toJSON();

      // Compute and include age from DOB if available
      userObj.age = calculateAge(u.dob) || userObj.age || null;

      // Compute online status: active flag + recent activity within 5 minutes
      const FIVE_MIN = 5 * 60 * 1000;
      const lastActive = userObj.lastActive ? new Date(userObj.lastActive).getTime() : 0;
      userObj.isOnline = !!(userObj.active && lastActive && (Date.now() - lastActive) < FIVE_MIN);
      
      return userObj;
    });

    console.log('[Discover] Returning', users.length, 'profiles to user', req.userId, '(filtered from', filteredUsers.length, 'total)');

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

    // Filter by publicId (filename) which is how photos are stored
    user.photos = (user.photos || []).filter(p => p.publicId !== req.params.photoId);
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

// Get/Update notification preferences
router.get('/notification-preferences', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      notificationPreferences: user.notificationPreferences || {
        email: true,
        likes: true,
        matches: true,
        messages: true
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/notification-preferences', verifyToken, async (req, res) => {
  try {
    const { email, likes, matches, messages } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.notificationPreferences = {
      email: email !== undefined ? email : (user.notificationPreferences?.email ?? true),
      likes: likes !== undefined ? likes : (user.notificationPreferences?.likes ?? true),
      matches: matches !== undefined ? matches : (user.notificationPreferences?.matches ?? true),
      messages: messages !== undefined ? messages : (user.notificationPreferences?.messages ?? true)
    };
    
    await user.save();
    
    res.json({
      message: 'Notification preferences updated',
      notificationPreferences: user.notificationPreferences
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get profile viewers
router.get('/me/profile-viewers', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const viewers = user.profileViews?.slice().reverse() || [];
    
    // Fetch viewer details
    const viewerDetails = await Promise.all(
      viewers.map(async (view) => {
        const viewer = await User.findById(view.viewerId);
        return {
          _id: view.viewerId,
          name: viewer?.name,
          nickname: viewer?.nickname,
          photo: viewer?.photos?.[0]?.url,
          age: calculateAge(viewer?.dob) || viewer?.age || null,
          university: viewer?.university,
          viewedAt: view.viewedAt
        };
      })
    );
    
    res.json({
      viewersCount: viewerDetails.length,
      viewers: viewerDetails
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get total profile view count for current user
router.get('/me/profile-view-count', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ viewCount: user.profileViews?.length || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add to favorites
router.post('/favorites/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const favoriteUser = await User.findById(userId);
    if (!favoriteUser) return res.status(404).json({ error: 'User not found' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Add to favorites if not already there
    if (!user.favorites) user.favorites = [];
    if (!user.favorites.includes(userId)) {
      user.favorites.push(userId);
      await user.save();
    }

    res.json({ message: 'Added to favorites', favorites: user.favorites });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove from favorites
router.delete('/favorites/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.favorites) user.favorites = [];
    user.favorites = user.favorites.filter(id => String(id) !== userId);
    await user.save();

    res.json({ message: 'Removed from favorites', favorites: user.favorites });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all favorites
router.get('/me/favorites', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('favorites', 'nickname name age gender university photos dob');
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Ensure favorites include computed age from DOB when possible
    const favorites = (user.favorites || []).map(fav => {
      const favObj = fav.toJSON ? fav.toJSON() : fav;
      favObj.age = calculateAge(fav.dob) || favObj.age || null;
      return favObj;
    });

    res.json({ favorites });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if user is favorited
router.get('/is-favorite/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isFavorite = user.favorites?.includes(userId) || false;

    res.json({ isFavorite });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GDPR: Export all user data
router.get('/me/export-data', verifyToken, async (req, res) => {
  try {
    const { Message, Match } = await import('../database.js');
    
    // Get all user data
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Get all matches involving the user
    const allMatches = await Match.find({});
    const userMatches = allMatches.filter(m => String(m.user1) === req.userId || String(m.user2) === req.userId);

    // Get all messages
    const allMessages = await Message.find({});
    const userMessages = allMessages.filter(m => String(m.senderId) === req.userId || String(m.receiverId) === req.userId);

    // Get profile viewers
    const profileViewers = user.profileViews || [];

    // Compile export data
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        nickname: user.nickname,
        age: user.age,
        dob: user.dob,
        gender: user.gender,
        location: user.location,
        university: user.university,
        course: user.course,
        year: user.year,
        interests: user.interests,
        bio: user.bio,
        relationshipGoal: user.relationshipGoal,
        verified: user.verified,
        verificationMethod: user.verificationMethod,
        profileCompletion: user.profileCompletion,
        createdAt: user.createdAt,
        lastActive: user.lastActive
      },
      photos: user.photos?.map(p => ({
        url: p.url,
        publicId: p.publicId,
        uploadedAt: p.uploadedAt
      })) || [],
      preferences: user.notificationPreferences,
      matches: userMatches.map(m => ({
        id: m._id,
        otherUserId: String(m.user1) === req.userId ? m.user2 : m.user1,
        status: m.status,
        matchedAt: m.matchedAt,
        createdAt: m.createdAt
      })),
      messages: userMessages.map(m => ({
        id: m._id,
        matchId: m.matchId,
        senderId: m.senderId,
        receiverId: m.receiverId,
        message: m.message,
        read: m.read,
        readAt: m.readAt,
        createdAt: m.createdAt
      })),
      profileViews: profileViewers.map(v => ({
        viewerId: v.viewerId,
        viewedAt: v.viewedAt
      })),
      accountActivity: {
        totalMatches: userMatches.length,
        totalMessages: userMessages.length,
        profileViewCount: profileViewers.length,
        lastActive: user.lastActive,
        memberSince: user.createdAt
      }
    };

    // Send as JSON file download
    res.setHeader('Content-Disposition', `attachment; filename="edulove-data-${Date.now()}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
