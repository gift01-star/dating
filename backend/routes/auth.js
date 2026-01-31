import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../database.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword, relationshipGoal } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

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

    const user = await User.create({
      name,
      email,
      password,
      relationshipGoal: relationshipGoal || 'Dating'
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await User.updateOne({ email }, { lastActive: new Date() });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    user.resetToken = token;
    user.resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await user.save();

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

    const user = await User.findOne({ resetToken: token, resetExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    user.password = newPassword;
    user.resetToken = undefined;
    user.resetExpires = undefined;
    await user.save();

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
