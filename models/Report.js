import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    enum: ['Fake Profile', 'Inappropriate Content', 'Harassment', 'Spam', 'Other'],
    required: true
  },
  description: String,
  status: {
    type: String,
    enum: ['pending', 'investigating', 'resolved', 'dismissed'],
    default: 'pending'
  },
  action: {
    type: String,
    enum: ['none', 'warning', 'suspended', 'banned'],
    default: 'none'
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

export default mongoose.model('Report', reportSchema);
