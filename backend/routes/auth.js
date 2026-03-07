import express from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { User } from '../database.js';

const router = express.Router();

// Helper: calculate age from DOB
const calculateAge = (dob) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Register
router.post('/register', async (req, res) => {
  try {
    let { name, email, password, confirmPassword, relationshipGoal } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    email = email.toLowerCase();
    console.log('[Register] Registering user:', email);

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Password strength: at least 6 chars and contains letters and numbers
    if (password.length < 6 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters and include letters and numbers' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    console.log('[Register] Creating user with email:', email);
    // If DOB provided on registration, enforce 18+
    if (req.body.dob) {
      const dobDate = new Date(req.body.dob);
      const calc = calculateAge(dobDate);
      if (calc !== null && calc < 18) {
        return res.status(400).json({ error: 'You must be 18 or older to register.' });
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      relationshipGoal: relationshipGoal || 'Dating',
      // Automatically mark email as verified for quick onboarding
      verified: true,
      verificationMethod: 'email',
      verificationDate: new Date(),
      // Initialize all profile fields to match users.js structure
      nickname: '',
      gender: '',
      dob: null,
      location: '',
      height: 0,
      bodyType: '',
      university: '',
      course: '',
      year: '',
      interests: [],
      bio: '',
      photos: [],
      blocked: [],
      profileCompletion: 0,
      active: true,
      lastActive: new Date()
    });

    console.log('[Register] User created successfully:', user._id);
    console.log('[Register] New user will appear in Discover with 0% profile completion - encourage them to complete profile for better visibility');

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

    const userResp = user.toJSON();
    userResp.age = calculateAge(user.dob) || userResp.age || null;

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userResp,
      infoMessage: 'Your profile is now visible to other users! Complete your profile to appear higher in recommendations.'
    });
  } catch (error) {
    console.error('[Register] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      console.log('[Login] Missing email or password');
      return res.status(400).json({ error: 'Email and password required' });
    }

    email = email.toLowerCase();
    console.log('[Login] Attempting to find user with email:', email);
    
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.log('[Login] User not found for email:', email);
      // Get count of all users for debugging
      const allUsers = await User.find({});
      console.log('[Login] Total users in DB:', allUsers.length);
      if (allUsers.length > 0) {
        console.log('[Login] Existing users:', allUsers.map(u => u.email).join(', '));
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[Login] User found:', user.name, '- Checking password...');
    console.log('[Login] User has password:', !!user.password);

    // Compare password: prefer DB-level helper (for Postgres implementation),
    // otherwise use instance method if present (for mongoose-style models).
    let isPasswordValid = false;
    if (User && typeof User.comparePassword === 'function') {
      isPasswordValid = await User.comparePassword(email, password);
    } else if (user && typeof user.comparePassword === 'function') {
      isPasswordValid = await user.comparePassword(password);
    } else if (user && (user.passwordHash || user.password_hash)) {
      // Last-resort: directly compare using bcrypt if hash is present on object
      const bcrypt = await import('bcryptjs');
      const hash = user.passwordHash || user.password_hash;
      isPasswordValid = await bcrypt.compare(password, hash);
    }
    console.log('[Login] Password valid result:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('[Login] Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[Login] Login successful for:', email);
    
    // Update lastActive and active status
    await User.updateOne({ email }, { 
      lastActive: new Date(),
      active: true
    });

    // Fetch fresh user data with all fields to match users.js structure
    const freshUser = await User.findOne({ email });

    const token = jwt.sign({ id: freshUser._id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

    // Calculate online status (active + recent activity within 5 minutes)
    const FIVE_MIN = 5 * 60 * 1000;
    const lastActive = freshUser.lastActive ? new Date(freshUser.lastActive).getTime() : 0;
    const isOnline = !!(freshUser.active && lastActive && (Date.now() - lastActive) < FIVE_MIN);

    const userWithOnlineStatus = {
      ...freshUser.toJSON(),
      age: calculateAge(freshUser.dob) || freshUser.age || null,
      isOnline
    };

    console.log('[Login] Returning token and user data');
    res.json({
      message: 'Login successful',
      token,
      user: userWithOnlineStatus
    });
  } catch (error) {
    console.error('[Login] Error:', error.stack || error.message || error);
    res.status(500).json({ error: error.message || 'Login error' });
  }
});

// Request password reset (dev-friendly: returns reset link)
router.post('/request-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal whether email exists
      return res.json({ message: 'If an account exists, a reset link has been sent' });
    }

    const crypto = await import('crypto');
    const token = crypto.randomBytes(20).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await User.updateOne({ email }, { resetToken: token, resetExpires });

    const resetLink = `${process.env.FRONTEND_URL || 'https://edu-love.onrender.onrender.com'}/reset/${token}`;

    // Try to email the reset link if SMTP is configured
    let emailSent = false;
    try {
      // Prefer SendGrid API if configured
      if (process.env.SENDGRID_API_KEY) {
        try {
          // Use SendGrid HTTP API directly to avoid requiring the SDK
          const fromAddress = process.env.FROM_EMAIL || 'no-reply@' + (process.env.FRONTEND_URL?.replace(/^https?:\/\//, '') || 'example.com');
          const payload = {
            personalizations: [
              {
                to: [{ email: user.email }],
                subject: 'Password reset request'
              }
            ],
            from: { email: fromAddress },
            content: [
              { type: 'text/plain', value: `You requested a password reset. Use this link to reset your password (valid 1 hour): ${resetLink}` },
              { type: 'text/html', value: `<p>You requested a password reset. Click the link below to reset your password (valid 1 hour):</p><p><a href="${resetLink}">${resetLink}</a></p>` }
            ]
          };

          const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            emailSent = true;
          } else {
            const bodyText = await res.text().catch(() => '');
            console.error('SendGrid API error:', res.status, bodyText);
            emailSent = false;
          }
        } catch (sgErr) {
          console.error('SendGrid HTTP send error:', sgErr && sgErr.message ? sgErr.message : sgErr);
          emailSent = false;
        }
      } else if (process.env.SMTP_HOST) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: (process.env.SMTP_SECURE === 'true'),
          auth: process.env.SMTP_USER ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          } : undefined
        });

        // Verify transporter before sending to get clearer errors
        try {
          await transporter.verify();
        } catch (verifyErr) {
          console.error('SMTP verify failed:', verifyErr && verifyErr.message ? verifyErr.message : verifyErr);
          throw verifyErr;
        }

        const fromAddress = process.env.FROM_EMAIL || `no-reply@${process.env.SMTP_HOST}`;

        const mailOptions = {
          from: fromAddress,
          to: user.email,
          subject: 'Password reset request',
          text: `You requested a password reset. Use this link to reset your password (valid 1 hour): ${resetLink}`,
          html: `<p>You requested a password reset. Click the link below to reset your password (valid 1 hour):</p><p><a href="${resetLink}">${resetLink}</a></p>`
        };

        await transporter.sendMail(mailOptions);
        emailSent = true;
      }
    } catch (err) {
      console.error('Error sending reset email:', err && err.message ? err.message : err);
      emailSent = false;
    }

    // In all cases we don't want to expose the raw reset link to the client.
    // If the email succeeds we already replied with a generic message. When
    // the email fails we still return the same generic message but log the link
    // on the server for debugging.
    if (emailSent) {
      res.json({ message: 'If an account exists, a reset link has been sent' });
    } else {
      console.warn('[Reset] Email not sent, reset link is:', resetLink);
      res.json({ message: 'If an account exists, a reset link has been sent' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete password reset
router.post('/reset', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });

    // Password strength
    if (newPassword.length < 6 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters and include letters and numbers' });
    }

    // Find all users and check for valid reset token (since findOne doesn't support complex operators)
    const users = await User.find();
    const user = users.find(u => u.resetToken === token && u.resetExpires && new Date(u.resetExpires) > new Date());
    
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    await User.updateOne({ _id: user._id }, { 
      password: newPassword,
      resetToken: null,
      resetExpires: null
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify token
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user: user.toJSON() });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
