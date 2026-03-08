import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import jwt from 'jsonwebtoken';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import { setIO } from './utils/socket.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Cache helper (Redis or in-memory fallback)
import * as cache from './utils/cache.js';

// Import routes
import userRoutes from './routes/users.js';
import matchRoutes from './routes/matches.js';
import messageRoutes from './routes/messages.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payments.js';
import authRoutes from './routes/auth.js';
import notificationsRoutes from './routes/notifications.js';

// Import database
import { User } from './database.js';

const cors = require('cors');

app.use(cors({
  origin: 'https://edu-love.onrender.com',
  method: ['GET','POST','PUT','DELETE'],
  credentials: true
}));

dotenv.config();

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.info('✓ Cloudinary configured for image storage');
} else {
  console.warn('⚠️ Cloudinary not configured. Images will be stored locally and may be lost on server restart.');
  console.warn('Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET for persistent image storage.');
}

// Startup warnings (non-fatal)
const paymentsEnabled = (process.env.PAYMENTS_ENABLED || 'true') === 'true';
if (paymentsEnabled && !(process.env.PAYCHANGU_SECRET || process.env.FLUTTERWAVE_SECRET_KEY)) {
  console.warn('⚠️ Payments are enabled but no provider keys found (PAYCHANGU_SECRET or FLUTTERWAVE_SECRET_KEY). Provider checkout sessions will fall back to local test flows.');
}

if (process.env.REDIS_URL && !require('./utils/cache.js').redis) {
  console.warn('⚠️ REDIS_URL is set but Redis connection is not available; falling back to in-memory cache for this instance.');
}

const app = express();

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new IOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Wire IO instance for routes to use
setIO(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  try {
    const token = socket.handshake.auth?.token || null;
    if (!token) {
      // allow anonymous connections but log
      console.info('[Socket] Connection without token');
      return;
    }

    let decoded = null;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret'); } catch (e) { decoded = null; }
    if (!decoded || !decoded.id) {
      console.info('[Socket] Invalid token on connection');
      return;
    }

    const userId = decoded.id;
    socket.join(userId);
    console.info('[Socket] User connected and joined room:', userId);

    socket.on('typing', (data) => {
      const { toUserId, matchId } = data || {};
      if (toUserId) {
        io.to(String(toUserId)).emit('typing', { from: userId, matchId });
      }
    });

    socket.on('stop_typing', (data) => {
      const { toUserId, matchId } = data || {};
      if (toUserId) {
        io.to(String(toUserId)).emit('stop_typing', { from: userId, matchId });
      }
    });

    socket.on('disconnect', (reason) => {
      console.info('[Socket] disconnected', userId, reason);
    });
  } catch (err) {
    console.error('[Socket] connection handler error', err);
  }
});

// Create uploads directory if it doesn't exist (fallback for when Cloudinary is not available)
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads (use memory storage for Cloudinary)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP allowed.'));
    }
  }
});

// Trust proxy for rate limiting in Codespaces
app.set('trust proxy', 1);

// Rate limiting (use Redis-backed store when available)
let rateLimitStore = undefined;
if (cache.redis) {
  try {
    // Use a sendCommand shim so rate-limit-redis uses our ioredis instance
    rateLimitStore = new RedisStore({ sendCommand: (...args) => cache.redis.call(...args) });
  } catch (err) {
    console.error('Error creating RedisStore for rate limiter, falling back to in-memory rate store:', err && err.message ? err.message : err);
    rateLimitStore = undefined;
  }
}

const limiter = rateLimit({
  store: rateLimitStore,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
// Custom CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://ominous-potato-974jgw5wgg96h7xgj-3001.app.github.dev',
    'https://ominous-potato-974jgw5wgg96h7xgj-3000.app.github.dev',
    'https://ominous-potato-974jgw5wgg96h7xgj-5000.app.github.dev',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'https://frontend-i89x.onrender.com',
    'https://edulove-frontend.onrender.com',
    'https://dating-zujg.onrender.com'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Database startup status
import { dbStatus } from './database.js';

(async () => {
  try {
    const status = await dbStatus();
    if (status.usePostgres) {
      if (status.connected) {
        console.info('✓ Using Postgres database — connected. Counts:', status.counts);
      } else {
        console.warn('⚠️ Postgres configured but not connected:', status.reason);
        console.warn('Falling back to in-memory storage for this instance.');
      }
    } else {
      console.info('✓ DATABASE_URL not set — using in-memory data storage (no DB)');
    }
  } catch (err) {
    console.error('Error checking DB status on startup:', err.message || err);
  }
})();

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'EduLove Dating Platform API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth (register, login, verify)',
      users: '/api/users (profiles, discovery, blocking)',
      matches: '/api/matches (like, pass, get matches)',
      messages: '/api/messages (send, receive messages)',
      reports: '/api/reports (report users)',
      admin: '/api/admin (admin dashboard)',
      health: '/api/health (health check)'
    }
  });
});

// Routes

// Auth routes (centralized in routes/auth.js)
app.use('/api/auth', authRoutes);

