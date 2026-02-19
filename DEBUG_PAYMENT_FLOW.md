# Payment Flow Debugging Guide

## Issue
Frontend shows `sessionId=undefined` after clicking "Choose Plan" → redirects to Paychangu → returns to app.

## Root Cause Analysis

The flow should be:
1. Frontend POST `/api/payments/create-session` with `{ planId, provider: 'paychangu' }`.
2. Backend returns `{ checkoutUrl: "<Paychangu URL>", paymentId: "..." }`.
3. Frontend redirects to `checkoutUrl` (Paychangu checkout).
4. User completes payment on Paychangu.
5. Paychangu redirects to backend `/api/payments/return?paymentId=...`.
6. Backend logs and finds payment, then redirects to `/payments?sessionId=<paymentId>`.

**Problem**: Step 6 is failing — either:
- Backend isn't receiving the redirect from Paychangu.
- Backend isn't finding the payment by ID.
- Backend is redirecting with `?error=missing_session` instead.

## Quick Debugging Steps

### Step 1: Check backend logs (Render)
Open Render Dashboard → Backend Service → Logs and search for:
```
/api/payments/return called with query:
```

This log shows exactly what query parameters Paychangu sent back. If you see:
- `query: { paymentId: "..." }` — backend received it.
- No log entry — Paychangu didn't redirect back (configuration issue).

### Step 2: Check what the backend is actually returning to frontend after redirect
After the Render logs show the `/return` call, check if the next log is:
```
Payment not found on return. Query:
```

If so, the backend couldn't find the payment — likely a mismatch between:
- The `paymentId` the backend generated when creating the session.
- The `paymentId` Paychangu sends back in the redirect.

### Step 3: Manually test the payment creation
Use this curl command to create a payment and see the exact response:

```bash
# Set these variables
BACKEND_URL="https://your-backend.onrender.com"
API_TOKEN="<your-jwt-token>"
PLAN_ID="basic"

curl -X POST "$BACKEND_URL/api/payments/create-session" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d "{\"planId\": \"$PLAN_ID\", \"provider\": \"paychangu\"}"
```

Expected response:
```json
{
  "checkoutUrl": "https://api.paychangu.com/...",
  "paymentId": "1708372800123-abc123def"
}
```

Copy the `paymentId` — this is the value Paychangu should echo back in the redirect.

### Step 4: Check Paychangu webhook/return configuration
In your Paychangu dashboard:
- **Return URL**: Should be `https://<backend>/api/payments/return`
- **Webhook URL**: Should be `https://<backend>/api/payments/webhook`

Verify these URLs are correct and reachable (test in browser — should show "Payments are currently disabled." or similar).

### Step 5: Tell Paychangu to use the correct query parameter name
Paychangu may return the payment ID under different names:
- `paymentId` ✓ (backend expects this)
- `id`
- `reference`
- `transaction_id`

Check your Paychangu API docs or dashboard to confirm which one they use. If it's not `paymentId`, the backend needs a small patch (or we already handle it in the `/return` route).

## Expected Render Backend Logs (Full Flow)

```
✓ Using Postgres database — connected. Counts: { users: 10, matches: 5, messages: 20, payments: 3 }
POST /api/payments/create-session
  Created payment: _id = 1708372800123-abc123def
  Called Paychangu API, got checkoutUrl
  Response: { checkoutUrl: "https://api.paychangu.com/...", paymentId: "1708372800123-abc123def" }

[User completes checkout on Paychangu]

GET /api/payments/return called with query: { paymentId: "1708372800123-abc123def" }
  Found payment in DB
  Provider is "paychangu", not verifying with Flutterwave
  Redirecting to frontend: https://edu-love.onrender.com/payments?sessionId=1708372800123-abc123def

[Frontend receives redirect, shows /payments?sessionId=...]
```

## Frontend Check (PaymentsPage.js)

Make sure the PaymentsPage component:
1. Reads `sessionId` from URL query params: `searchParams.get('sessionId')`
2. Handles `?error=missing_session` gracefully (shows error message).
3. Polls `/api/payments/sessions/:sessionId` to check if payment succeeded.

## Next Steps

1. **Check Render backend logs** for the `/api/payments/return called with query:` entry.
2. **Share the log output** — it will tell us exactly what Paychangu sent.
3. **Verify Paychangu webhook URLs** in their dashboard are pointing to the right backend service.
4. **If you don't see `/return` logs**, Paychangu may not be configured to redirect — check their settings.

---

**TL;DR**: The issue is one of:
- Paychangu not redirecting back to backend (config issue).
- Paychangu sending the payment ID under a different query param name (API mismatch).
- Payment not being found in the database (ID mismatch).

Check Render backend logs for the `/api/payments/return` entry to pinpoint which one.
