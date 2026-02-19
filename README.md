# 💘 EDULOVE - Inter-University Dating Platform

**EduLove** is a secure, student-only dating platform that connects verified university students across different universities for friendship, dating, and meaningful relationships.

---

## 🎯 Quick Overview

| Aspect | Details |
|--------|---------|
| **Platform Name** | EduLove |
| **Target Users** | University & college students (18+) |
| **Focus** | Inter-university connections |
| **Key Feature** | Verified students only |
| **MVP Timeline** | 10-11 weeks |

---

## 📋 Core Features (MVP)

### 👤 User Accounts
- Register / Login with email
- Student verification (university email, student ID, or admin approval)
- Complete profile with:
  - Name / Nickname
  - Gender
  - Date of birth (18+ verification)
  - University
  - Course / Faculty
  - Year of study
  - Interests & Bio
  - Relationship goal (Dating, Hookup, Friendship, Other)
  - Up to 5 photos

### 💕 Matching System
- Like / Pass profiles
- Mutual matching (both must like)
- Smart filters:
  - University
  - Gender
  - Age range
  - Interests
  - Relationship goal (Dating / Hookup / Friendship)

### 💬 Messaging
- Chat after match
- Text + emoji support
- Block / Report users

### 🚨 Safety & Moderation
- User reporting system
- Block functionality
- Admin moderation panel
- Community rules enforcement

### 🛠 Admin Dashboard
- Approve/reject student accounts
- View user profiles
- Handle reports
- Ban/suspend users
- Analytics dashboard

---

## 🏗️ Technical Stack (Recommended)

### Frontend
- **React.js**
- HTML5 / CSS3 / Tailwind CSS
- JavaScript

### Backend
- **Node.js + Express**
- REST API

### Database
- **MongoDB Atlas** (default)
- **Postgres** — supported via `DATABASE_URL` (set this in Render or your hosting provider to enable Postgres persistence). See `RENDER_DEPLOYMENT.md` for details on Postgres and payments configuration.
- **Redis (optional)** — the backend supports a Redis cache when `REDIS_URL` is set; it is used for short-term caching (user lookups, payment verification), and for Redis-backed rate-limiting in production.

### Security
- JWT authentication
- bcrypt password hashing
- HTTPS/SSL

### Image Storage
- Cloudinary or Firebase Storage

### Hosting
- **Frontend:** Vercel / Netlify
- **Backend:** Render / Railway
- **Database:** MongoDB Atlas

---

## 💾 Database Schema

### Users Collection
```
id
name
email
password (hashed)
gender
dob
university
course
year
interests[]
bio
photos[]
verified (boolean)
createdAt
```

### Matches Collection
```
user1
user2
matchedAt
```

### Messages Collection
```
matchId
senderId
message
timestamp
```

### Reports Collection
```
reportedUser
reportedBy
reason
status
```

---

## 🔐 Security Checklist

- [ ] HTTPS/SSL enabled
- [ ] Password encryption (bcrypt)
- [ ] Input validation
- [ ] Rate limiting
- [ ] SQL Injection protection
- [ ] XSS prevention
- [ ] CSRF protection

---

## ⚖️ Legal Documents (Required)

- [ ] Terms & Conditions
- [ ] Privacy Policy
- [ ] Community Guidelines

**Must Include:**
- 18+ only policy
- Data protection clauses
- Consent & safety rules
- Account termination policies

---

## 💰 Monetization Plan

### Free Tier
- Basic matching
- Limited likes (20/day)
- Standard chat

### Premium Tier ($2-$5/month)
- Unlimited likes
- See who liked you
- Advanced filters
- Profile boost visibility

---

## 📈 Development Timeline

| Phase | Duration |
|-------|----------|
| Planning & Design | 1-2 weeks |
| Backend Development | 3 weeks |
| Frontend UI | 3 weeks |
| Testing & Security | 2 weeks |
| Beta Launch | 1 week |
| **Total** | **10-11 weeks** |

---

## 🚀 Future Roadmap

After MVP launch:
- Mobile app (React Native)
- AI-powered matchmaking
- Video profiles
- Events & meetups feature
- Expand to more countries

---

## 🛑 Risk Management

| Risk | Solution |
|------|----------|
| Fake accounts | Strong verification system |
| User abuse | Fast moderation team |
| Low trust | Transparency & clear rules |
| Cultural issues | Respect local norms |

---

## 📞 Next Steps

**Which direction would you like to start with?**

1️⃣ **Full website code (step-by-step)** - Build complete frontend UI first
2️⃣ **Database + backend first** - Set up architecture and APIs
3️⃣ **UI/UX design first** - Design mockups and prototypes
4️⃣ **Complete MVP all-in-one** - Everything together

Reply with your choice number (1, 2, 3, or 4) to begin building! 🚀

---

**Project Status:** Planning Phase ✓
**Last Updated:** January 15, 2026

---

## Enabling real payments (Paychangu / Changu)

To enable production payments with Paychangu (also referenced as "Changu"), set the provider credentials in your backend environment and configure your webhook endpoint so Paychangu can notify your app of payment events.

- **Backend .env**: Copy `backend/.env.example` to `backend/.env` and fill the keys below:
  - `PAYMENTS_ENABLED=true`
  - `PAYCHANGU_SECRET` — your Paychangu API secret (starts with `SEC-`)
  - `PAYCHANGU_API_BASE` — optional (defaults to `https://api.paychangu.com`)
  - `PAYCHANGU_WEBHOOK_SECRET` — webhook signing secret used to verify incoming webhooks
  - `FRONTEND_URL` / `BACKEND_URL` — set these so checkout return URLs redirect correctly

- **Webhook URL**: Configure your Paychangu webhook to POST to:

  <BACKEND_URL>/api/payments/webhook

  The backend verifies signatures against `PAYCHANGU_WEBHOOK_SECRET`. Ensure the webhook path is reachable from Paychangu (use ngrok in local development or set up the correct DNS/HTTPS in production).

- **Testing locally**:
  1. Start your backend with the `.env` values set.
  2. Use the Payments page in the frontend to create a session; you will be redirected to Paychangu's hosted checkout.
  3. After completing checkout, Paychangu will redirect back to the backend return route which forwards to the frontend with `sessionId`.
  4. The frontend polls `/api/payments/sessions/:id` to confirm status.

- **Notes**:
  - The backend falls back to Flutterwave if configured; if neither provider keys are set, the app uses local test flows.
  - Keep your webhook secret and API keys private and rotate them periodically.
