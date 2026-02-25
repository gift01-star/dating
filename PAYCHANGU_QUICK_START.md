# 🚀 Paychangu Quick Start - Next 30 Minutes

Your backend is ready for Paychangu! Here's exactly what to do now:

---

## ⏱️ 5-Minute Credential Gathering

1. **Open Paychangu Dashboard**
   - Go to: https://dashboard.paychangu.com
   - Login with your activated account

2. **Get Your API Credentials**
   - Click: **Settings** → **API Keys** (or Developers → API Keys)
   - You'll see:
     ```
     Secret Key:         SEC-xxxxxxxxxxxxxxxx
     Public Key:         PUB-xxxxxxxxxxxxxxxx (optional)
     Webhook Secret:     webhook_sec_xxxxxxxxx
     ```
   - **Copy these 3 values and save to a text file**

3. **Note Your API Environment**
   - Live API: `https://api.paychangu.com`
   - Test API: `https://test-api.paychangu.com` (skip for now - use live)

---

## ⏱️ 5-Minute Webhook Registration

1. **In Paychangu Dashboard**
   - Click: **Settings** → **Webhooks**
   - Click: **Add Webhook** or **New Webhook**

2. **Configure Webhook**
   - **Webhook URL**: (Get your backend URL first, see next step)
   - **Events to Enable**: 
     - ✅ `payment.success`
     - ✅ `payment.failed`
   - **Secret**: Paste your `Webhook Secret` from Step 2
   - Click: **Save** or **Add**

3. **Test Webhook** (optional)
   - Click the webhook you just created
   - Click **Test** or **Send Test Event**
   - You should see a success response

---

## ⏱️ 10-Minute Render Configuration

1. **Get Your Backend URL**
   - Go to: https://dashboard.render.com
   - Find your backend service (look for "edu-love-backend" or similar)
   - Copy the URL: `https://your-backend-name.onrender.com`
   - **This is needed for the webhook URL**

2. **Update Webhook URL in Paychangu** (if not done above)
   - Go back to Paychangu Dashboard → Settings → Webhooks
   - Edit your webhook
   - Set URL to: `https://your-backend-name.onrender.com/api/payments/webhook`
   - Save

3. **Add Environment Variables in Render**
   - In Render Dashboard, click your **Backend Service**
   - Go to: **Environment** (or look for Environment Variables)
   - Click **Add Environment Variable** and add these **EXACTLY**:

   ```
   Key: PAYCHANGU_SECRET
   Value: SEC-xxxxxxxxxxxxxxxxxxxx  (from Step 2 of credential gathering)
   ```

   ```
   Key: PAYCHANGU_WEBHOOK_SECRET
   Value: webhook_sec_xxxxxxxxxxxxxxxxxxxx  (from Step 2)
   ```

   ```
   Key: PAYCHANGU_API_BASE
   Value: https://api.paychangu.com
   ```

   ```
   Key: PAYMENTS_ENABLED
   Value: true
   ```

4. **Verify These Are Already Set**
   - `BACKEND_URL` = `https://your-backend-name.onrender.com`
   - `FRONTEND_URL` = `https://your-frontend-name.vercel.app`
   
   If missing, add them too.

5. **Save and Restart**
   - Click **Save** or **Deploy**
   - Render will restart your backend (takes ~1-2 minutes)
   - Wait for it to show "Live" status

---

## ⏱️ 10-Minute Testing

### Test Via Frontend UI (Easiest):

1. **Go to Your App**
   - Open: `https://your-frontend.vercel.app`
   - **Log in** with your test account

2. **Start Payment**
   - Click: **Payments** or **Subscribe**
   - Choose: **Basic** plan ($19.99)
   - Click: **Pay** or **Continue to Payment**

3. **Paychangu Modal Opens**
   - You should see the Paychangu checkout page
   - If it doesn't appear, see **Troubleshooting** below

4. **Complete Test Payment**
   - Use test card: `4242 4242 4242 4242`
   - Expiry: `12/25` (any future date)
   - CVV: `123` (any 3 digits)
   - Click **Complete Payment**

5. **Success!**
   - You should return to app with "✅ Payment Successful"
   - Check your messaging is now unlocked
   - Payment shows in **Payment History**

### Alternative: Test Via Command Line

```bash
# 1. Get your JWT token by logging in first

# 2. Run this command (replace placeholders):
TOKEN="your-jwt-token-from-login"
BACKEND="https://your-backend.onrender.com"

curl -X POST ${BACKEND}/api/payments/create-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"planId":"basic","provider":"paychangu"}'

# 3. Look for response like:
# {
#   "checkoutUrl": "https://api.paychangu.com/checkout/...",
#   "paymentId": "..."
# }

# 4. Open the checkoutUrl in your browser
# 5. Complete the payment with test card details (above)
```

