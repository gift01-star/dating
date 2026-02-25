# Paychangu Payment Integration - Setup Guide

## ✅ Status: Ready to Activate

Your Paychangu account is now activated! This guide walks you through configuring the integration.

---

## 📋 Step 1: Gather Your Paychangu Credentials

1. Log in to your Paychangu Dashboard at: https://dashboard.paychangu.com
2. Navigate to **Settings → API Keys** or **Developers → API Keys**
3. You should see:
   - **Secret Key** (starts with `SEC-` or similar)
   - **Public Key** (optional, for some integrations)
   - **Webhook Secret** (if applicable)

### Example Credentials Format:
```
Secret Key:         SEC-xxxxxxxxxxxxxxxxxxxx
Webhook Secret:     webhook_secret_xxxxxxxxxxxx
Base URL:           https://api.paychangu.com  (use this for live)
Test URL:           https://test-api.paychangu.com (for testing)
```

---

## 🔑 Step 2: Configure Backend Environment Variables

Add these to your **Render backend** service environment variables:

### For **Production/Live** Payments:

```bash
PAYCHANGU_SECRET=SEC-your-live-secret-key-here
PAYCHANGU_WEBHOOK_SECRET=your-webhook-secret-here
PAYCHANGU_API_BASE=https://api.paychangu.com
PAYMENTS_ENABLED=true
BACKEND_URL=https://your-backend.onrender.com
FRONTEND_URL=https://your-frontend.onrender.com
```

### For **Testing** (Optional - for development):

```bash
PAYCHANGU_SECRET=SEC-your-test-secret-key-here
PAYCHANGU_API_BASE=https://test-api.paychangu.com
```

---

## 🌐 Step 3: Verify Paychangu Webhook Configuration

1. Go to **Paychangu Dashboard → Settings → Webhooks**
2. Add a new webhook with:
   - **Webhook URL**: `https://your-backend.onrender.com/api/payments/webhook`
   - **Events**: Select `payment.success` and `payment.failed`
   - **Secret**: Enter your `PAYCHANGU_WEBHOOK_SECRET`

---

## 🧪 Step 4: Test the Integration

### Option A: Using cURL (Replace tokens/IDs with actual values)

```bash
# 1. Get your JWT token by logging in
TOKEN="your-jwt-token-here"
BACKEND="https://your-backend.onrender.com"

# 2. Create a payment session
curl -X POST ${BACKEND}/api/payments/create-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "planId": "basic",
    "provider": "paychangu"
  }'

# Expected response:
# {
#   "checkoutUrl": "https://api.paychangu.com/checkout/...",
#   "paymentId": "1708372800123-abc123"
# }

# 3. Copy the checkoutUrl and open it in browser
# 4. Complete the payment with test card (if in test mode)
# 5. You'll be redirected back to: /api/payments/return?paymentId=<id>
```

### Option B: Using the Frontend UI

1. Log in to your app
2. Go to **Payments/Subscription** page
3. Select a plan (e.g., Basic)
4. Click **Pay with Paychangu**
5. Complete the payment in the Paychangu modal/redirect

---

## 💳 Test Credentials (If Using Paychangu Test Mode)

Paychangu typically provides test cards for sandbox mode:

```
Test Card Number:    4242 4242 4242 4242
Test Card Number:    5555 5555 5555 4444
Expiry:             Any future date (e.g., 12/25)
CVV:                Any 3 digits
```

Check your Paychangu dashboard for exact test credentials.

---

## 📊 Step 5: Monitor Payment Status

### Check Payment Logs

1. **Render Backend Logs**:
   ```
   Dashboard → Backend Service → Logs
   Search for: "[create-session]" or "[Paychangu]"
   ```

2. **Payment History** (In-app):
   - View completed payments at: `/payments/history`
   - API endpoint: `GET /api/payments/history`

### Common Log Entries to Look For:

✅ **Success**:
```
[create-session] Paychangu checkout URL received: {...}
[/api/payments/return] Payment found and status updated to succeeded
```

❌ **Error**:
```
[create-session] Paychangu API call failed
[Paychangu create-session error] ECONNREFUSED (API not reachable)
No webhook signature provided (webhook misconfigured)
```

---

## 🔄 Step 6: Payment Flow Diagram

