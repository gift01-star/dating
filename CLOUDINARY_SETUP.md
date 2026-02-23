# Cloudinary Setup Guide - Fix Disappearing Images

## Problem
Images stored locally in the `./uploads` folder disappear when the server restarts or redeploys. This is because local file storage is not persistent in most deployment environments (Render, Heroku, etc.).

## Solution: Use Cloudinary Cloud Storage

Cloudinary is a free cloud storage service that permanently stores your images. Once set up, all user profile photos will be stored reliably and won't disappear.

## Setup Instructions

### 1. Create a Free Cloudinary Account
- Go to [cloudinary.com/users/register](https://cloudinary.com/users/register)
- Sign up with your email
- Verify your account

### 2. Get Your API Credentials
- Log in to your Cloudinary dashboard
- Go to the **Settings** page (gear icon)
- Scroll down to find your **API keys**:
  - `Cloud Name` 
  - `API Key`
  - `API Secret`

### 3. Add Environment Variables

Add these to your `.env` file in the backend:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

Or if deploying on Render:
1. Go to your Render service dashboard
2. Click **Environment** in the left sidebar
3. Add the three environment variables above
4. Save and redeploy

### 4. Restart Your Server
Once environment variables are set, restart the backend. You should see:
```
✓ Cloudinary configured for image storage
```

### How It Works

**Before (with local storage):**
```
User uploads photo → Stored in ./uploads → Server restarts → Files lost 😢
```

**After (with Cloudinary):**
```
User uploads photo → Stored in Cloudinary cloud → Server restarts → Photos still there! ✅
```

## What Happens to Old Photos?

Old photos stored locally in `./uploads` will not be automatically migrated. When users upload new photos, those will be stored in Cloudinary permanently.

## Free Plan Limits

Cloudinary's free plan includes:
- **Up to 25GB** of storage
- **100M transformations** per month
- Perfect for most university dating app use cases

## Verification

After setup, test by:
1. Uploading a new photo from a user profile
2. Restarting the server
3. Checking if the photo is still visible

The photo should persist without errors.

## Troubleshooting

### "Cloudinary not configured" warning
- Check that `.env` variables are correctly set
- Ensure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are all present
- Restart the server after adding variables

### Photo upload fails
- Check API credentials are correct
- Verify the free plan hasn't exceeded storage (unlikely unless you have 25GB+ of photos)
- Check backend logs for detailed error messages

### Still seeing local storage warning
- Backend falls back to local storage if Cloudinary is not configured
- This is fine for development, but not recommended for production

## More Info
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudinary Pricing](https://cloudinary.com/pricing)
