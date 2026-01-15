// Simple in-memory database for testing
import bcrypt from 'bcryptjs';

let users = [];
let matches = [];
let messages = [];
let reports = [];
let idCounter = { user: 1, match: 1, message: 1, report: 1 };

// Utility functions
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// User operations
export const User = {
  findOne: async (query) => {
    return users.find(u => {
      if (query.email) return u.email === query.email;
      if (query._id) return u._id === query._id;
      return false;
    }) || null;
  },

  findById: async (id) => {
    return users.find(u => u._id === id) || null;
  },

  find: async (query = {}) => {
    return users.filter(u => {
      if (query.verified !== undefined) return u.verified === query.verified;
      return true;
    });
  },

  create: async (data) => {
    const user = {
      _id: String(idCounter.user++),
      ...data,
      passwordHash: await hashPassword(data.password),
      verified: false,
      createdAt: new Date(),
      lastActive: new Date(),
      blocked: [],
      interests: [],
      bio: '',
      university: '',
      course: '',
      gender: '',
      age: 0,
      profileImage: '',
      toJSON: function() {
        const { passwordHash, ...rest } = this;
        return rest;
      }
    };
    delete user.password;
    users.push(user);
    return user;
  },

  updateOne: async (query, data) => {
    const user = await User.findOne(query);
    if (!user) throw new Error('User not found');
    Object.assign(user, data);
    user.lastActive = new Date();
    return user;
  },

  comparePassword: async (email, password) => {
    const user = await User.findOne({ email });
    if (!user) return false;
    return await comparePassword(password, user.passwordHash);
  }
};

// Match operations
export const Match = {
  findOne: async (query) => {
    return matches.find(m => {
      if (query._id) return m._id === query._id;
      if (query.user1 && query.user2) {
        return (m.user1 === query.user1 && m.user2 === query.user2) ||
               (m.user1 === query.user2 && m.user2 === query.user1);
      }
      return false;
    }) || null;
  },

  find: async (query = {}) => {
    return matches.filter(m => {
      if (query.user1) return m.user1 === query.user1 || m.user2 === query.user1;
      return true;
    }).map(m => ({ ...m, toJSON: () => m }));
  },

  create: async (data) => {
    const match = {
      _id: String(idCounter.match++),
      ...data,
      createdAt: new Date(),
      toJSON: function() { return this; }
    };
    matches.push(match);
    return match;
  },

  findOneAndUpdate: async (query, data) => {
    const match = await Match.findOne(query);
    if (!match) throw new Error('Match not found');
    Object.assign(match, data);
    return match;
  }
};

// Message operations
export const Message = {
  findOne: async (query) => {
    return messages.find(m => m._id === query._id) || null;
  },

  find: async (query = {}) => {
    return messages.filter(m => {
      if (query.matchId) return m.matchId === query.matchId;
      return true;
    }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  },

  create: async (data) => {
    const message = {
      _id: String(idCounter.message++),
      ...data,
      read: false,
      createdAt: new Date(),
      toJSON: function() { return this; }
    };
    messages.push(message);
    return message;
  },

  updateOne: async (query, data) => {
    const msg = messages.find(m => m._id === query._id);
    if (!msg) throw new Error('Message not found');
    Object.assign(msg, data);
    return msg;
  }
};

// Report operations
export const Report = {
  create: async (data) => {
    const report = {
      _id: String(idCounter.report++),
      ...data,
      status: 'open',
      createdAt: new Date(),
      toJSON: function() { return this; }
    };
    reports.push(report);
    return report;
  },

  find: async (query = {}) => {
    return reports.filter(r => {
      if (query.status) return r.status === query.status;
      return true;
    });
  },

  findOneAndUpdate: async (query, data) => {
    const report = reports.find(r => r._id === query._id);
    if (!report) throw new Error('Report not found');
    Object.assign(report, data);
    return report;
  }
};

// Clear database
export const clearDatabase = () => {
  users = [];
  matches = [];
  messages = [];
  reports = [];
};

// Get stats
export const getStats = () => {
  return {
    totalUsers: users.length,
    verifiedUsers: users.filter(u => u.verified).length,
    totalMatches: matches.length,
    totalMessages: messages.length,
    totalReports: reports.length
  };
};