// Photo Upload Endpoint
app.post('/api/users/upload-photo', upload.single('photo'), async (req, res) => {
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

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let photoUrl, publicId;
    
    // Use Cloudinary if configured
    if (cloudinary.config().cloud_name) {
      try {
        // Upload to Cloudinary using buffer stream
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'edulove/users',
              resource_type: 'auto',
              quality: 'auto:good', // Optimize quality
              fetch_format: 'auto'   // Auto format for optimization
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          
          stream.end(req.file.buffer);
        });
        
        photoUrl = result.secure_url;
        publicId = result.public_id;
        console.log(`[Photo Upload] Uploaded to Cloudinary: ${publicId}`);
      } catch (cloudinaryError) {
        console.error('[Photo Upload] Cloudinary error:', cloudinaryError.message);
        return res.status(500).json({ error: 'Failed to upload photo to cloud storage' });
      }
    } else {
      // Fallback to local storage if Cloudinary is not configured
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `photo-${uniqueSuffix}${path.extname(req.file.originalname)}`;
      const filePath = path.join(uploadsDir, filename);
      
      fs.writeFileSync(filePath, req.file.buffer);
      
      if (process.env.API_URL) {
        photoUrl = `${process.env.API_URL}/uploads/${filename}`;
      } else {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers['x-forwarded-host'] || req.get('host');
        photoUrl = `${protocol}://${host}/uploads/${filename}`;
      }
      publicId = filename;
      console.warn('[Photo Upload] Using local storage (not persistent)');
    }

    // Add photo to user's photos array
    if (!user.photos) {
      user.photos = [];
    }

    user.photos.push({
      url: photoUrl,
      publicId: publicId,
      uploadedAt: new Date()
    });

    // Keep only last 5 photos, delete older ones
    if (user.photos.length > 5) {
      const removedPhotos = user.photos.splice(0, user.photos.length - 5);
      
      // Delete removed photos from Cloudinary
      if (cloudinary.config().cloud_name) {
        for (const photo of removedPhotos) {
          try {
            await cloudinary.uploader.destroy(photo.publicId);
            console.log(`[Photo Delete] Deleted from Cloudinary: ${photo.publicId}`);
          } catch (err) {
            console.error(`[Photo Delete] Failed to delete ${photo.publicId}:`, err.message);
          }
        }
      } else {
        // Delete local files
        for (const photo of removedPhotos) {
          const filePath = path.join(uploadsDir, photo.publicId);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      }
    }

    await User.updateOne({ _id: user._id }, { photos: user.photos });

    // Update profileCompletion after photo change
    const completionFields = [
      !!user.nickname,
      !!user.gender,
      !!user.dob,
      !!user.university,
      !!user.course,
      !!user.year,
      (user.interests && user.interests.length > 0),
      !!user.bio,
      !!user.location,
      (user.photos && user.photos.length > 0),
      !!user.relationshipGoal
    ];
    const completedCount = completionFields.filter(Boolean).length;
    const profilePercentage = Math.round((completedCount / completionFields.length) * 100);
    
    await User.updateOne({ _id: user._id }, { profileCompletion: profilePercentage });

    // Fetch updated user to return photos and completion
    const updatedUser = await User.findById(user._id);

    res.json({
      message: 'Photo uploaded successfully',
      photo: updatedUser.photos[updatedUser.photos.length - 1],
      photos: updatedUser.photos,
      user: updatedUser.toJSON()
    });
  } catch (error) {
    console.error('[Photo Upload] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});


// Delete Photo Endpoint
app.delete('/api/users/photos/:publicId', async (req, res) => {
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

    const photoIndex = user.photos?.findIndex(p => p.publicId === req.params.publicId);
    if (photoIndex === -1) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const photo = user.photos[photoIndex];
    user.photos.splice(photoIndex, 1);

    // Delete from Cloudinary if configured, otherwise from local storage
    if (cloudinary.config().cloud_name) {
      try {
        await cloudinary.uploader.destroy(photo.publicId);
        console.log(`[Photo Delete] Deleted from Cloudinary: ${photo.publicId}`);
      } catch (err) {
        console.error(`[Photo Delete] Failed to delete from Cloudinary: ${err.message}`);
        // Don't fail the request if Cloudinary deletion fails
      }
    } else {
      // Delete local file
      const filePath = path.join(uploadsDir, photo.publicId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await User.updateOne({ _id: user._id }, { photos: user.photos });

    res.json({ 
      message: 'Photo deleted successfully',
      photos: user.photos
    });
  } catch (error) {
    console.error('[Photo Delete] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Other Routes
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

// Debug: List all users (for development only)
app.get('/api/debug/users', async (req, res) => {
  try {
    const allUsers = await User.find({});
    res.json({ 
      count: allUsers.length,
      users: allUsers.map(u => ({
        _id: u._id,
        email: u.email,
        name: u.name,
        hasPasswordHash: !!u.passwordHash
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DB status endpoint for debugging Postgres persistence
app.get('/api/db-status', async (req, res) => {
  try {
    const status = await dbStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Something Went wrong' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
