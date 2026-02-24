// Database layer with optional Postgres support (falls back to in-memory)
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import * as cache from './utils/cache.js';

const DATABASE_URL = process.env.DATABASE_URL;
let pool = null;
let usePostgres = false;

if (DATABASE_URL) {
  usePostgres = true;
  pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
}

// Helper: map PG row to object and add toJSON
function wrapRow(row) {
  if (!row) return null;
  const obj = { ...row };
  obj._id = String(row.id ?? row._id ?? row._id);
  delete obj.id;
  // Normalize snake_case DB fields to camelCase for application use
  if (row.created_at) obj.createdAt = row.created_at;
  if (row.last_active) obj.lastActive = row.last_active;
  if (row.matched_at) obj.matchedAt = row.matched_at;
  if (row.reset_token) obj.resetToken = row.reset_token;
  if (row.reset_expires) obj.resetExpires = row.reset_expires;
  obj.toJSON = function () { const { password_hash, passwordHash, ...rest } = this; return rest; };
  return obj;
}

const hashPassword = async (password) =>{return await bcrypt.hash(password, 10);

};
const comparePassword = async (password, hash) => {return await bcrypt.compare(password, hash);
  
};

// --- Postgres implementation helpers ---
async function ensureTables() {
  if (!usePostgres) return;
  // Create minimal tables if they don't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      password_hash,
      passwordHash TEXT,
      nickname TEXT,
      photos JSONB,
      verified BOOLEAN DEFAULT false,
      messages_unlocked BOOLEAN DEFAULT false,
      unlocked_matches JSONB DEFAULT '[]'::jsonb,
      subscription_active BOOLEAN DEFAULT false,
      subscription_plan TEXT,
      updated_at TIMESTAMP DEFAULT now(),
      created_at TIMESTAMP DEFAULT now(),
      last_active TIMESTAMP DEFAULT now(),
      blocked JSONB DEFAULT '[]'::jsonb,
      interests JSONB DEFAULT '[]'::jsonb,
      bio TEXT DEFAULT '',
      university TEXT DEFAULT '',
      course TEXT DEFAULT '',
      location TEXT DEFAULT '',
      height INTEGER DEFAULT 0,
      bodyType TEXT DEFAULT '',
      gender TEXT DEFAULT '',
      year TEXT DEFAULT '',
      dob TIMESTAMP,
      age INTEGER DEFAULT 0,
      profileimage TEXT DEFAULT '',
      relationshipGoal TEXT DEFAULT 'Dating'
    );


    -- Ensure additional columns exist on older schemas
    ALTER TABLE users ADD COLUMN IF NOT EXISTS dob TIMESTAMP;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS "profileCompletion" INTEGER DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetExpires" TIMESTAMP;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
    ALTER TABLE users ALTER COLUMN unlocked_matches SET DEFAULT '[]'::jsonb;




    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      user1 TEXT,
      user2 TEXT,
      status TEXT,
      created_at TIMESTAMP DEFAULT now(),
      matched_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      match_id TEXT,
      sender_id TEXT,
      receiver_id TEXT,
      message TEXT,
      read BOOLEAN DEFAULT false,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      plan_id TEXT,
      amount NUMERIC,
      currency TEXT,
      status TEXT,
      match_id TEXT,
      external_data JSONB,
      created_at TIMESTAMP DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT,
      reported_user TEXT,
      reason TEXT,
      notes TEXT,
      status TEXT DEFAULT 'open',
      action TEXT,
      metadata JSONB,
      resolved_at TIMESTAMP,
      resolved_by TEXT,
      created_at TIMESTAMP DEFAULT now()
    );
  `);
}

// Initialize on startup
if (usePostgres) {
  ensureTables()
    .then(() => {
      // Quick connection test and log
      pool.query('SELECT 1').then(() => {
        console.info('✓ Connected to Postgres and tables ensured');
      }).catch((err) => {
        console.error('Postgres connection test failed:', err.message || err);
      });
    })
    .catch(err => {
      console.error('Error ensuring Postgres tables:', err);
    });
}

// Health check helper
export async function dbStatus() {
  if (!usePostgres) {
    return { usePostgres: false, connected: false, reason: 'DATABASE_URL not set - using in-memory fallback' };
  }

  try {
    // Basic connectivity check
    await pool.query('SELECT 1');

    // Get counts for tables (best-effort)
    const usersRes = await pool.query("SELECT count(*)::int as count FROM users");
    const matchesRes = await pool.query("SELECT count(*)::int as count FROM matches");
    const messagesRes = await pool.query("SELECT count(*)::int as count FROM messages");
    const paymentsRes = await pool.query("SELECT count(*)::int as count FROM payments");

    return {
      usePostgres: true,
      connected: true,
      counts: {
        users: Number(usersRes.rows[0].count),
        matches: Number(matchesRes.rows[0].count),
        messages: Number(messagesRes.rows[0].count),
        payments: Number(paymentsRes.rows[0].count)
      }
    };
  } catch (err) {
    return { usePostgres: true, connected: false, reason: err.message || String(err) };
  }
}

// --- Exports ---
export const User = usePostgres ? {
  async findOne(query) {
    if (query.email) {
      // always normalize email casing for lookups
      const email = String(query.email).toLowerCase();
      // Don't cache user by email - password comparisons need the full hash
      const res = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
      const u = wrapRow(res.rows[0]);
      return u;
    }
    if (query._id) {
      const res = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [query._id]);
      return wrapRow(res.rows[0]);
    }
    return null;
  },
  async findById(id) {
    const res = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    const row = wrapRow(res.rows[0]);
    if (row) {
      if (row.reported_user) row.reportedUser = row.reported_user;
      if (row.reporter_id) row.reporterId = row.reporter_id;
      if (row.resolved_at) row.resolvedAt = row.resolved_at;
      if (row.resolved_by) row.resolvedBy = row.resolved_by;
    }
    return row;
  },
  async find(query = {}) {
    if (query.verified !== undefined) {
      const res = await pool.query('SELECT * FROM users WHERE verified = $1', [query.verified]);
      return res.rows.map(wrapRow);
    }
    const res = await pool.query('SELECT * FROM users');
    return res.rows.map(wrapRow);
  },
  async create(data) {
    // ensure email is normalized
    if (data.email) data.email = String(data.email).toLowerCase();
    // generate a simple id if not provided
    const id = data._id || String(Date.now()) + '-' + Math.random().toString(36).slice(2,8);
    const passwordHash = await hashPassword(data.password || data.passwordHash || '');
    const photos = JSON.stringify(data.photos || []);
    // Use snake_case column names to match table created by ensureTables()
    await pool.query(`INSERT INTO users(id, name, email, password_hash, nickname, photos, verified, messages_unlocked, unlocked_matches, subscription_active, subscription_plan, created_at, last_active, blocked, interests, bio, university, course, location, gender, dob, age, profileimage, "relationshipGoal", height, "bodyType", year, active, "profileCompletion")
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),now(),$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
    `, [
      id, 
      data.name || '', 
      data.email || '', 
      passwordHash, 
      data.nickname || '', 
      photos, 
      data.verified || false, 
      data.messagesUnlocked || false, 
      JSON.stringify(data.unlockedMatches || []), 
      data.subscriptionActive || false, 
      data.subscriptionPlan || null, 
      JSON.stringify(data.blocked || []), 
      JSON.stringify(data.interests || []), 
      data.bio || '', 
      data.university || '', 
      data.course || '', 
      data.location || '', 
      data.gender || '', 
      data.dob ? new Date(data.dob) : null, 
      data.age || 0, 
      data.profileImage || '', 
      data.relationshipGoal || 'Dating',
      data.height || 0,
      data.bodyType || '',
      data.year || '',
      data.active !== undefined ? data.active : true,
      data.profileCompletion || 0
    ]);

    // invalidate cache for this email if present
    try { await cache.del(`user:email:${String(data.email).toLowerCase()}`); } catch (err) { /* ignore */ }

    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return wrapRow(res.rows[0]);
  },
  async updateOne(query, data) {
    // support query by _id or email
    let id = query._id || query.id;
    if (!id && query.email) {
      const u = await this.findOne({ email: query.email });
      if (!u) throw new Error('User not found for email');
      id = u._id || u.id;
    }
    if (!id) throw new Error('updateOne requires _id or email');

    const fields = [];
    const vals = [];
    let idx = 1;
    let hasLastActive = false; // Track if last_active is being updated
    for (const origKey of Object.keys(data)) {
      let k = origKey;
      let val = data[origKey];

      // Map camelCase keys used in application code to snake_case DB columns
      if (k === 'lastActive') { k = 'last_active'; hasLastActive = true; }
      if (k === 'createdAt') k = 'created_at';
      if (k === 'updatedAt') k = 'updated_at';
      if (k === 'messagesUnlocked') k = 'messages_unlocked';
      if (k === 'subscriptionActive') k = 'subscription_active';
      if (k === 'subscriptionPlan') k = 'subscription_plan';
      if (k === 'profileImage') k = 'profileimage';
      if (k === 'passwordHash') k = 'password_hash';
      if (k === 'resetToken') k = 'reset_token';
      if (k === 'resetExpires') k = 'reset_expires';
      if (k === 'unlockedMatches') k = 'unlocked_matches';
      if (k === 'profileCompletion') k = '"profileCompletion"';

      if (k === 'photos' || k === 'unlockedMatches' || k === 'unlocked_matches' || k === 'blocked' || k === 'interests') val = JSON.stringify(val || []);
      if (k === 'password') {
        val = await hashPassword(val);
        k = 'password_hash';
      }
      fields.push(`\"${k.replace(/\"/g,'')}\" = $${idx}`);
      vals.push(val);
      idx++;
    }

    if (fields.length === 0) return this.findById(id);

    // Only auto-update last_active if it's not explicitly being set
    const updateClause = hasLastActive ? fields.join(', ') : `${fields.join(', ')}, last_active = now()`;
    const q = `UPDATE users SET ${updateClause} WHERE id = $${idx} RETURNING *`;
    vals.push(id);
    const res = await pool.query(q, vals);

    // invalidate cache for this email (best-effort)
    try {
      const user = wrapRow(res.rows[0]);
      if (user && user.email) await cache.del(`user:email:${String(user.email).toLowerCase()}`);
    } catch (err) { /* ignore */ }

    return wrapRow(res.rows[0]);
  },

  async comparePassword(email, password) {
    const normalized = String(email).toLowerCase();
    console.log('[DB.comparePassword] Comparing password for:', normalized);
    const user = await this.findOne({ email: normalized });
    if (!user) {
      console.log('[DB.comparePassword] User not found');
      return false;
    }
    console.log('[DB.comparePassword] User found, comparing password.');
    const hash = user.password_hash || user.passwordHash;
    if (!hash) {
      console.log('[DB.comparePassword] No password hash found on user!');
      return false;
    }
    const result = await comparePassword(password, hash);
    console.log('[DB.comparePassword] Comparison result:', result);
    return result;
  }
} : (function(){
  // fallback to in-memory implementation (unchanged)
  let users = [];
  let idCounter = 1;
  const userObj = {
    findOne: async function(query) {
      return users.find(u => {
        if (query.email) return u.email === query.email;
        if (query._id) return u._id === query._id;
        return false;
      }) || null;
    },

    findById: async function(id) {
      return users.find(u => u._id === id) || null;
    },

    find: async function(query = {}) {
      return users.filter(u => {
        if (query.verified !== undefined) return u.verified === query.verified;
        return true;
      });
    },

    create: async function(data) {
      // Hash password FIRST before using it
      const passwordHash = await hashPassword(data.password || '');
      
      const user = {
        _id: String(idCounter++),
        // Core fields - explicitly set, don't spread data
        email: (data.email || '').toLowerCase(),
        name: data.name || '',
        nickname: data.nickname || '',
        // Password
        passwordHash: passwordHash,  // IMPORTANT: After hashing, set explicitly
        // Profile fields
        gender: data.gender || '',
        dob: data.dob || null,
        location: data.location || '',
        height: data.height || 0,
        bodyType: data.bodyType || '',
        university: data.university || '',
        course: data.course || '',
        year: data.year || '',
        // Interests and bio
        interests: data.interests || [],
        bio: data.bio || '',
        // Photos and verification
        photos: data.photos || [],
        verified: data.verified || false,
        // Subscription and messaging
        messagesUnlocked: data.messagesUnlocked || false,
        freeMessagesRemaining: data.freeMessagesRemaining || 2,
        unlockedMatches: data.unlockedMatches || [],
        subscriptionActive: data.subscriptionActive || false,
        subscriptionPlan: data.subscriptionPlan || null,
        subscriptionExpires: data.subscriptionExpires || null,
        // Blocking and relationships
        blocked: data.blocked || [],
        relationshipGoal: data.relationshipGoal || 'Dating',
        // Status and timestamps
        active: data.active !== undefined ? data.active : true,
        lastActive: data.lastActive || new Date(),
        createdAt: data.createdAt || new Date(),
        updatedAt: data.updatedAt || new Date(),
        // Profile completion
        profileCompletion: data.profileCompletion || 0,
        // Password reset
        resetToken: data.resetToken || null,
        resetExpires: data.resetExpires || null,
        toJSON: function() { const { passwordHash, ...rest } = this; return rest; }
      };
      
      users.push(user);
      console.log('[InMemory.create] User created:', user.email, 'with passwordHash:', !!user.passwordHash);
      return user;
    },

    updateOne: async function(query, data) {
      const user = await this.findOne(query);
      if (!user) throw new Error('User not found');
      
      // Handle password hashing if password is being updated
      if (data.password) {
        data.passwordHash = await hashPassword(data.password);
        delete data.password;
      }
      
      Object.assign(user, data);
      user.lastActive = new Date();
      return user;
    },

    comparePassword: async function(email, password) {
      console.log('[InMemory.comparePassword] Finding user with email:', email);
      const user = await this.findOne({ email });
      if (!user) {
        console.log('[InMemory.comparePassword] User not found');
        return false;
      }
      console.log('[InMemory.comparePassword] User found, has passwordHash:', !!user.passwordHash);
      if (!user.passwordHash) {
        console.log('[InMemory.comparePassword] ERROR: No passwordHash on user!');
        return false;
      }
      const result = await comparePassword(password, user.passwordHash);
      console.log('[InMemory.comparePassword] Result:', result);
      return result;
    }
  };
  return userObj;
})();

