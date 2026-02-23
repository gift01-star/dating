import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../database.js';
import pushService from '../utils/pushService.js';

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

// Save a push subscription for the current user
router.post('/subscribe', verifyToken, async (req, res) => {
  try {
    const sub = req.body.subscription;
    if (!sub || !sub.endpoint) return res.status(400).json({ error: 'Invalid subscription' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Avoid duplicates
    const exists = (user.pushSubscriptions || []).some(s => s.endpoint === sub.endpoint);
    if (!exists) {
      user.pushSubscriptions = user.pushSubscriptions || [];
      user.pushSubscriptions.push({ ...sub, createdAt: new Date() });
      await user.save();
    }

    res.json({ message: 'Subscribed' });
  } catch (err) {
    console.error('[Notifications] subscribe error', err);
    res.status(500).json({ error: err.message });
  }
});

// Unsubscribe (remove)
router.post('/unsubscribe', verifyToken, async (req, res) => {
  try {
    const endpoint = req.body.endpoint;
    if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });

    await User.updateOne({ _id: req.userId }, { $pull: { pushSubscriptions: { endpoint } } });
    res.json({ message: 'Unsubscribed' });
  } catch (err) {
    console.error('[Notifications] unsubscribe error', err);
    res.status(500).json({ error: err.message });
  }
});

// Send a test push to current user (for debugging)
router.post('/send-test', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const subs = user.pushSubscriptions || [];
    const payload = { title: 'EduLove Test', body: 'This is a test notification from EduLove.' };

    const results = await pushService.sendPushToMany(subs, payload);
    res.json({ sent: results.filter(Boolean).length, total: results.length });
  } catch (err) {
    console.error('[Notifications] send-test error', err);
    res.status(500).json({ error: err.message });
  }
});

// Return VAPID public key for client subscriptions
router.get('/vapid-public', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || '';
  res.json({ publicKey });
});

export default router;
