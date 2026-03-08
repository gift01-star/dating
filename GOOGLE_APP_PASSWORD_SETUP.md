# Gmail Setup with Google App Passwords

This guide explains how to set up Gmail with Google App Passwords for the EduLove dating app's email services.

## Why Google App Passwords?

Instead of using your actual Gmail password (which would be a security risk), Google App Passwords allow you to create a special password specifically for third-party applications like this dating app.

## Setup Steps

### 1. Enable 2-Factor Authentication (Required)

First, enable 2-Step Verification on your Google Account:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click **2-Step Verification** in the left sidebar
3. Follow the prompts to set up your preferred verification method (phone, authenticator app, etc.)
4. Complete the setup

### 2. Create an App Password

Once 2-Step Verification is enabled:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. In the left sidebar, click **App passwords** (this will only appear if 2FA is enabled)
3. If you don't see "App passwords", ensure 2-Step Verification is fully enabled
4. Select:
   - **App**: Mail
   - **Device**: Windows Computer (or your device type)
5. Google will generate a **16-character password**. **Copy this exactly** - you won't be able to see it again

### 3. Configure Environment Variables

Add the following to your `.env` file in the backend directory:

```env
# Gmail SMTP Configuration (using App Password)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx    # The 16-character App Password (copy exactly)
EMAIL_FROM=your-gmail@gmail.com       # Can be the same as EMAIL_USER
```

**Important:**
- Use your full Gmail address (including @gmail.com)
- Copy the App Password exactly as shown by Google (with or without spaces - Gmail will accept both)
- Never commit `.env` files to version control
- This password is specific to this app and doesn't expose your actual Gmail password

### 4. Test the Configuration

To test if your setup works:

1. Start the backend server:
   ```bash
   cd backend
   npm install  # Install updated dependencies (removes nodemailer-sendgrid-transport)
   npm run dev
   ```

2. Request a password reset through the API:
   ```bash
   curl -X POST http://localhost:5000/api/auth/request-reset \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

3. Check the server logs for confirmation:
   - ✅ Success: `[Reset] Password reset email sent to: user@example.com`
   - ❌ Error: Check the error message and verify your credentials

### 5. Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Your App Password is incorrect or doesn't have enough security settings. Regenerate it. |
| 2FA not enabled | You must enable 2-Step Verification first - App Passwords only work when 2FA is active |
| Can't find "App passwords" | Ensure 2-Step Verification is fully completed. The button appears automatically. |
| Email not sending | Check server logs for the exact error. Verify EMAIL_USER and EMAIL_PASSWORD are set correctly. |
| Using wrong account | Make sure EMAIL_USER matches the Gmail account where you created the App Password |

### 6. Revoke/Manage App Passwords

To remove access if compromised:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click **App passwords**
3. Select the app/device entry
4. Click **Delete**

The app will immediately lose access and need a new App Password to work again.

## What Was Removed

This update removes the previous SendGrid email service:

✅ **Removed:**
- SendGrid configuration
- `nodemailer-sendgrid-transport` dependency
- Complex email routing logic

✅ **Benefits:**
- Simpler setup (only Gmail needed)
- Better security (App Passwords are controlled by you)
- Lower cost (Gmail is free)
- Faster implementation

## Environment Variable Summary

```env
# Gmail SMTP (Required for email to work)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx    # 16-character App Password

# Optional
EMAIL_FROM=your-gmail@gmail.com       # Default sender address
FRONTEND_URL=https://your-domain.com  # For reset links in emails
```

If these aren't set, the app will still work but won't send emails (logs will show warnings).

---

For questions about Google Account security, visit: https://support.google.com/accounts
