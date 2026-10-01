import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Department name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Department name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Department description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  categories: [{
    type: String,
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subAdmins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  stats: {
    totalComplaints: {
      type: Number,
      default: 0
    },
    pendingComplaints: {
      type: Number,
      default: 0
    },
    resolvedComplaints: {
      type: Number,
      default: 0
    },
    avgResolutionTime: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
departmentSchema.index({ name: 1 });
departmentSchema.index({ isActive: 1 });
departmentSchema.index({ createdBy: 1 });

// Virtual for department ID
departmentSchema.virtual('departmentId').get(function() {
  return `DEPT-${this._id.toString().slice(-6).toUpperCase()}`;
});

// Virtual for sub-admin count
departmentSchema.virtual('subAdminCount').get(function() {
  return this.subAdmins ? this.subAdmins.length : 0;
});

// Method to add sub-admin
departmentSchema.methods.addSubAdmin = function(userId) {
  if (!this.subAdmins.includes(userId)) {
    this.subAdmins.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove sub-admin
departmentSchema.methods.removeSubAdmin = function(userId) {
  this.subAdmins = this.subAdmins.filter(id => !id.equals(userId));
  return this.save();
};

// Method to update stats
departmentSchema.methods.updateStats = async function() {
  const Complaint = mongoose.model('Complaint');
  
  const stats = await Complaint.aggregate([
    { $match: { department: this._id } },
    {
      $group: {
        _id: null,
        totalComplaints: { $sum: 1 },
        pendingComplaints: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        resolvedComplaints: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        },
        avgResolutionTime: {
          $avg: {
            $cond: [
              { $eq: ['$status', 'resolved'] },
              {
                $divide: [
                  { $subtract: ['$resolvedAt', '$createdAt'] },
                  1000 * 60 * 60 * 24 // Convert to days
                ]
              },
              null
            ]
          }
        }
      }
    }
  ]);

  if (stats.length > 0) {
    this.stats = {
      totalComplaints: stats[0].totalComplaints || 0,
      pendingComplaints: stats[0].pendingComplaints || 0,
      resolvedComplaints: stats[0].resolvedComplaints || 0,
      avgResolutionTime: stats[0].avgResolutionTime || 0
    };
  } else {
    this.stats = {
      totalComplaints: 0,
      pendingComplaints: 0,
      resolvedComplaints: 0,
      avgResolutionTime: 0
    };
  }

  return this.save();
};

// Static method to find active departments
departmentSchema.statics.findActive = function() {
  return this.find({ isActive: true }).populate('subAdmins', 'name email');
};

// Static method to get department with stats
departmentSchema.statics.getWithStats = async function(departmentId) {
  const department = await this.findById(departmentId).populate('subAdmins', 'name email role');
  if (department) {
    await department.updateStats();
  }
  return department;
};

// Pre-save middleware to ensure unique name
departmentSchema.pre('save', async function(next) {
  if (this.isModified('name')) {
    const existingDept = await this.constructor.findOne({ 
      name: this.name, 
      _id: { $ne: this._id } 
    });
    
    if (existingDept) {
      const error = new Error('Department name already exists');
      error.name = 'ValidationError';
      return next(error);
    }
  }
  next();
});

export default mongoose.model('Department', departmentSchema);
