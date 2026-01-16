# Quick Feature Testing Guide

## 🧪 Testing the Enhanced Dating Website

### Setup Instructions
```bash
# Backend Setup
cd backend
npm install
npm start

# Frontend Setup (in new terminal)
cd frontend
npm install
npm start
```

---

## 📱 Feature Testing Checklist

### 1. **Bottom Navigation Bar**
- [ ] Navigate to `/discover` after login
- [ ] See bottom navbar with 5 options: Discover, Matches, Likes, Messages, Profile
- [ ] Each icon has correct color (orange, pink, red, blue, purple)
- [ ] Active state highlights current page
- [ ] All buttons are clickable and responsive

### 2. **Discover Page**
- [ ] See profiles to swipe
- [ ] Click Like button → profile moves to next
- [ ] Click Pass button → profile moves to next
- [ ] View filter options
- [ ] Navigation bar visible at bottom

### 3. **Likes Page** 
- [ ] Go to `/likes`
- [ ] See profiles of people who liked you
- [ ] Each like shows:
  - [ ] Profile photo
  - [ ] Name
  - [ ] University
  - [ ] Course
  - [ ] Compatibility score
  - [ ] Like Back button
  - [ ] Pass button
- [ ] Click "Like Back" → match created
- [ ] Click "Pass" → like rejected
- [ ] Grid layout displays multiple likers

### 4. **Matches Page**
- [ ] Go to `/matches`
- [ ] See all mutual matches
- [ ] Each match shows profile information
- [ ] Click "Send Message" button
- [ ] Navigation bar visible

### 5. **Messages Hub**
- [ ] Go to `/messages`
- [ ] See all active conversations
- [ ] Each conversation shows:
  - [ ] User avatar
  - [ ] User name
  - [ ] Last message preview
  - [ ] Timestamp
  - [ ] Unread count (if any)
  - [ ] Online status (green dot)
- [ ] Search bar filters conversations
- [ ] Click conversation → opens chat
- [ ] Conversations sorted by most recent first

### 6. **Chat Page**
- [ ] Open a conversation
- [ ] See message history
- [ ] Send new messages
- [ ] Bottom navbar still visible
- [ ] Messages show sender/receiver correctly

### 7. **Profile Page**
- [ ] Go to `/profile`
- [ ] Edit profile information
- [ ] Upload photos
- [ ] View profile completion percentage
- [ ] Save changes
- [ ] Bottom navbar visible

---

## 🔄 User Flow Testing

### Complete Dating Flow:
1. **Discover** → Like a profile
2. **Check Likes** → Someone else liked you
3. **Likes Page** → Like them back
4. **Matches** → See the mutual match
5. **Messages** → Message appears in hub
6. **Chat** → Open and send messages
7. **Profile** → Update your information

---

## ✨ Matching Algorithm Testing

### Test Matching Factors:
```
Same Location: Should get ~25 points boost
Same University: Should get ~15 points boost
Same Age: Should get ~20 points boost
Shared Interests: Should score based on overlap
Same Course: Should get ~10 points boost
```

### Expected Match Scores:
- 🔥 85%+ = Perfect Match (green)
- 💕 70-84% = Great Match
- 💘 55-69% = Good Match
- 💝 40-54% = Potential Match
- ⭐ <40% = Maybe

---

## 🐛 Testing Edge Cases

### Test These Scenarios:
- [ ] Like someone who already liked you → instant match
- [ ] Pass on someone who liked you
- [ ] Search messages by person name
- [ ] Send message in conversation
- [ ] Check unread message count updates
- [ ] Switch between pages quickly
- [ ] Test on mobile view (responsive)
- [ ] Test with multiple accounts

---

## 📊 API Endpoint Testing

### Using Postman or curl:

#### Get Likes Received:
```bash
GET /matches/likes
Authorization: Bearer {token}
```

#### Get Conversations:
```bash
GET /messages/conversations
Authorization: Bearer {token}
```

#### Like Back:
```bash
POST /matches/like-back/{matchId}
Authorization: Bearer {token}
```

#### Pass Like:
```bash
POST /matches/pass-like/{matchId}
Authorization: Bearer {token}
```

---

## 💡 Demo Data Setup

### Create Test Accounts:
1. Create Account 1: name "Alice", female, interested in men
2. Create Account 2: name "Bob", male, interested in women
3. Have Alice like Bob
4. Check Bob's likes page
5. Have Bob like Alice back
6. Verify mutual match in matches page
7. Send messages between them

---

## 🎯 Performance Testing

- [ ] Page loads within 2 seconds
- [ ] Navigation between pages smooth
- [ ] No console errors
- [ ] Images load properly
- [ ] Buttons respond immediately
- [ ] Messages send/receive quickly
- [ ] Search filters instantly

---

## 🎨 UI/UX Testing

- [ ] Colors display correctly
- [ ] Icons are visible and clear
- [ ] Text is readable
- [ ] Buttons are clickable
- [ ] Forms are easy to fill
- [ ] Consistent styling across pages
- [ ] Proper spacing and alignment
- [ ] Mobile responsive

---

## ✅ Final Verification

Before going live, ensure:
- [ ] All pages load without errors
- [ ] All features working as described
- [ ] Database properly stores all data
- [ ] Authentication working correctly
- [ ] Bottom navbar on all authenticated pages
- [ ] Matching algorithm producing scores
- [ ] Messages sending/receiving
- [ ] Likes functionality working
- [ ] No console errors or warnings
- [ ] Performance acceptable

---

## 🚀 Ready for Deployment

Once all tests pass:
1. Run final build: `npm run build`
2. Test production build
3. Deploy to server
4. Monitor for issues
5. Celebrate! 🎉

