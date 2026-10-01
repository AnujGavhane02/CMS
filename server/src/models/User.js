import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerifyOtp: {
    type: String,
    select: false
  },
  emailVerifyOtpExpiry: {
    type: Date
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  passwordResetOtp: {
    type: String,
    select: false
  },
  passwordResetOtpExpiry: {
    type: Date
  },
  role: {
    type: String,
    enum: ['master_admin', 'sub_admin', 'user'],
    default: 'user',
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: function() {
      return this.role === 'sub_admin';
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now
      // CRITICAL: Do NOT add 'expires' here — MongoDB TTL indexes on a
      // subdocument array field delete the ENTIRE parent User document, not
      // just the array entry. A previous version had `expires: 604800` here,
      // which caused all user accounts to be silently deleted 7 days after
      // their last refresh token was created. The TTL index in the database
      // must also be manually dropped (see config/database.js safety check).
      // Old tokens are cleaned up manually via cleanOldRefreshTokens().
    }
  }],
  profile: {
    phone: String,
    studentId: String,
    employeeId: String,
    avatar: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ isActive: 1 });

// Virtual for user's full profile
userSchema.virtual('fullProfile').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    department: this.department,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Add refresh token
userSchema.methods.addRefreshToken = function(token) {
  this.refreshTokens.push({ token });
  return this.save({ validateBeforeSave: false });
};

// Remove refresh token
userSchema.methods.removeRefreshToken = function(token) {
  this.refreshTokens = this.refreshTokens.filter(t => t.token !== token);
  return this.save({ validateBeforeSave: false });
};

// Remove old refresh tokens
userSchema.methods.cleanOldRefreshTokens = function() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  this.refreshTokens = this.refreshTokens.filter(t => t.createdAt > sevenDaysAgo);
  return this.save({ validateBeforeSave: false });
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method to find sub-admins by department
userSchema.statics.findSubAdminsByDepartment = function(department) {
  return this.find({ 
    role: 'sub_admin', 
    department, 
    isActive: true 
  });
};

export default mongoose.model('User', userSchema);
