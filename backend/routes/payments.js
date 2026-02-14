import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { User, Payment } from '../database.js';

dotenv.config();
const router = express.Router();
const PAYMENTS_ENABLED = (process.env.PAYMENTS_ENABLED || 'true') === 'true'; // set to 'false' to turn off payments and make the site free

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

// Server-side Flutterwave transaction verification helper (with short cache to avoid duplicate calls)
import * as cache from '../utils/cache.js';
async function verifyFlutterwaveTransaction(payment) {
  const flutterKey = process.env.FLUTTERWAVE_SECRET_KEY;
  const flutterApi = process.env.FLUTTERWAVE_API_BASE || 'https://api.flutterwave.com';

  if (!flutterKey || flutterKey === 'your_flutterwave_secret_here') {
    return { ok: false, reason: 'No Flutterwave key configured' };
  }

  const cacheKey = `payment:verify:${payment._id}`;
  try {
    const cached = await cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) { /* ignore */ }

  try {
    // Use tx_ref (we set tx_ref to payment._id when creating the payment)
    const url = `${flutterApi}/v3/transactions/verify?tx_ref=${payment._id}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${flutterKey}`
      }
    });

    const data = await resp.json().catch(() => ({}));

    // If Flutterwave reports a successful charge in response.data.status
    const status = data?.data?.status || data?.status || (data?.data && data.data[0] && data.data[0].status);
    const result = (resp.ok && status && String(status).toLowerCase() === 'successful') ? { ok: true, data } : { ok: false, data };

    try { await cache.set(cacheKey, JSON.stringify(result), 30); } catch (err) { /* ignore */ }
    return result;
  } catch (err) {
    console.error('Flutterwave verify error', err.message || err);
    const res = { ok: false, reason: err.message || String(err) };
    try { await cache.set(cacheKey, JSON.stringify(res), 15); } catch (e) { /* ignore */ }
    return res;
  }
}

