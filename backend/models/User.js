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
  university: String,
  course: String,
  year: {
    type: String,
    enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Other']
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
  studentIdUrl: String,
  studentIdPublicId: String,
  blocked: [mongoose.Schema.Types.ObjectId],
  lastActive: Date,
  active: {
    type: Boolean,
    default: true
  },
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
