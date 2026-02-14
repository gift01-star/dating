import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../database.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    let { name, email, password, confirmPassword, relationshipGoal } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    email = email.toLowerCase();
    console.log('[Register] Registering user:', email);

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Password strength: at least 6 chars and contains letters and numbers
    if (password.length < 6 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters and include letters and numbers' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    console.log('[Register] Creating user with email:', email);
    const user = await User.create({
      name,
      email,
      password,
      relationshipGoal: relationshipGoal || 'Dating',
      // Initialize all profile fields to match users.js structure
      nickname: '',
      gender: '',
      dob: null,
      location: '',
      height: 0,
      bodyType: '',
      university: '',
      course: '',
      year: '',
      interests: [],
      bio: '',
      photos: [],
      blocked: [],
      profileCompletion: 0,
      active: true,
      lastActive: new Date()
    });

    console.log('[Register] User created successfully:', user._id);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('[Register] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      console.log('[Login] Missing email or password');
      return res.status(400).json({ error: 'Email and password required' });
    }

    email = email.toLowerCase();
    console.log('[Login] Attempting to find user with email:', email);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log('[Login] User not found for email:', email);
      // Get count of all users for debugging
      const allUsers = await User.find({});
      console.log('[Login] Total users in DB:', allUsers.length);
      if (allUsers.length > 0) {
        console.log('[Login] Existing users:', allUsers.map(u => u.email).join(', '));
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[Login] User found:', user.name, '- Checking password...');
    console.log('[Login] User has passwordHash:', !!user.passwordHash);

    // Use the User-level comparePassword helper
    const isPasswordValid = await User.comparePassword(email, password);
    console.log('[Login] Password valid result:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('[Login] Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[Login] Login successful for:', email);
    
    // Update lastActive and active status
    await User.updateOne({ email }, { 
      lastActive: new Date(),
      active: true
    });

    // Fetch fresh user data with all fields to match users.js structure
    const freshUser = await User.findOne({ email });

    const token = jwt.sign({ id: freshUser._id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

    // Calculate online status (active + recent activity within 5 minutes)
    const FIVE_MIN = 5 * 60 * 1000;
    const lastActive = freshUser.lastActive ? new Date(freshUser.lastActive).getTime() : 0;
    const isOnline = !!(freshUser.active && lastActive && (Date.now() - lastActive) < FIVE_MIN);

    const userWithOnlineStatus = {
      ...freshUser.toJSON(),
      isOnline
    };

    console.log('[Login] Returning token and user data');
    res.json({
      message: 'Login successful',
      token,
      user: userWithOnlineStatus
    });
  } catch (error) {
    console.error('[Login] Error:', error.stack || error.message || error);
    res.status(500).json({ error: error.message || 'Login error' });
  }
});

// Request password reset (dev-friendly: returns reset link)
router.post('/request-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal whether email exists
      return res.json({ message: 'If an account exists, a reset link has been sent' });
    }

    const crypto = await import('crypto');
    const token = crypto.randomBytes(20).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await User.updateOne({ email }, { resetToken: token, resetExpires });

    const resetLink = `${process.env.FRONTEND_URL || 'https://frontend-i89x.onrender.com'}/reset/${token}`;

    // In production you'd email the link. For dev, return it in the response.
    res.json({ message: 'Reset link created', resetLink });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete password reset
router.post('/reset', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });

    // Password strength
    if (newPassword.length < 6 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters and include letters and numbers' });
    }

    // Find all users and check for valid reset token (since findOne doesn't support complex operators)
    const users = await User.find();
    const user = users.find(u => u.resetToken === token && u.resetExpires && new Date(u.resetExpires) > new Date());
    
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    await User.updateOne({ _id: user._id }, { 
      password: newPassword,
      resetToken: null,
      resetExpires: null
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify token
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user: user.toJSON() });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
