# EduLove - README

## 💘 Inter-University Dating Platform

**EduLove** is a secure, student-only dating platform that connects verified university students across different universities for friendship, dating, and meaningful relationships.

---

## 🎯 Key Features

✅ **Student Verification** - Only verified students can use the platform
✅ **Smart Matching** - Like/Pass system with mutual matching
✅ **Messaging** - Private chat between matched users
✅ **Safety First** - Reporting, blocking, and moderation
✅ **Admin Dashboard** - Manage users, reports, and platform health
✅ **Responsive Design** - Works on mobile and desktop

---

## 🏗️ Tech Stack

### Frontend
- **React.js** - UI framework
- **Tailwind CSS** - Styling
- **Axios** - API communication
- **React Router** - Navigation

### Backend
- **Node.js + Express** - Server
- **MongoDB** - Database
- **JWT** - Authentication
- **Bcrypt** - Password hashing

### Deployment
- **Vercel** - Frontend hosting
- **Render** - Backend hosting
- **MongoDB Atlas** - Cloud database
- **Cloudinary** - Image storage

---

## 🚀 Quick Start

### Development

**Backend:**
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:5000`

**Frontend:**
```bash
cd frontend
npm install
npm start
```
Frontend runs on `http://localhost:3000`

### Production

See [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) for full deployment instructions.

---

## 📋 API Documentation

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Verify token

### Users
- `GET /api/users/discover` - Get profiles to swipe
- `GET /api/users/profile/:id` - Get user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/block/:id` - Block user
- `POST /api/users/unblock/:id` - Unblock user

### Matches
- `POST /api/matches/like/:userId` - Like user
- `POST /api/matches/pass/:userId` - Pass on user
- `GET /api/matches` - Get all matches

### Messages
- `POST /api/messages/:matchId` - Send message
- `GET /api/messages/:matchId` - Get messages
- `GET /api/messages/unread/count` - Unread count

### Reports
- `POST /api/reports` - Report user

### Admin
- `GET /api/admin/stats` - Dashboard stats
- `GET /api/admin/users/unverified` - Unverified users
- `PUT /api/admin/users/:id/verify` - Verify user
- `PUT /api/admin/users/:id/ban` - Ban user
- `GET /api/admin/reports` - All reports
- `PUT /api/admin/reports/:id` - Resolve report

---

## 📁 Project Structure

```
edulove/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Match.js
│   │   ├── Message.js
│   │   └── Report.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── matches.js
│   │   ├── messages.js
│   │   ├── reports.js
│   │   └── admin.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js
│   │   │   ├── DiscoverPage.js
│   │   │   ├── MatchesPage.js
│   │   │   ├── ChatPage.js
│   │   │   ├── ProfilePage.js
│   │   │   └── AdminDashboard.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   └── .env
│
└── docs/
    ├── TERMS_AND_CONDITIONS.md
    ├── PRIVACY_POLICY.md
    ├── COMMUNITY_GUIDELINES.md
    └── DEPLOYMENT_GUIDE.md
```

---

## 🔐 Security Features

✅ HTTPS/SSL encryption
✅ Password hashing with bcrypt
✅ JWT authentication
✅ Input validation
✅ Rate limiting (100 req/15 min)
✅ CORS protection
✅ Student verification requirement
✅ User reporting and moderation

---

## ⚖️ Legal Documents

- [Terms & Conditions](./docs/TERMS_AND_CONDITIONS.md)
- [Privacy Policy](./docs/PRIVACY_POLICY.md)
- [Community Guidelines](./docs/COMMUNITY_GUIDELINES.md)

---

## 🛣️ Roadmap

### Phase 1: MVP (Current)
✅ User registration & login
✅ Student verification
✅ Profile creation
✅ Matching system
✅ Messaging
✅ Basic moderation

### Phase 2: Enhancement
🔲 Photo upload optimization
🔲 Video profiles
🔲 Advanced filters
🔲 Premium features
🔲 Email notifications

### Phase 3: Scaling
🔲 Mobile app (React Native)
🔲 AI matchmaking
🔲 Events & meetups
🔲 Multi-country support
🔲 Payment integration

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📞 Support

- **Issues:** GitHub Issues
- **Email:** support@edulove.com
- **Safety:** safety@edulove.com
- **Privacy:** privacy@edulove.com

---

## ⚠️ Important Policies

### Age Requirement
**EduLove is exclusively for users aged 18+.** We verify age and take this seriously.

### Student Only
Must be a verified student at an accredited university or college.

### Zero Tolerance
Fake profiles, harassment, or explicit content results in immediate ban.

---

## 📊 Platform Statistics

- **Total Users:** [Will update upon launch]
- **Verified Users:** [Will update upon launch]
- **Daily Active Users:** [Will update upon launch]
- **Messages Sent:** [Will update upon launch]

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🎉 Launch Status

**Current Status:** Ready for Launch ✅
**Launch Date:** January 15, 2026
**Version:** 1.0.0

---

## 👥 Team

- **Founder:** EduLove Team
- **Development:** Full Stack Team
- **Design:** UX/UI Team
- **Community:** Moderation Team

---

**Built with ❤️ for Students**

For questions or feedback, contact us at: info@edulove.com

---

*Last Updated: January 15, 2026*
