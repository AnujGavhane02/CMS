import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  complaint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: [true, 'Complaint reference is required']
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department reference is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating must be at most 5']
  },
  note: {
    type: String,
    required: [true, 'Note is required'],
    trim: true,
    maxlength: [1000, 'Note cannot exceed 1000 characters']
  },
  sentiment: {
    score: {
      type: Number,
      default: 0
    },
    category: {
      type: String,
      enum: ['Positive', 'Neutral', 'Negative'],
      default: 'Neutral'
    },
    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    }
  },
  isVisible: {
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
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
feedbackSchema.index({ complaint: 1 });
feedbackSchema.index({ department: 1 });
feedbackSchema.index({ user: 1 });
feedbackSchema.index({ rating: 1 });
feedbackSchema.index({ 'sentiment.category': 1 });
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ complaint: 1, user: 1 });

// Compound index for department-based feedback queries
feedbackSchema.index({ department: 1, createdAt: -1 });

// Virtual for feedback ID
feedbackSchema.virtual('feedbackId').get(function () {
  return `FB-${this._id.toString().slice(-6).toUpperCase()}`;
});

// Pre-save middleware to update updatedAt
feedbackSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Static method to find feedbacks by complaint
feedbackSchema.statics.findByComplaint = function (complaintId) {
  return this.find({ complaint: complaintId })
    .populate('user', 'name email')
    .sort({ createdAt: -1 });
};

// Static method to find feedbacks by department
feedbackSchema.statics.findByDepartment = function (departmentId) {
  return this.find({ department: departmentId })
    .populate('user', 'name email')
    .populate('complaint', 'title status')
    .sort({ createdAt: -1 });
};

// Static method to find feedbacks by user
feedbackSchema.statics.findByUser = function (userId) {
  return this.find({ user: userId })
    .populate('complaint', 'title status')
    .populate('department', 'name')
    .sort({ createdAt: -1 });
};

// Static method to get feedback statistics for a complaint
feedbackSchema.statics.getComplaintFeedbackStats = function (complaintId) {
  return this.aggregate([
    {
      $match: { complaint: new mongoose.Types.ObjectId(complaintId) }
    },
    {
      $group: {
        _id: null,
        totalFeedbacks: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        positiveCount: {
          $sum: { $cond: [{ $eq: ['$sentiment.category', 'positive'] }, 1, 0] }
        },
        neutralCount: {
          $sum: { $cond: [{ $eq: ['$sentiment.category', 'neutral'] }, 1, 0] }
        },
        negativeCount: {
          $sum: { $cond: [{ $eq: ['$sentiment.category', 'negative'] }, 1, 0] }
        },
        ratingDistribution: {
          $push: {
            rating: '$rating',
            sentiment: '$sentiment.category'
          }
        }
      }
    }
  ]);
};

// Static method to get department feedback statistics
feedbackSchema.statics.getDepartmentFeedbackStats = function (departmentId, startDate, endDate) {
  const matchStage = { department: new mongoose.Types.ObjectId(departmentId) };
  
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalFeedbacks: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        positiveCount: {
          $sum: { $cond: [{ $eq: ['$sentiment.category', 'positive'] }, 1, 0] }
        },
        neutralCount: {
          $sum: { $cond: [{ $eq: ['$sentiment.category', 'neutral'] }, 1, 0] }
        },
        negativeCount: {
          $sum: { $cond: [{ $eq: ['$sentiment.category', 'negative'] }, 1, 0] }
        },
        ratingDistribution: {
          $push: {
            rating: '$rating',
            sentiment: '$sentiment.category',
            createdAt: '$createdAt'
          }
        }
      }
    }
  ]);
};

// Static method to get overall feedback statistics
feedbackSchema.statics.getOverallFeedbackStats = function (startDate, endDate) {
  const matchStage = {};
  
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalFeedbacks: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        positiveCount: {
          $sum: { $cond: [{ $eq: ['$sentiment.category', 'positive'] }, 1, 0] }
        },
        neutralCount: {
          $sum: { $cond: [{ $eq: ['$sentiment.category', 'neutral'] }, 1, 0] }
        },
        negativeCount: {
          $sum: { $cond: [{ $eq: ['$sentiment.category', 'negative'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Method to update sentiment
feedbackSchema.methods.updateSentiment = function (sentimentData) {
  this.sentiment = sentimentData;
  return this.save();
};

export default mongoose.model('Feedback', feedbackSchema);
