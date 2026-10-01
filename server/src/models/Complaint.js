import mongoose from 'mongoose';

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'processing', 'resolved', 'rejected'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
});

// Feedback schema moved to separate Feedback model for multiple feedbacks support

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department is required']
  },
  category: {
    type: String,
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'resolved', 'rejected'],
    default: 'pending',
    required: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  userName: {
    type: String,
    required: [true, 'User name is required']
  },
  userEmail: {
    type: String,
    required: [true, 'User email is required']
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  attachments: [{
    filename: String,
    originalName: String,
    url: String,
    publicId: String, // Cloudinary public_id, used to delete the file from cloud storage
    size: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  statusHistory: [statusHistorySchema],
  resolvedAt: Date,
  priority: {
    type: Number,
    default: 5 // 1-10 scale; 1-3 low, 4-6 medium, 7-10 high (no min/max to allow legacy 0)
  },
  tags: [String],
  internalNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    isVisibleToUser: {
      type: Boolean,
      default: false
    }
  }],
  escalationEmailSentAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
complaintSchema.index({ userId: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ department: 1 });
complaintSchema.index({ urgency: 1 });
complaintSchema.index({ assignedTo: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ status: 1, department: 1 });
complaintSchema.index({ status: 1, urgency: 1 });
complaintSchema.index({ priority: 1 });

// Compound index for department-based queries
complaintSchema.index({ department: 1, status: 1, createdAt: -1 });

// Virtual for complaint ID
complaintSchema.virtual('complaintId').get(function () {
  return `CMP-${this._id.toString().slice(-6).toUpperCase()}`;
});

// Virtual for resolution time in days
complaintSchema.virtual('resolutionTime').get(function () {
  if (this.resolvedAt && this.createdAt) {
    return Math.ceil((this.resolvedAt - this.createdAt) / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Virtual for days since creation
complaintSchema.virtual('daysSinceCreation').get(function () {
  return Math.ceil((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to add initial status to history
complaintSchema.pre('save', function (next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date()
    });
  }
  next();
});

// Method to update status with history
complaintSchema.methods.updateStatus = function (newStatus, updatedBy, notes) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    updatedBy,
    notes,
    timestamp: new Date()
  });

  if (newStatus === 'resolved') {
    this.resolvedAt = new Date();
  }

  return this.save();
};

// Method to add internal note
complaintSchema.methods.addInternalNote = function (note, addedBy, isVisibleToUser = false) {
  this.internalNotes.push({
    note,
    addedBy,
    isVisibleToUser,
    addedAt: new Date()
  });
  return this.save();
};

// Virtual to get feedbacks for this complaint
complaintSchema.virtual('feedbacks', {
  ref: 'Feedback',
  localField: '_id',
  foreignField: 'complaint'
});

// Method to get feedback statistics
complaintSchema.methods.getFeedbackStats = async function () {
  const Feedback = mongoose.model('Feedback');
  return await Feedback.getComplaintFeedbackStats(this._id);
};

// Static method to find complaints by user
complaintSchema.statics.findByUser = function (userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Static method to find complaints by department
complaintSchema.statics.findByDepartment = function (departmentId) {
  return this.find({ department: departmentId }).sort({ createdAt: -1 });
};

// Static method to find complaints by status
complaintSchema.statics.findByStatus = function (status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Static method to get dashboard statistics
complaintSchema.statics.getDashboardStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalComplaints: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        processing: {
          $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
        },
        resolved: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Static method to get resolution time statistics
complaintSchema.statics.getResolutionStats = function () {
  return this.aggregate([
    {
      $match: {
        status: 'resolved',
        resolvedAt: { $exists: true }
      }
    },
    {
      $project: {
        resolutionTime: {
          $divide: [
            { $subtract: ['$resolvedAt', '$createdAt'] },
            1000 * 60 * 60 * 24 // Convert to days
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        avgResolutionTime: { $avg: '$resolutionTime' },
        minResolutionTime: { $min: '$resolutionTime' },
        maxResolutionTime: { $max: '$resolutionTime' }
      }
    }
  ]);
};

export default mongoose.model('Complaint', complaintSchema);
