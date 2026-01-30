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
            return_url: `${process.env.FRONTEND_URL}/payments?sessionId=${payment._id}`
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

// Endpoint to complete a payment (test helper) - marks payment succeeded and unlocks messaging for the user
router.post('/complete/:id', authenticate, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.userId !== req.user._id) return res.status(403).json({ error: 'Forbidden' });

    await Payment.updateOne({ _id: payment._id }, { status: 'succeeded', updatedAt: new Date() });
    await User.updateOne({ _id: req.user._id }, { messagesUnlocked: true });

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