---

## 🔍 Quick Verification

Your Paychangu is working when you see **ALL** of these:

✅ Backend environment variables saved and service restarted  
✅ Webhook URL registered in Paychangu dashboard  
✅ Frontend shows Paychangu checkout modal  
✅ Test payment completes with success page  
✅ Messaging is unlocked after payment  
✅ Backend logs show: `[create-session] Paychangu checkout URL received`  

---

## 🐛 Quick Troubleshooting

### Problem: "No checkout modal appears"
**Check:**
- [ ] `PAYCHANGU_SECRET` is set (not the test key)
- [ ] Backend service is "Live" (not restarting)
- [ ] Backend logs for errors (search "Paychangu")

**Fix:**
- Restart backend service manually
- Check backend logs in Render dashboard

---

### Problem: "Backend logs show: 'No Paychangu key configured'"
**Check:**
- [ ] `PAYCHANGU_SECRET` is exactly from your dashboard
- [ ] It's NOT the test key: `SEC-TEST-n6...`
- [ ] No extra spaces in the key

**Fix:**
- Go to Render → Environment Variables
- Re-enter the `PAYCHANGU_SECRET` exactly (copy from Paychangu)
- Redeploy/restart service

---

### Problem: "Payment completes but messaging not unlocked"
**Check:**
- [ ] Webhook URL in Paychangu is correct
- [ ] Backend logs show webhook received
- [ ] Payment status in DB shows "succeeded"

**Fix:**
- Wait 10-15 seconds for webhook to process
- Check backend logs for: "Webhook processing error"
- Try manual unlock: POST `/api/payments/complete/{paymentId}`

---

### Problem: "Paychangu says invalid webhook signature"
**Check:**
- [ ] `PAYCHANGU_WEBHOOK_SECRET` matches Paychangu dashboard exactly
- [ ] Webhook URL doesn't have typos

**Fix:**
- Go to Paychangu → Settings → Webhooks
- Copy the exact secret
- Update `PAYCHANGU_WEBHOOK_SECRET` in Render
- Re-test webhook in Paychangu dashboard

---

## 📊 What Happens When Payment Succeeds?

1. **Payment Created** → Stored in database as `pending`
2. **User Redirected to Paychangu** → Completes payment
3. **Paychangu Redirects Back** → `/api/payments/return`
4. **Backend Marks as Succeeded** → Payment status = `succeeded`
5. **User Features Unlocked** → 
   - ✅ Messaging unlocked
   - ✅ Subscription activated (30 days if Premium/Platinum)
6. **Webhook Sent** (async) → Double-verification
7. **Final Confirmation** → Frontend shows success

---

## 🎯 Next Steps After Successful Test

1. **Verify in Dashboard**
   - [ ] Open Paychangu dashboard
   - [ ] Go to Transactions
   - [ ] You should see your test payment listed
   - [ ] Status should be: "Completed" or "Successful"

2. **Check Your App**
   - [ ] Payment appears in **Payment History**
   - [ ] User subscription is active
   - [ ] Messaging is unlocked

3. **Check Logs**
   - [ ] Render backend logs show successful Paychangu calls
   - [ ] No errors related to payments
   - [ ] Webhook was received successfully

4. **You're Live!** 🎉
   - Payments are now working
   - Real users can subscribe
   - Money will be processed by Paychangu

---

## 📞 Need Help?

**Paychangu Support:**
- Email: support@paychangu.com
- Docs: https://docs.paychangu.com

**This App's Payment Docs:**
- Full guide: [PAYCHANGU_SETUP_GUIDE.md](PAYCHANGU_SETUP_GUIDE.md)
- Checklist: [PAYCHANGU_CONFIG_CHECKLIST.md](PAYCHANGU_CONFIG_CHECKLIST.md)
- Debug tips: [PAYMENT_DEBUG_STEPS.txt](PAYMENT_DEBUG_STEPS.txt)

---

## ✨ Summary

You now have:
- ✅ Backend code for Paychangu (already implemented)
- ✅ Frontend payment page (already implemented)
- ✅ Database schema for payments (already in place)
- ✅ Webhook handling (already coded)

You need to:
- ✅ Add your Paychangu credentials to Render (this guide)
- ✅ Test one end-to-end payment (this guide)
- ✅ You're done! 🎉

---

**Total Time:** ~30 minutes  
**Difficulty:** Easy  
**Status:** 🟢 Ready to Configure  
**Date:** February 25, 2026

---

### 🚀 Ready? Start with: **Gathering Credentials Above**
