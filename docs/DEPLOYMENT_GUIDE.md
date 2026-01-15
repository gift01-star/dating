# EduLove - Deployment Guide

## Prerequisites

Before deploying, ensure you have:
- Node.js v16+ installed
- MongoDB Atlas account (free tier available)
- Cloudinary account for image storage
- Git and GitHub account
- Vercel or Netlify account for frontend

---

## Step 1: Backend Setup

### 1.1 Clone Repository
```bash
cd /workspaces/dating/backend
npm install
```

### 1.2 Environment Variables
Create `.env` file:
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/edulove
JWT_SECRET=your_strong_jwt_secret_here
JWT_EXPIRE=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=https://your-frontend-domain.com
```

### 1.3 Deploy Backend to Render

1. Push code to GitHub
2. Visit [Render.com](https://render.com)
3. Create new "Web Service"
4. Connect GitHub repository
5. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment Variables:** Copy from `.env`
6. Deploy!

**Backend URL:** `https://your-backend.onrender.com`

---

## Step 2: Frontend Setup

### 2.1 Update API URL
Edit `frontend/.env`:
```env
REACT_APP_API_URL=https://your-backend.onrender.com/api
```

### 2.2 Deploy to Vercel

1. Push to GitHub
2. Visit [Vercel.com](https://vercel.com)
3. Import GitHub repository
4. Configure:
   - **Framework:** React
   - **Root Directory:** `frontend`
5. Add Environment Variables from `.env`
6. Deploy!

**Frontend URL:** `https://your-edulove.vercel.app`

---

## Step 3: Database Setup (MongoDB)

### 3.1 Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Create database user
4. Whitelist IP addresses
5. Copy connection string

### 3.2 Add to Backend `.env`
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/edulove
```

---

## Step 4: Image Storage (Cloudinary)

### 4.1 Setup Cloudinary
1. Create [Cloudinary](https://cloudinary.com) account (free tier)
2. Get credentials from dashboard
3. Add to backend `.env`

---

## Step 5: Domain & SSL

### 5.1 Custom Domain
1. Purchase domain from provider (Namecheap, GoDaddy, etc.)
2. Update DNS records:
   - **Frontend:** Point to Vercel nameservers
   - **Backend:** Point to Render nameservers

### 5.2 SSL Certificate
- Vercel: Automatic SSL
- Render: Automatic SSL
- Custom domain: Use Let's Encrypt (free)

---

## Step 6: Testing

### Test Backend
```bash
curl https://your-backend.onrender.com/api/health
# Should return: {"status":"Server is running",...}
```

### Test Frontend
Visit: `https://your-edulove.vercel.app`
- Try registration
- Try login
- Try profile creation

---

## Production Checklist

- [ ] All environment variables set securely
- [ ] HTTPS enabled on all services
- [ ] Database backups configured
- [ ] Rate limiting active
- [ ] CORS properly configured
- [ ] Error logging enabled
- [ ] Admin user created
- [ ] Legal documents posted
- [ ] Email verification working (if implemented)
- [ ] Content moderation ready

---

## Monitoring

### Uptime Monitoring
- Use Uptimerobot.com (free tier)
- Monitor backend health endpoint
- Get alerts on downtime

### Error Tracking
- Use Sentry.io for error logging
- Get real-time alerts for crashes

### Analytics
- Implement Google Analytics
- Track user behavior

---

## Performance Optimization

### Frontend
```bash
npm run build
# Check bundle size
npm install -g serve
serve build
```

### Backend
- Enable database indexing
- Implement caching
- Use CDN for images

---

## Scaling for Growth

### Auto-scaling
- Render: Enable auto-scaling
- MongoDB: Upgrade to paid cluster
- Cloudinary: Adjust image optimization

### Database Optimization
- Create indexes on frequently queried fields
- Archive old messages
- Implement pagination

### API Rate Limiting
Already implemented in server.js (100 requests per 15 min)

---

## Support

For deployment issues:
- Check Render logs: Settings → Logs
- Check Vercel logs: Deployments → Logs
- Check MongoDB Atlas: Activity Feed
- Review browser console for frontend errors

---

## Post-Launch Checklist

- [ ] Monitor user signups
- [ ] Review initial user feedback
- [ ] Test admin dashboard
- [ ] Verify student verification system
- [ ] Monitor server performance
- [ ] Check error rates
- [ ] Plan next features

---

**Deployment Date:** January 15, 2026
**Next Review:** January 22, 2026
