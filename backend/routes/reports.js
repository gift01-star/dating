import express from 'express';
import jwt from 'jsonwebtoken';
import { Report } from '../database.js';

const router = express.Router();

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

// Report user
router.post('/', verifyToken, async (req, res) => {
  try {
    const { reportedUser, reason, description } = req.body;

    if (!reportedUser || !reason) {
      return res.status(400).json({ error: 'User and reason required' });
    }

    const report = await Report.create({
      reportedUser,
      reportedBy: req.userId,
      reason,
      description
    });

    res.status(201).json({
      message: 'Report submitted successfully',
      report
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
