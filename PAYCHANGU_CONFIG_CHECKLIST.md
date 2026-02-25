# Paychangu Configuration Checklist

## 🔑 Step 1: Get Your Paychangu Credentials (5 minutes)

### From Paychangu Dashboard:
- [ ] Go to https://dashboard.paychangu.com
- [ ] Navigate to Settings → API Keys
- [ ] Copy your **Secret Key**
- [ ] Copy your **Webhook Secret** (if available)
- [ ] Copy your **Public Key** (if available)
- [ ] Note: Test mode vs Live mode URLs

**Save these credentials securely** (you'll need them for Render)

---

## 🌍 Step 2: Configure Paychangu Webhook (5 minutes)

### In Paychangu Dashboard:
- [ ] Go to Settings → Webhooks
- [ ] Click "Add Webhook"
- [ ] Set **Webhook URL** to:
  ```
  https://your-backend-on-render.onrender.com/api/payments/webhook
  ```
- [ ] Select Events: `payment.success`, `payment.failed`
- [ ] Enter **Secret**: Paste your webhook secret
- [ ] Click **Save/Add**
- [ ] Test the webhook to verify it's working

---

## 🚀 Step 3: Configure Render Backend (10 minutes)

### Login to Render Dashboard:
1. Go to https://dashboard.render.com
2. Select your **Backend Service** (edu-love-backend or similar)
3. Click on **Environment** or an existing env var
4. Add these environment variables:

#### Required Variables:

| Key | Value | Example |
|-----|-------|---------|
| `PAYCHANGU_SECRET` | Your Secret Key from Paychangu | `SEC-xxxxxxxxxxxx` |
| `PAYCHANGU_API_BASE` | Paychangu API endpoint | `https://api.paychangu.com` |
| `PAYCHANGU_WEBHOOK_SECRET` | Your Webhook Secret | `webhook_secret_xxx` |
| `PAYMENTS_ENABLED` | Enable/disable payments | `true` |

#### Already Configured (Verify):

| Key | Value |
|-----|-------|
| `BACKEND_URL` | `https://your-backend.onrender.com` |
| `FRONTEND_URL` | `https://your-frontend.onrender.com` |

**Save & Restart Backend Service**

---

## 🧪 Step 4: Test End-to-End Payment (10 minutes)

### Test via Frontend UI:
1. [ ] Go to your app: https://your-frontend.onrender.com
2. [ ] Log in with your test account
3. [ ] Navigate to **Payments/Subscribe**
4. [ ] Select **Basic** plan ($19.99)
5. [ ] Click **Pay with Paychangu**
6. [ ] You should be redirected to **Paychangu Checkout**
7. [ ] Use test card: `4242 4242 4242 4242` (or per Paychangu test cards)
8. [ ] Enter any future expiry: `12/25`
9. [ ] Enter any CVV: `123`
10. [ ] Complete payment
11. [ ] You should return to the app with **Success**
12. [ ] Verify messaging is now unlocked

### Alternative: Test via cURL:
```bash
# Get your JWT token by logging in first, then:
TOKEN="your-jwt-token-here"
BACKEND="https://your-backend.onrender.com"

curl -X POST ${BACKEND}/api/payments/create-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"planId":"basic","provider":"paychangu"}'
```

Expected response:
```json
{
  "checkoutUrl": "https://api.paychangu.com/checkout/...",
  "paymentId": "1708372800123-abc123"
}
```

---

## 📊 Step 5: Verify Configuration (5 minutes)

### Check Backend Logs:
1. [ ] Go to https://dashboard.render.com
2. [ ] Open your **Backend Service** → **Logs**
3. [ ] Look for successful logs:
   ```
   [create-session] Payment created successfully
   [create-session] Calling Paychangu API
   [create-session] Paychangu response: { status: 200 }
   [create-session] Paychangu checkout URL received
   ```

### Check Payment Records:
1. [ ] In your app, go to **Payment History**
2. [ ] Should show your test payment with status: `succeeded`
3. [ ] Messaging should be unlocked

### Check Error Logs:
If you see errors, search for:
```
PAYCHANGU_SECRET not configured
Paychangu API call failed
Invalid webhook signature
Payment not found
```

Refer to [PAYCHANGU_SETUP_GUIDE.md](PAYCHANGU_SETUP_GUIDE.md#-troubleshooting) for fixes.

---

## ✅ Step 6: Go Live Certification

Before enabling for real users, verify:

### Payment Flow:
- [ ] Payment creation works (`POST /api/payments/create-session`)
- [ ] Paychangu redirects correctly back to app
- [ ] Payment status is marked as `succeeded`
- [ ] User messaging is unlocked

### Feature Unlocking:
- [ ] Basic plan → messaging unlocked
- [ ] Premium plan → subscription active (30 days)
- [ ] Platinum plan → all features unlocked

### Security:
- [ ] `PAYCHANGU_SECRET` is NOT the test key
- [ ] `PAYCHANGU_API_BASE` is `https://api.paychangu.com` (not test)
- [ ] Webhook signature validation passes
- [ ] HTTPS is enabled (Render provides automatically)

### Logging:
- [ ] Backend logs show Paychangu API calls
- [ ] Webhook logs show successful signature verification
- [ ] Error logs are clear and helpful for debugging

---

## 🎯 Success Criteria

You can consider Paychangu **LIVE** when:

✅ Test payment completes successfully  
✅ User receives messaging access  
✅ Backend logs show successful Paychangu integration  
✅ Webhook is being called and verified  
✅ Payment history displays correctly  
✅ No errors in logs  
✅ Live credentials configured (not test)  

---

## 📞 Quick Support

**Problem with Paychangu?**
- Email: support@paychangu.com
- Docs: https://docs.paychangu.com

**Problem with app integration?**
- Check backend logs
- Review [PAYCHANGU_SETUP_GUIDE.md](PAYCHANGU_SETUP_GUIDE.md)
- Check [PAYMENT_DEBUG_STEPS.txt](PAYMENT_DEBUG_STEPS.txt)

---

## 🚀 Configuration Summary

Your app is now ready to use Paychangu! The backend already has all the code needed. You just need to:

1. **Gather** Paychangu credentials from dashboard
2. **Register** webhook in Paychangu
3. **Set** environment variables in Render
4. **Test** a payment end-to-end
5. **Go live** - users can now pay!

**Estimated Total Time**: 30 minutes

---

**Date**: February 25, 2026  
**Status**: 🟢 Ready to Configure
