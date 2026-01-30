import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { User, Payment } from '../database.js';

dotenv.config();
const router = express.Router();

// Simple plan definitions (could be stored in DB later)
const PLANS = {
  basic: { id: 'basic', name: 'Basic', amount: 1999, currency: 'USD', description: 'Basic membership' },
  premium: { id: 'premium', name: 'Premium', amount: 4999, currency: 'USD', description: 'Premium membership (recommended)' },
  platinum: { id: 'platinum', name: 'Platinum', amount: 9999, currency: 'USD', description: 'All features, top priority support' }
};

// Helper: authenticate user via Bearer token
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Create a checkout session (test-mode placeholder)
router.post('/create-session', authenticate, async (req, res) => {
  try {
    const { planId, matchId } = req.body;
    if (!planId || !PLANS[planId]) return res.status(400).json({ error: 'Invalid plan id' });

    const plan = PLANS[planId];

    // Create a payment record with status pending (store optional matchId for context)
    const payment = await Payment.create({
      userId: req.user._id,
      planId: plan.id,
      amount: plan.amount,
      currency: plan.currency,
      status: 'pending',
      matchId: matchId || null
    });

    // Attempt to create a real Paychangu checkout session when keys are configured
    const paySecret = process.env.PAYCHANGU_SECRET;
    const payApiBase = process.env.PAYCHANGU_API_BASE || 'https://api.paychangu.com';

    if (paySecret && paySecret !== 'your_paychangu_secret_here') {
      try {
        const response = await fetch(`${payApiBase}/v1/checkout/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${paySecret}`
          },
          body: JSON.stringify({
            amount: plan.amount,
            currency: plan.currency,
            reference: payment._id,
            metadata: { userId: req.user._id, planId: plan.id },
            // Return to backend first to avoid SPA deep-link 404s; backend will redirect to frontend
            return_url: `${process.env.BACKEND_URL || process.env.FRONTEND_URL}/api/payments/return?paymentId=${payment._id}`
          })
        });

        const data = await response.json().catch(() => ({}));

        // Determine checkout URL from common response shapes
        const checkoutUrlFromProvider = data?.checkoutUrl || data?.url || data?.checkout?.url || data?.redirect_url;

        if (response.ok && checkoutUrlFromProvider) {
          await Payment.updateOne({ _id: payment._id }, { externalId: data.id || data.paymentId || null, externalData: data, externalCheckoutUrl: checkoutUrlFromProvider });
          return res.json({ checkoutUrl: checkoutUrlFromProvider, paymentId: payment._id });
        } else {
          console.warn('Paychangu create-session failed', data);
        }
      } catch (err) {
        console.error('Paychangu create-session error', err.message || err);
      }
    }

    // Fallback: return a placeholder local success URL for test flows
    const checkoutUrl = `${process.env.FRONTEND_URL}/payments/success?sessionId=${payment._id}`;

    return res.json({ checkoutUrl, paymentId: payment._id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Provider return endpoint: handle provider redirect here, then redirect to frontend
router.get('/return', async (req, res) => {
  try {
    const { paymentId } = req.query;
    if (!paymentId) return res.status(400).send('Missing paymentId');

    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).send('Payment not found');

    // Optionally we could validate query params or provider tokens here
    const frontendUrl = process.env.FRONTEND_URL || '/';
    const redirectUrl = `${frontendUrl}/payments?sessionId=${payment._id}${payment.matchId ? `&matchId=${payment.matchId}` : ''}`;

    return res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('Return redirect error:', err.message || err);
    return res.status(500).send('Error processing return');
  }
});
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Poll session/status endpoint
router.get('/sessions/:id', authenticate, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.userId !== req.user._id) return res.status(403).json({ error: 'Forbidden' });

    return res.json({ payment });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get latest pending payment for the authenticated user (optional: filter by matchId)
router.get('/latest', authenticate, async (req, res) => {
  try {
    const { matchId } = req.query;
    let payments = await Payment.find({ userId: req.user._id, status: 'pending' });

    if (matchId) {
      payments = payments.filter(p => p.matchId === matchId);
    }

    const latest = payments.length ? payments[payments.length - 1] : null;
    if (!latest) return res.status(404).json({ error: 'No pending payment found' });

    return res.json({ payment: latest });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint to complete a payment (test helper) - marks payment succeeded and unlocks messaging for the user
router.post('/complete/:id', authenticate, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.userId !== req.user._id) return res.status(403).json({ error: 'Forbidden' });

    await Payment.updateOne({ _id: payment._id }, { status: 'succeeded', updatedAt: new Date() });

    // Unlock based on plan and matchId
    try {
      if (payment.planId === 'premium' || payment.planId === 'platinum') {
        // Activate subscription for 30 days (example)
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await User.updateOne({ _id: req.user._id }, { subscriptionActive: true, subscriptionPlan: payment.planId, subscriptionExpires: expires });
      }

      // If this payment includes a matchId, unlock that conversation specifically
      if (payment.matchId) {
        const user = await User.findById(req.user._id);
        const unlocked = new Set([...(user.unlockedMatches || []), payment.matchId]);
        await User.updateOne({ _id: req.user._id }, { unlockedMatches: Array.from(unlocked) });
      }

      // As a fallback, also set messagesUnlocked for broad compatibility
      await User.updateOne({ _id: req.user._id }, { messagesUnlocked: true });
    } catch (err) {
      console.error('Error applying post-payment unlocks:', err.message || err);
    }

    return res.json({ message: 'Payment completed (test), messaging unlocked', payment });
  } catch (error) {
    console.error('Complete payment error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint (called by Paychangu) - verify signature/header
router.post('/webhook', express.json(), async (req, res) => {
  try {
    const signature = req.headers['x-paychangu-signature'] || req.headers['x-paychangu-sig'] || '';
    const webhookSecret = process.env.PAYCHANGU_WEBHOOK_SECRET || 'testwebhooksecret';

    if (!signature) {
      return res.status(400).json({ error: 'No webhook signature provided' });
    }

    // Accept direct match (compat mode) or HMAC-SHA256 verification
    let signatureValid = false;
    if (signature === webhookSecret) {
      signatureValid = true;
    } else {
      try {
        // Compute HMAC over stringified body (best-effort; for exact verification you'd use raw body)
        const computed = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(req.body)).digest('hex');
        const sig = String(signature).replace(/^(sha256=|v1=)/, '').trim();
        if (sig === computed) signatureValid = true;
      } catch (err) {
        console.error('Error verifying webhook signature', err);
      }
    }

    if (!signatureValid) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body;

    // Example event types: payment.success, payment.failed
    if (event && event.type === 'payment.success') {
      // Support event.data.paymentId or event.data.reference
      const paymentId = event.data?.paymentId || event.data?.reference;
      const payment = await Payment.findById(paymentId);
      if (payment) {
        await Payment.updateOne({ _id: payment._id }, { status: 'succeeded', externalId: event.data.externalId || event.data.id || null, updatedAt: new Date() });

        // Unlock messaging for the user who made the payment
        try {
          const user = await User.findById(payment.userId);
          if (user) {
            // If plan is subscription-like, activate subscription
            if (payment.planId === 'premium' || payment.planId === 'platinum') {
              const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
              await User.updateOne({ _id: user._id }, { subscriptionActive: true, subscriptionPlan: payment.planId, subscriptionExpires: expires, messagesUnlocked: true });
            }

            // If payment had matchId, unlock that match specifically
            if (payment.matchId) {
              const unlocked = new Set([...(user.unlockedMatches || []), payment.matchId]);
              await User.updateOne({ _id: user._id }, { unlockedMatches: Array.from(unlocked) });
            }

            // Fallback unlock
            await User.updateOne({ _id: user._id }, { messagesUnlocked: true });
          }
        } catch (err) {
          console.error('Error unlocking messaging after payment:', err.message || err);
        }
      }
    }

    if (event && event.type === 'payment.failed') {
      const paymentId = event.data?.paymentId || event.data?.reference;
      const payment = await Payment.findById(paymentId);
      if (payment) {
        await Payment.updateOne({ _id: payment._id }, { status: 'failed', failureReason: event.data?.reason || 'unknown', updatedAt: new Date() });
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
});

export default router;