// Create a checkout session (supports providers like Paychangu and Flutterwave)
router.post('/create-session', authenticate, async (req, res) => {
  try {
    if (!PAYMENTS_ENABLED) return res.status(410).json({ error: 'Payments are currently disabled. All features are free.' });

    const { planId, matchId, provider, providerMethod, phoneNumber } = req.body;
    if (!planId || !PLANS[planId]) return res.status(400).json({ error: 'Invalid plan id' });

    const plan = PLANS[planId];

    // Ensure user has at least 50% profile completion before starting payments
    if ((req.user.profileCompletion || 0) < 50) {
      return res.status(403).json({ error: 'Please complete your profile to at least 50% before making a payment.' });
    }

    // Create a payment record with status pending (store optional matchId for context)
    const payment = await Payment.create({
      userId: req.user._id,
      planId: plan.id,
      amount: plan.amount,
      currency: plan.currency,
      status: 'pending',
      matchId: matchId || null
    });

    // Flutterwave integration
    if (provider === 'flutterwave') {
      const flutterKey = process.env.FLUTTERWAVE_SECRET_KEY;
      const flutterApi = process.env.FLUTTERWAVE_API_BASE || 'https://api.flutterwave.com';

      if (flutterKey && flutterKey !== 'your_flutterwave_secret_here') {
        try {
          // Build payload per Flutterwave's v3 payments API
          const payload = {
            tx_ref: payment._id,
            amount: (plan.amount / 100).toFixed(2), // convert cents to main unit
            currency: plan.currency,
            redirect_url: `${process.env.BACKEND_URL || process.env.FRONTEND_URL}/api/payments/return?paymentId=${payment._id}`,
            customer: {
              email: req.user.email,
              phonenumber: phoneNumber || req.user.phone || '',
              name: req.user.name || req.user.nickname || ''
            },
            payment_options: providerMethod === 'mobilemoney' ? 'mobilemoney' : 'card',
            meta: { userId: req.user._id, planId: plan.id }
          };

          const response = await fetch(`${flutterApi}/v3/payments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${flutterKey}`
            },
            body: JSON.stringify(payload)
          });

          const data = await response.json().catch(() => ({}));

          const checkoutUrl = data?.data?.link || data?.data?.authorization_url || data?.data?.checkout_url || null;

          if (response.ok && checkoutUrl) {
            await Payment.updateOne({ _id: payment._id }, { externalId: data?.data?.id || data?.data?.reference || null, externalData: data, externalCheckoutUrl: checkoutUrl, provider: 'flutterwave' });
            return res.json({ checkoutUrl, paymentId: payment._id });
          }

          console.warn('Flutterwave create-session failed', data);
        } catch (err) {
          console.error('Flutterwave create-session error', err.message || err);
        }
      }
    }

    // Attempt to create a real Paychangu checkout session when keys are configured (fallback)
    const paySecret = process.env.PAYCHANGU_SECRET;
    const payApiBase = process.env.PAYCHANGU_API_BASE || 'https://api.paychangu.com';

    if (paySecret && paySecret !== 'SEC-TEST-n6Lrit76RMMNaXOHeum60HSKTQrKAUWe') {
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
    const baseUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '') || '';
    const checkoutUrl = baseUrl 
      ? `${baseUrl}/payments?sessionId=${payment._id}`
      : `/payments?sessionId=${payment._id}`;

    return res.json({ checkoutUrl, paymentId: payment._id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Provider return endpoint: handle provider redirect here, verify with provider when possible, then redirect to frontend
router.get('/return', async (req, res) => {
  try {
    if (!PAYMENTS_ENABLED) return res.status(410).send('Payments are currently disabled.');

    const { paymentId } = req.query;
    if (!paymentId) return res.status(400).send('Missing paymentId');

    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).send('Payment not found');

    // If this payment was created with Flutterwave, attempt to verify its status server-side
    if (payment.provider === 'flutterwave') {
      try {
        const verify = await verifyFlutterwaveTransaction(payment);
        if (verify.ok) {
          await Payment.updateOne({ _id: payment._id }, { status: 'succeeded', externalData: verify.data, updatedAt: new Date() });

          // Unlock messaging for the user
          try {
            const user = await User.findById(payment.userId);
            if (user) {
              if (payment.planId === 'premium' || payment.planId === 'platinum') {
                const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                await User.updateOne({ _id: user._id }, { subscriptionActive: true, subscriptionPlan: payment.planId, subscriptionExpires: expires, messagesUnlocked: true });
              }

              if (payment.matchId) {
                const unlocked = new Set([...(user.unlockedMatches || []), payment.matchId]);
                await User.updateOne({ _id: user._id }, { unlockedMatches: Array.from(unlocked) });
              }

              await User.updateOne({ _id: user._id }, { messagesUnlocked: true });
            }
          } catch (err) {
            console.error('Error applying post-verification unlocks:', err.message || err);
          }
        }
      } catch (err) {
        console.error('Error verifying flutterwave payment on return:', err.message || err);
      }
    }

    const frontendUrl = process.env.FRONTEND_URL || '/';
    const redirectUrl = `${frontendUrl}/payments?sessionId=${payment._id}${payment.matchId ? `&matchId=${payment.matchId}` : ''}`;

    return res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('Return redirect error:', err.message || err);
    return res.status(500).send('Error processing return');
  }
});

// Manual verification endpoint (authenticated) - useful for admins or on-demand checks
router.post('/verify/:id', authenticate, async (req, res) => {
  try {
    if (!PAYMENTS_ENABLED) return res.status(410).json({ error: 'Payments are currently disabled.' });

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    if (payment.provider === 'flutterwave') {
      const verify = await verifyFlutterwaveTransaction(payment);
      if (verify.ok) {
        await Payment.updateOne({ _id: payment._id }, { status: 'succeeded', externalData: verify.data, updatedAt: new Date() });
        return res.json({ ok: true, payment: await Payment.findById(payment._id) });
      }
      return res.json({ ok: false, data: verify.data || verify.reason });
    }

    return res.status(400).json({ error: 'Verification only supported for Flutterwave payments' });
  } catch (err) {
    console.error('Manual verify error:', err.message || err);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

// Poll session/status endpoint
router.get('/sessions/:id', authenticate, async (req, res) => {
  try {
    if (!PAYMENTS_ENABLED) return res.status(410).json({ error: 'Payments are currently disabled.' });

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
    if (!PAYMENTS_ENABLED) return res.status(410).json({ error: 'Payments are currently disabled.' });

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
    if (!PAYMENTS_ENABLED) return res.status(410).json({ error: 'Payments are currently disabled.' });

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
// Use raw body capture for webhook signature verification
router.post('/webhook', express.json({ verify: (req, res, buf) => { req.rawBody = buf } }), async (req, res) => {
  try {
    if (!PAYMENTS_ENABLED) return res.status(410).json({ error: 'Payments are currently disabled.' });

    const signature = req.headers['x-paychangu-signature'] || req.headers['x-paychangu-sig'] || '';
    const webhookSecret = process.env.PAYCHANGU_WEBHOOK_SECRET || 'testwebhooksecret';

    if (!signature) {
      return res.status(400).json({ error: 'No webhook signature provided' });
    }

    // Accept direct match (compat mode), HMAC-SHA256 verification, or Flutterwave 'verif-hash' header
    let signatureValid = false;
    const flutterHash = req.headers['verif-hash'] || req.headers['x-flw-signature'] || '';
    const flutterWebhookSecret = process.env.FLUTTERWAVE_WEBHOOK_SECRET || process.env.FLUTTERWAVE_SECRET_KEY || '';

    // Prefer raw body when available for HMAC verification
    const bodyForHmac = req.rawBody || Buffer.from(JSON.stringify(req.body));

    if (signature === webhookSecret) {
      signatureValid = true;
    } else if (flutterHash && flutterWebhookSecret) {
      try {
        // Verify Flutterwave webhook using HMAC-SHA256 over the raw body
        const computed = crypto.createHmac('sha256', flutterWebhookSecret).update(bodyForHmac).digest('hex');
        if (String(flutterHash).trim() === computed) signatureValid = true;
      } catch (err) {
        console.error('Error verifying flutterwave webhook signature', err);
      }
    } else {
      try {
        // Compute HMAC over raw body (best-effort; falls back to JSON-stringified body)
        const computed = crypto.createHmac('sha256', webhookSecret).update(bodyForHmac).digest('hex');
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

    // Paychangu style events
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

    // Flutterwave style events
    // Example: event.event === 'charge.completed' and event.data.status === 'successful'
    if (event && (event.event === 'charge.completed' || event.event === 'payment.completed' || event.data?.status === 'successful')) {
      // tx_ref is the reference we set when creating the payment (we used payment._id as tx_ref)
      const txRef = event.data?.tx_ref || event.data?.reference || event.data?.meta?.tx_ref;
      const paymentRef = txRef || event.data?.reference || event.data?.tx_ref;

      if (paymentRef) {
        const payment = await Payment.findById(String(paymentRef));
        if (payment) {
          // Extra verification: call Flutterwave verify endpoint to guard against false positives
          try {
            const verify = await verifyFlutterwaveTransaction(payment);
            if (!verify.ok) {
              console.warn('Flutterwave webhook received but verify failed, deferring status update', { paymentId: payment._id, verify });
            } else {
              await Payment.updateOne({ _id: payment._id }, { status: 'succeeded', externalId: event.data?.id || event.data?.reference || null, externalData: event, updatedAt: new Date(), provider: 'flutterwave' });

              // Unlock messaging and subscriptions for the user
              try {
                const user = await User.findById(payment.userId);
                if (user) {
                  if (payment.planId === 'premium' || payment.planId === 'platinum') {
                    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    await User.updateOne({ _id: user._id }, { subscriptionActive: true, subscriptionPlan: payment.planId, subscriptionExpires: expires, messagesUnlocked: true });
                  }

                  if (payment.matchId) {
                    const unlocked = new Set([...(user.unlockedMatches || []), payment.matchId]);
                    await User.updateOne({ _id: user._id }, { unlockedMatches: Array.from(unlocked) });
                  }

                  await User.updateOne({ _id: user._id }, { messagesUnlocked: true });
                }
              } catch (err) {
                console.error('Error unlocking messaging after flutterwave payment:', err.message || err);
              }
            }
          } catch (err) {
            console.error('Error verifying flutterwave payment during webhook handling', err.message || err);
          }
        }
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
});

export default router;
