# Render Deployment Guide

This guide walks you through deploying the EduLove dating platform to Render.

## Prerequisites

- GitHub account with the repository connected
- Render account (https://render.com)
- Git CLI installed locally

## Step 1: Push Code to GitHub

Ensure all changes are committed and pushed:

```bash
git add .
git commit -m "Fix frontend MIME types, auto-verify emails, normalize message fields, add Render config"
git push origin main
```

## Step 2: Deploy via Render Dashboard (Recommended)

### Option A: Use Blueprint (Easiest)

1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Select **"Deploy an existing repository"** → Connect your GitHub repo
4. You should see the `render.yaml` blueprint
5. Click **"Apply"** → This will create both `edulove-backend` and `edulove-frontend` services

### Option B: Manual Setup

If the blueprint doesn't appear, create services manually:

#### Backend Service
1. **Name:** `edulove-backend`
2. **Runtime:** Node
3. **Build Command:** `cd backend && npm install`
4. **Start Command:** `cd backend && npm start`
5. **Environment Variables:**
   ```
   NODE_ENV=production
   JWT_SECRET=<your-strong-secret-key>
   FRONTEND_URL=https://<your-frontend-url>.onrender.com
   BACKEND_URL=https://<your-backend-url>.onrender.com
   PAYMENTS_ENABLED=false
   PORT=5000
   DATABASE_URL=<optional-postgres-url>
   ```
6. Click **"Create Web Service"**

#### Frontend Service
1. **Name:** `edulove-frontend`
2. **Runtime:** Node
3. **Build Command:** `cd frontend && npm install && npm run build`
4. **Start Command:** `cd frontend && npm run start:prod`
5. **Environment Variables:**
   ```
   REACT_APP_API_URL=https://<your-backend-url>.onrender.com/api
   FRONTEND_URL=https://<your-frontend-url>.onrender.com
   NODE_ENV=production
   PORT=3000
   ```
6. Click **"Create Web Service"**

## Step 3: Set Environment Variables

After services are created:

1. For each service, go to **Settings** → **Environment**
2. Add/update the required variables (see above)
3. Services will auto-redeploy

## Step 4: Enable Auto-Deploy

For each service:
1. Go to **Settings** → **Deploy**
2. Set **Auto-Deploy** to **"Yes"**
3. This will redeploy whenever you push to `main`

## Step 5: Monitor Deployment

1. In the Render dashboard, click each service
2. Go to the **Logs** tab to watch the build and start process
3. Once both services show "Live", test:
   - Frontend: Visit `https://<your-frontend-url>.onrender.com`
   - Backend: Visit `https://<your-backend-url>.onrender.com/api/health` (if endpoint exists)

## Troubleshooting

### Frontend shows 404 or white page
- Check **Logs** for build errors
- Ensure `REACT_APP_API_URL` points to your backend
- Confirm `frontend/build/` was created during build

### Backend errors
- Check **Logs** for connection/auth issues
- Verify `JWT_SECRET` is set
- If using database, check `DATABASE_URL` format

### Services not deploying
- Confirm `render.yaml` is in the repo root
- Check that all required environment variables are set
- Look at build logs for npm install errors

## Local Testing (Before Deployment)

To test locally:

```bash
# 1. Install dependencies
npm --prefix backend install
npm --prefix frontend install

# 2. Build frontend
npm --prefix frontend run build

# 3. Start backend (in one terminal)
npm --prefix backend start

# 4. Start frontend (in another terminal)
npm --prefix frontend start:prod

# 5. Open http://localhost:3000
```

## Post-Deployment Checklist

- [ ] Backend service is "Live"
- [ ] Frontend service is "Live"
- [ ] Can register a new account
- [ ] Can login with registered email
- [ ] Can view profile page
- [ ] Can send messages in chat
- [ ] Payment page loads without errors
- [ ] No 404 errors in browser console

## Updating After Changes

Once auto-deploy is enabled, simply push changes:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Render will automatically rebuild and redeploy both services.

## Need Help?

- Render docs: https://render.com/docs
- Check service logs in the Render dashboard for specific errors
