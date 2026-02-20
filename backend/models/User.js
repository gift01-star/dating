import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  nickname: String,
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  dob: Date,
  age: Number,
  location: String,
  height: Number,
  bodyType: {
    type: String,
    enum: ['Slim', 'Athletic', 'Average', 'Curvy']
  },
  university: String,
  course: String,
  year: {
    type: String,
    enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Other']
  },
  // Relationship goal: what the user is looking for
  relationshipGoal: {
    type: String,
    enum: ['Dating', 'Hookup', 'Friendship', 'Other'],
    default: 'Dating'
  },
  interests: [String],
  bio: String,
  photos: [{
    url: String,
    publicId: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  verified: {
    type: Boolean,
    default: false
  },
  verificationMethod: {
    type: String,
    enum: ['email', 'studentId', 'manual'],
    default: null
  },
  verificationDate: Date,
  studentIdUrl: String,
  studentIdPublicId: String,
  blocked: [mongoose.Schema.Types.ObjectId],
  lastActive: Date,
  active: {
    type: Boolean,
    default: true
  },
  // Track when user last viewed likes (so we can compute unseen likes)
  lastSeenLikesAt: Date,
  profileCompletion: {
    type: Number,
    default: 0
  },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    matches: { type: Boolean, default: true },
    messages: { type: Boolean, default: true }
  },
  // Messaging controls: 2 free messages per conversation; set to true after successful payment
  messagesUnlocked: { type: Boolean, default: false },
  freeMessagesRemaining: { type: Number, default: 2 },
  // Per-conversation unlocks (matchId strings)
  unlockedMatches: { type: [String], default: [] },
  // Subscription info (for paid subscription plans)
  subscriptionActive: { type: Boolean, default: false },
  subscriptionPlan: { type: String, default: null },
  subscriptionExpires: Date,
  // Password reset token
  resetToken: String,
  resetExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Remove password from response
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('User', userSchema);
