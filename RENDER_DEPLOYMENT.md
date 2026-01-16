# Deploy EduLove to Render

Follow these steps to deploy your dating platform to Render.

## Prerequisites
- A Render account (https://render.com)
- GitHub repository with your code pushed

## Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Prepare for Render deployment"
git push -u origin main
```

## Step 2: Create Render Services

### Option A: Use Render Dashboard (Recommended)

1. Go to https://dashboard.render.com
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Create Backend Service:
   - **Name:** edulove-backend
   - **Environment:** Node
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `cd backend && npm start`
   - **Plan:** Free (or select your preference)

5. Add Environment Variables for Backend:
   - `JWT_SECRET`: Set a strong secret (e.g., generate one)
   - `NODE_ENV`: production
   - `FRONTEND_URL`: https://edulove-frontend.onrender.com
   - `PORT`: 5000

6. Deploy the backend first and note its URL (e.g., https://edulove-backend.onrender.com)

7. Create Frontend Service:
   - **Name:** edulove-frontend
   - **Environment:** Static Site
   - **Build Command:** `cd frontend && npm install && npm run build`
   - **Publish Directory:** `frontend/build`
   - **Plan:** Free (or select your preference)

8. Add Environment Variables for Frontend:
   - `REACT_APP_API_URL`: https://edulove-backend.onrender.com (use your backend URL)

### Option B: Use render.yaml (Infrastructure as Code)

1. Make sure `render.yaml` is in the root directory
2. Connect your GitHub repo to Render
3. Render will automatically detect and deploy both services based on render.yaml

## Step 3: Verify Deployment

1. Backend should be live at: `https://edulove-backend.onrender.com`
2. Frontend should be live at: `https://edulove-frontend.onrender.com`
3. Test the API: `https://edulove-backend.onrender.com/api/health`
4. Access the app: `https://edulove-frontend.onrender.com`

## Environment Variables Reference

### Backend (.env or Render env vars)
```
NODE_ENV=production
JWT_SECRET=your-secret-key-here
PORT=5000
FRONTEND_URL=https://edulove-frontend.onrender.com
```

### Frontend (.env or Render env vars)
```
REACT_APP_API_URL=https://edulove-backend.onrender.com
```

## Troubleshooting

### Backend not starting
- Check the build logs in Render dashboard
- Verify all dependencies are in package.json
- Ensure PORT environment variable is set

### CORS errors
- Make sure FRONTEND_URL is correct in backend env vars
- The backend has been updated to allow Render domains

### Frontend not loading API
- Check REACT_APP_API_URL is set to correct backend URL
- Rebuild frontend after changing env vars

### Cold starts
- Free tier services may have startup delays
- Upgrade to paid plan for better performance

## Custom Domain (Optional)

1. In Render dashboard, go to your frontend service
2. Click "Settings" → "Custom Domains"
3. Add your domain and follow DNS instructions
4. Update frontend CORS in backend if needed

## Important Notes

- Free tier services sleep after 15 minutes of inactivity
- For production, consider upgrading to paid tiers
- Always use strong JWT_SECRET in production
- Never commit .env files with secrets to GitHub
- Use Render's environment variable management

## Next Steps

1. Monitor your deployment in the Render dashboard
2. Set up error tracking (optional)
3. Plan database migration (currently using in-memory storage)
4. Configure automated deployments on git push