export const Match = usePostgres ? {
  async findOne(query) {
    if (query._id) {
      const res = await pool.query('SELECT * FROM matches WHERE id = $1 LIMIT 1', [query._id]);
      return wrapRow(res.rows[0]);
    }
    if (query.user1 && query.user2) {
      const res = await pool.query('SELECT * FROM matches WHERE (user1 = $1 AND user2 = $2) OR (user1 = $2 AND user2 = $1) LIMIT 1', [query.user1, query.user2]);
      return wrapRow(res.rows[0]);
    }
    return null;
  },
  async find(query = {}) {
    if (query.user1) {
      const res = await pool.query('SELECT * FROM matches WHERE user1 = $1 OR user2 = $1', [query.user1]);
      return res.rows.map(wrapRow);
    }
    const res = await pool.query('SELECT * FROM matches');
    return res.rows.map(wrapRow);
  },
  async create(data) {
    const id = data._id || String(Date.now()) + '-' + Math.random().toString(36).slice(2,8);
    await pool.query('INSERT INTO matches(id, user1, user2, status, created_at, matched_at) VALUES($1,$2,$3,$4,now(),$5)', [id, data.user1, data.user2, data.status || 'pending', data.matchedAt || null]);
    const res = await pool.query('SELECT * FROM matches WHERE id = $1', [id]);
    return wrapRow(res.rows[0]);
  },
  async findOneAndUpdate(query, data) {
    const m = await this.findOne(query);
    if (!m) throw new Error('Match not found');
    const updates = [];
    const vals = [];
    let idx = 1;
    for (const key of Object.keys(data)) {
      // Map camelCase to snake_case for database columns
      let dbKey = key;
      if (key === 'matchedAt') dbKey = 'matched_at';
      if (key === 'createdAt') dbKey = 'created_at';
      
      updates.push(`\"${dbKey}\" = $${idx}`);
      vals.push(data[key]);
      idx++;
    }
    const q = `UPDATE matches SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    vals.push(m.id || m._id);
    const res = await pool.query(q, vals);
    return wrapRow(res.rows[0]);
  }
} : (function(){
  let matches = [];
  let idCounter = 1;
  return {
    findOne: async (query) => matches.find(m => {
      if (query._id) return m._id === query._id;
      if (query.user1 && query.user2) {
        return (m.user1 === query.user1 && m.user2 === query.user2) || (m.user1 === query.user2 && m.user2 === query.user1);
      }
      return false;
    }) || null,
    find: async (query = {}) => matches.filter(m => {
      if (query.user1) return m.user1 === query.user1 || m.user2 === query.user1;
      return true;
    }).map(m => ({ ...m, toJSON: () => m })),
    create: async (data) => {
      const match = { _id: String(idCounter++), ...data, createdAt: new Date(), toJSON: function() { return this; } };
      matches.push(match);
      return match;
    },
    findOneAndUpdate: async (query, data) => {
      const match = await this.findOne(query);
      if (!match) throw new Error('Match not found');
      Object.assign(match, data);
      return match;
    }
  };
})();

export const Message = usePostgres ? {
  async findOne(query) {
    if (!query._id) return null;
    const res = await pool.query('SELECT * FROM messages WHERE id = $1 LIMIT 1', [query._id]);
    return wrapRow(res.rows[0]);
  },
  async find(query = {}) {
    if (query.matchId) {
      const res = await pool.query('SELECT * FROM messages WHERE match_id = $1 ORDER BY created_at ASC', [query.matchId]);
      return res.rows.map(r => ({ ...r, toJSON: () => r }));
    }
    const res = await pool.query('SELECT * FROM messages ORDER BY created_at ASC');
    return res.rows.map(r => ({ ...r, toJSON: () => r }));
  },
  async create(data) {
    const id = data._id || String(Date.now()) + '-' + Math.random().toString(36).slice(2,8);
    await pool.query('INSERT INTO messages(id, match_id, sender_id, receiver_id, message, read, read_at, created_at) VALUES($1,$2,$3,$4,$5,$6,$7,now())', [id, data.matchId, data.senderId, data.receiverId, data.message, data.read || false, data.readAt || null]);
    const res = await pool.query('SELECT * FROM messages WHERE id = $1', [id]);
    return res.rows[0];
  },
  async updateOne(query, data) {
    const msg = await this.findOne(query);
    if (!msg) throw new Error('Message not found');
    const updates = [];
    const vals = [];
    let idx = 1;
    for (const key of Object.keys(data)) {
      updates.push(`\"${key}\" = $${idx}`);
      vals.push(data[key]);
      idx++;
    }
    const q = `UPDATE messages SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    vals.push(msg.id || msg._id);
    const res = await pool.query(q, vals);
    return res.rows[0];
  },
  async updateMany(query, data) {
    // Support updating by matchId + receiverId
    const where = [];
    const vals = [];
    let idx = 1;
    if (query.matchId) { where.push(`match_id = $${idx}`); vals.push(query.matchId); idx++; }
    if (query.receiverId) { where.push(`receiver_id = $${idx}`); vals.push(query.receiverId); idx++; }
    where.push(`read = false`);

    const updates = [];
    for (const key of Object.keys(data)) {
      updates.push(`\"${key}\" = $${idx}`);
      vals.push(data[key]);
      idx++;
    }

    const q = `UPDATE messages SET ${updates.join(', ')} WHERE ${where.join(' AND ')}`;
    await pool.query(q, vals);
    return true;
  }
} : (function(){
  let messages = [];
  let idCounter = 1;
  return {
    findOne: async (query) => messages.find(m => m._id === query._id) || null,
    find: async (query = {}) => messages.filter(m => {
      if (query.matchId) return m.matchId === query.matchId;
      return true;
    }).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)),
    create: async (data) => {
      const message = { _id: String(idCounter++), ...data, read: false, createdAt: new Date(), toJSON: function() { return this; } };
      messages.push(message);
      return message;
    },
    updateOne: async (query, data) => {
      const msg = messages.find(m => m._id === query._id);
      if (!msg) throw new Error('Message not found');
      Object.assign(msg, data);
      return msg;
    },
    updateMany: async (query, data) => {
      for (const msg of messages) {
        if (query.matchId && msg.matchId !== query.matchId) continue;
        if (query.receiverId && String(msg.receiverId) !== String(query.receiverId)) continue;
        if (!msg.read) Object.assign(msg, data);
      }
      return true;
    }
  };
})();

