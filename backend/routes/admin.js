import express from 'express';
import jwt from 'jsonwebtoken';
import { User, Report, getStats } from '../database.js';

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

// Check if admin (supports user.role==='admin', user.isAdmin, or ADMIN_EMAILS env)
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(403).json({ error: 'Forbidden' });

    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const isEnvAdmin = adminEmails.length && adminEmails.includes((user.email || '').toLowerCase());

    if (user.isAdmin || user.role === 'admin' || isEnvAdmin) {
      return next();
    }

    return res.status(403).json({ error: 'Forbidden' });
  } catch (err) {
    console.error('Admin check error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Admin check failed' });
  }
};

// Get all unverified users
router.get('/users/unverified', verifyToken, isAdmin, async (req, res) => {
  try {
    const allUsers = await User.find({});
    const users = allUsers.filter(u => !u.verified).map(u => u.toJSON()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify user
router.put('/users/:id/verify', verifyToken, isAdmin, async (req, res) => {
  try {
    const { verificationMethod } = req.body;
    const updated = await User.updateOne({ _id: req.params.id }, { verified: true, verificationMethod });
    const userJson = updated && typeof updated.toJSON === 'function' ? updated.toJSON() : updated;
    res.json({ message: 'User verified', user: userJson });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject user verification
router.put('/users/:id/reject', verifyToken, isAdmin, async (req, res) => {
  try {
    const updated = await User.updateOne({ _id: req.params.id }, { active: false });
    const userJson = updated && typeof updated.toJSON === 'function' ? updated.toJSON() : updated;
    res.json({ message: 'User rejected', user: userJson });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ban user
router.put('/users/:id/ban', verifyToken, isAdmin, async (req, res) => {
  try {
    const updated = await User.updateOne({ _id: req.params.id }, { active: false });
    const userJson = updated && typeof updated.toJSON === 'function' ? updated.toJSON() : updated;
    res.json({ message: 'User banned', user: userJson });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all reports
router.get('/reports', verifyToken, isAdmin, async (req, res) => {
  try {
    const reports = await Report.find();
    const formattedReports = (reports || []).map(r => (typeof r.toJSON === 'function' ? r.toJSON() : r)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(formattedReports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resolve report
router.put('/reports/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { status, action, notes } = req.body;

    const report = await Report.findOneAndUpdate({ _id: req.params.id }, { status, action, notes, resolvedAt: new Date(), resolvedBy: req.userId });
    // If action is ban, update user
    if (action === 'banned') {
      await User.updateOne({ _id: report.reportedUser || report.reported_user || report.reportedUserId }, { active: false });
    }

    res.json({ message: 'Report resolved', report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard stats
router.get('/stats', verifyToken, isAdmin, async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
