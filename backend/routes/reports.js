import express from 'express';
import jwt from 'jsonwebtoken';
import { Report } from '../database.js';

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

// Report user
router.post('/', verifyToken, async (req, res) => {
  try {
    const { reportedUser, reason, description } = req.body;

    if (!reportedUser || !reason) {
      return res.status(400).json({ error: 'User and reason required' });
    }

    // Ensure reportedUser is not the same as the current user
    if (String(reportedUser) === String(req.userId)) {
      return res.status(400).json({ error: 'You cannot report yourself' });
    }

    // Verify the reported user exists
    const { User } = await import('../database.js');
    const reportedUserExists = await User.findById(reportedUser);
    if (!reportedUserExists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const report = await Report.create({
      reportedUser,
      reportedBy: req.userId,
      reason,
      description,
      createdAt: new Date()
    });

    // Log report for operator visibility
    console.info(`User ${req.userId} reported ${reportedUser}: ${reason}${description ? ' - ' + description : ''}`);

    res.status(201).json({
      message: 'Report submitted successfully. Thank you for helping keep the community safe.',
      report
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