export const Report = usePostgres ? {
  async create(data) {
    const id = data._id || String(Date.now()) + '-' + Math.random().toString(36).slice(2,8);
    const res = await pool.query('INSERT INTO reports(id, reporter_id, reported_user, reason, notes, status, action, metadata, created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now()) RETURNING *', [id, data.reporterId || data.userId || null, data.reportedUser || data.reported_user || data.reportedUserId || null, data.reason || null, data.notes || null, data.status || 'open', data.action || null, data.metadata || null]);
    return wrapRow(res.rows[0]);
  },
  async find(query = {}) {
    const where = [];
    const vals = [];
    let idx = 1;
    if (query.reporterId) { vals.push(query.reporterId); where.push(`reporter_id = $${idx++}`); }
    if (query.reportedUser) { vals.push(query.reportedUser); where.push(`reported_user = $${idx++}`); }
    if (query.status) { vals.push(query.status); where.push(`status = $${idx++}`); }

    let q = 'SELECT * FROM reports';
    if (where.length) q += ' WHERE ' + where.join(' AND ');
    const res = await pool.query(q, vals);
    return res.rows.map(r => {
      const obj = wrapRow(r);
      if (obj) {
        if (obj.reported_user) obj.reportedUser = obj.reported_user;
        if (obj.reporter_id) obj.reporterId = obj.reporter_id;
        if (obj.resolved_at) obj.resolvedAt = obj.resolved_at;
        if (obj.resolved_by) obj.resolvedBy = obj.resolved_by;
      }
      return obj;
    });
  },
  async findById(id) {
    const res = await pool.query('SELECT * FROM reports WHERE id = $1 LIMIT 1', [id]);
    const row = wrapRow(res.rows[0]);
    if (row) {
      if (row.reported_user) row.reportedUser = row.reported_user;
      if (row.reporter_id) row.reporterId = row.reporter_id;
      if (row.resolved_at) row.resolvedAt = row.resolved_at;
      if (row.resolved_by) row.resolvedBy = row.resolved_by;
    }
    return row;
  },
  async findOneAndUpdate(query, data) {
    const id = query._id || query.id;
    if (!id) throw new Error('findOneAndUpdate requires _id');
    const updates = [];
    const vals = [];
    let idx = 1;
    for (const key of Object.keys(data)) {
      let dbKey = key;
      if (key === 'resolvedAt') dbKey = 'resolved_at';
      if (key === 'resolvedBy') dbKey = 'resolved_by';
      updates.push(`"${dbKey}" = $${idx}`);
      vals.push(data[key]);
      idx++;
    }
    const q = `UPDATE reports SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    vals.push(id);
    const res = await pool.query(q, vals);
    const row = wrapRow(res.rows[0]);
    if (row) {
      if (row.reported_user) row.reportedUser = row.reported_user;
      if (row.reporter_id) row.reporterId = row.reporter_id;
      if (row.resolved_at) row.resolvedAt = row.resolved_at;
      if (row.resolved_by) row.resolvedBy = row.resolved_by;
    }
    return row;
  }
} : (function(){
  let reports = [];
  let idCounter = 1;
  return {
    create: async (data) => {
      const r = { _id: String(idCounter++), reporterId: data.reporterId || data.userId || null, reportedUser: data.reportedUser || data.reported_user || data.reportedUserId || null, reason: data.reason || null, notes: data.notes || null, status: data.status || 'open', action: data.action || null, metadata: data.metadata || null, createdAt: new Date(), toJSON() { return { ...this }; } };
      reports.push(r);
      return r;
    },
    find: async (query = {}) => {
      return reports.filter(r => {
        if (query.reporterId && r.reporterId !== query.reporterId) return false;
        if (query.reportedUser && r.reportedUser !== query.reportedUser) return false;
        if (query.status && r.status !== query.status) return false;
        return true;
      }).map(r => ({ ...r, toJSON() { return { ...this }; } }));
    },
    findById: async (id) => reports.find(r => r._id === id) || null,
    findOneAndUpdate: async (query, data) => {
      const id = query._id || query.id;
      const r = reports.find(rr => rr._id === id);
      if (!r) throw new Error('Report not found');
      Object.assign(r, data);
      return r;
    }
  };
})();

export const Payment = usePostgres ? {
  async create(data) {
    const id = data._id || String(Date.now()) + '-' + Math.random().toString(36).slice(2,8);
    await pool.query('INSERT INTO payments(id, user_id, plan_id, amount, currency, status, match_id, external_data, created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now())', [id, data.userId, data.planId, data.amount, data.currency, data.status || 'pending', data.matchId || null, data.externalData || null]);
    const res = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
    const row = wrapRow(res.rows[0]);
    if (row && row.user_id) row.userId = row.user_id;
    if (row && row.plan_id) row.planId = row.plan_id;
    if (row && row.match_id) row.matchId = row.match_id;
    if (row && row.external_data) row.externalData = row.external_data;
    return row;
  },
  async find(query = {}) {
    let q = 'SELECT * FROM payments';
    const vals = [];
    const where = [];
    if (query.userId) { vals.push(query.userId); where.push(`user_id = $${vals.length}`); }
    if (query.status) { vals.push(query.status); where.push(`status = $${vals.length}`); }
    if (where.length) q += ' WHERE ' + where.join(' AND ');
    const res = await pool.query(q, vals);
    return res.rows.map(r => {
      const obj = wrapRow(r);
      if (obj) {
        if (obj.user_id) obj.userId = obj.user_id;
        if (obj.plan_id) obj.planId = obj.plan_id;
        if (obj.match_id) obj.matchId = obj.match_id;
        if (obj.external_data) obj.externalData = obj.external_data;
      }
      return obj;
    });
  },
  async findById(id) {
    const res = await pool.query('SELECT * FROM payments WHERE id = $1 LIMIT 1', [id]);
    const row = wrapRow(res.rows[0]);
    if (row) {
      if (row.user_id) row.userId = row.user_id;
      if (row.plan_id) row.planId = row.plan_id;
      if (row.match_id) row.matchId = row.match_id;
      if (row.external_data) row.externalData = row.external_data;
    }
    return row || null;
  },
  async updateOne(query, data) {
    const id = query._id || query.id;
    if (!id) throw new Error('updateOne requires _id');
    const updates = [];
    const vals = [];
    let idx = 1;
    for (const key of Object.keys(data)) { updates.push(`\"${key}\" = $${idx}`); vals.push(data[key]); idx++; }
    const q = `UPDATE payments SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    vals.push(id);
    const res = await pool.query(q, vals);
    const row = wrapRow(res.rows[0]);
    if (row) {
      if (row.user_id) row.userId = row.user_id;
      if (row.plan_id) row.planId = row.plan_id;
      if (row.match_id) row.matchId = row.match_id;
      if (row.external_data) row.externalData = row.external_data;
    }
    return row;
  }
} : (function(){
  let payments = [];
  let idCounter = 1;
  return {
    create: async (data) => { const p = { _id: String(idCounter++), ...data, status: data.status || 'pending', createdAt: new Date(), toJSON: function() { return this; } }; payments.push(p); return p; },
    find: async (query = {}) => payments.filter(p => { if (query.userId) return p.userId === query.userId; if (query.status) return p.status === query.status; return true; }),
    findById: async (id) => payments.find(p => p._id === id) || null,
    updateOne: async (query, data) => { const p = payments.find(pp => pp._id === query._id); if (!p) throw new Error('Payment not found'); Object.assign(p, data); return p; }
  };
})();

export const clearDatabase = () => {
  // With Postgres we don't clear tables here (use migrations). For in-memory fallback nothing to do.
};

export const getStats = async () => {
  if (usePostgres) {
    const usersRes = await pool.query('SELECT count(*) from users');
    const verifiedRes = await pool.query('SELECT count(*) from users WHERE verified = true');
    const bannedRes = await pool.query('SELECT count(*) from users WHERE active = false');
    const matchesRes = await pool.query('SELECT count(*) from matches');
    const messagesRes = await pool.query('SELECT count(*) from messages');
    const paymentsRes = await pool.query('SELECT count(*) from payments');
    const pendingReportsRes = await pool.query("SELECT count(*) from reports WHERE status = 'open' OR status = 'pending'");

    return {
      totalUsers: Number(usersRes.rows[0].count),
      verifiedUsers: Number(verifiedRes.rows[0].count),
      bannedUsers: Number(bannedRes.rows[0].count),
      pendingReports: Number(pendingReportsRes.rows[0].count),
      totalMatches: Number(matchesRes.rows[0].count),
      totalMessages: Number(messagesRes.rows[0].count),
      totalPayments: Number(paymentsRes.rows[0].count)
    };
  }
  return {
    totalUsers: 0,
    verifiedUsers: 0,
    totalMatches: 0,
    totalMessages: 0,
    totalReports: 0,
    totalPayments: 0
  };
};