```
User Selection
    ↓
Frontend: Choose Plan → POST /api/payments/create-session
    ↓
Backend: Create Payment Record in DB
    ↓
Backend: Call Paychangu API → Get checkout URL
    ↓
Frontend: Redirect to Paychangu Checkout
    ↓
User: Complete Payment
    ↓
Paychangu: Redirect to /api/payments/return
    ↓
Backend: Mark payment as succeeded + Unlock Features
    ↓
Frontend: Show Success → User gets messaging/subscription
    ↓
(Async) Paychangu: Send webhook to /api/payments/webhook
    ↓
Backend: Double-verify & apply final unlocks
```

---

## 🎯 What Gets Unlocked After Payment?

### Basic Plan:
- Unlimited messages (messaging unlocked)

### Premium Plan ($49.99):
- 30-day subscription activated
- All Premium features
- Messaging unlocked

### Platinum Plan ($99.99):
- 30-day subscription activated
- All Platinum features (profile views, boosts, etc.)
- Messaging unlocked

### Unlocking Logic:
Located in [backend/routes/payments.js](backend/routes/payments.js#L428-L460)
- Webhook handler verifies signature
- Updates `Payment.status = 'succeeded'`
- Sets `User.subscriptionActive = true`
- Sets `User.messagesUnlocked = true`
- Sets `User.subscriptionExpires = now + 30 days`

---

## 🐛 Troubleshooting

### Issue: "No Paychangu key configured"
**Solution**: 
- Verify `PAYCHANGU_SECRET` is set in Render environment variables
- Check it's not the test key: `SEC-TEST-n6Lrit76RMMNaXOHeum60HSKTQrKAUWe`
- Restart the backend service after updating env vars

### Issue: "Checkout URL not received from Paychangu"
**Solution**:
- Check if Paychangu API is down (try: `curl https://api.paychangu.com/health`)
- Verify your `PAYCHANGU_SECRET` is correct (live key for production)
- Check Render backend logs for exact Paychangu response
- Ensure `BACKEND_URL` and `FRONTEND_URL` env vars are set correctly

### Issue: "Payment redirect back returns error: missing_session"
**Solution**:
- Confirm Paychangu is sending the `paymentId` parameter in the redirect
- Check if payment record was created in database
- Verify `reference` parameter matches the payment record's `_id`
- Check Render logs for: "Payment not found on return"

### Issue: "Webhook signature validation failed"
**Solution**:
- Verify `PAYCHANGU_WEBHOOK_SECRET` matches Paychangu dashboard
- Check webhook URL in Paychangu settings matches: `https://your-backend.onrender.com/api/payments/webhook`
- Ensure raw request body is being used for HMAC verification (backend already handles this)

### Issue: "User not getting messaging unlocked after payment"
**Solution**:
- Check if payment webhook was received (search logs for "payment.success")
- Verify user record exists with correct `_id` in database
- Check if `messagesUnlocked` flag is being set (may take a moment after webhook)
- Try manual unlock via: `POST /api/payments/complete/{paymentId}` (for testing)

---

## 📝 Quick Reference: Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/payments/create-session` | POST | Create payment + get checkout URL |
| `/api/payments/return` | GET | Handle provider redirect (auto-verify payment) |
| `/api/payments/webhook` | POST | Paychangu calls this to notify of payment status |
| `/api/payments/sessions/:id` | GET | Check payment status |
| `/api/payments/history` | GET | View payment history |
| `/api/payments/complete/:id` | POST | Manual payment completion (test helper) |
| `/api/payments/verify/:id` | POST | Manual verification (test helper) |

---

## ✅ Checklist: Before Going Live

- [ ] Paychangu account activated with live credentials
- [ ] `PAYCHANGU_SECRET` set to live key in Render
- [ ] `PAYCHANGU_API_BASE` set to `https://api.paychangu.com`
- [ ] `PAYCHANGU_WEBHOOK_SECRET` configured in Render
- [ ] Webhook URL registered in Paychangu dashboard
- [ ] Test payment successful end-to-end
- [ ] User receives messaging unlock after payment
- [ ] Payment history displays correctly
- [ ] Backend logs show successful Paychangu API calls
- [ ] HTTPS enabled (Render provides this by default)

---

## 🚀 Go Live Command

Once all checks pass, payments are live! Users can now:
1. Select a plan
2. Choose "Paychangu" as payment method
3. Complete secure payment
4. Get instant messaging access

---

## 📞 Support

**For Paychangu Issues**:
- Contact: support@paychangu.com
- Docs: https://docs.paychangu.com

**For App Issues**:
- Check backend logs in Render dashboard
- Review this guide's troubleshooting section
- Check [PAYMENT_DEBUG_STEPS.txt](PAYMENT_DEBUG_STEPS.txt) for debugging tips

---

**Last Updated**: February 25, 2026
**Status**: ✅ Ready for Production
