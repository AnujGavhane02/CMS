import User from '../models/User.js';
import { logger } from '../config/logger.js';
import { sendAccountApprovedEmail } from '../utils/email.js';

// Get all users (Master Admin only)
export const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      department,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    if (role) filter.role = role;
    if (department) filter.department = department;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Get users with pagination
    const users = await User.find(filter)
      .select('-password -refreshTokens')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    logger.info(`Users retrieved by admin: ${req.user.email}`, {
      adminId: req.user._id,
      filters: filter,
      total
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalUsers: total,
          hasNext: skip + users.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users'
    });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password -refreshTokens');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'user' && user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.role === 'sub_admin' && user.role === 'master_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user'
    });
  }
};

// Create new user (Master Admin only)
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Validate department for sub_admin role
    if (role === 'sub_admin' && !department) {
      return res.status(400).json({
        success: false,
        message: 'Department is required for sub-admin role'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role,
      department: role === 'sub_admin' ? department : undefined
    });

    await user.save();

    logger.info(`User created by admin: ${req.user.email}`, {
      adminId: req.user._id,
      newUserId: user._id,
      newUserRole: user.role
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: user.fullProfile
      }
    });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
};


export const verifyUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    sendAccountApprovedEmail(user).catch(err =>
      logger.error('Account approved email failed:', err)
    );

    return res.status(200).json({
      success: true,
      message: "User verified successfully",
      data: user
    });

  } catch (error) {
    logger.error("Failed to verify user", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


export const getUnverifiedUsers = async (req, res) => {
  try {
    const users = await User.find(
      { isVerified: false }
    )
      .select("-password")
      .lean();

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });

  } catch (error) {
    logger.error("Failed to fetch unverified users", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};



// Update user (Master Admin only)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, department, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Block deactivating a master_admin account
    if (user.role === 'master_admin' && isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Master admin accounts cannot be deactivated'
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Update user fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (department) user.department = department;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    logger.info(`User updated by admin: ${req.user.email}`, {
      adminId: req.user._id,
      updatedUserId: user._id,
      updatedFields: Object.keys(req.body)
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: user.fullProfile
      }
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

// Delete user (Master Admin only)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'master_admin') {
      return res.status(403).json({
        success: false,
        message: 'Master admin accounts cannot be deleted'
      });
    }

    // Soft delete by deactivating account
    user.isActive = false;
    await user.save();

    logger.info(`User deactivated by admin: ${req.user.email}`, {
      adminId: req.user._id,
      deactivatedUserId: user._id
    });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

// Get users by department (for sub-admins)
export const getUsersByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const { page = 1, limit = 10, search } = req.query;

    // Check if sub-admin has access to this department
    if (req.user.role === 'sub_admin' && req.user.department !== department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this department'
      });
    }

    const filter = { department, isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(filter)
      .select('-password -refreshTokens')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalUsers: total,
          hasNext: skip + users.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    logger.error('Get users by department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users'
    });
  }
};

// Get user statistics
export const getUserStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          masterAdmins: {
            $sum: { $cond: [{ $eq: ['$role', 'master_admin'] }, 1, 0] }
          },
          subAdmins: {
            $sum: { $cond: [{ $eq: ['$role', 'sub_admin'] }, 1, 0] }
          },
          regularUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] }
          }
        }
      }
    ]);

    const departmentStats = await User.aggregate([
      { $match: { role: 'sub_admin', isActive: true } },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalUsers: 0,
          activeUsers: 0,
          masterAdmins: 0,
          subAdmins: 0,
          regularUsers: 0
        },
        departmentStats
      }
    });
  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics'
    });
  }
};
