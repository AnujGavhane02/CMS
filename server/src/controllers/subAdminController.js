import User from '../models/User.js';
import Department from '../models/Department.js';
import Complaint from '../models/Complaint.js';
import { logger } from '../config/logger.js';

// Get all sub-admins with pagination and filters
export const getAllSubAdmins = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      department,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { role: 'sub_admin' };
    
    if (status !== undefined) {
      filter.isActive = status === 'active';
    }
    
    if (department) {
      filter.department = department;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Get sub-admins with pagination
    const subAdmins = await User.find(filter)
      .select('-password -refreshTokens')
      .populate('department', 'name description')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    // Calculate statistics for each sub-admin
    const subAdminsWithStats = await Promise.all(
      subAdmins.map(async (subAdmin) => {
        const stats = await calculateSubAdminStats(subAdmin.department?.name || '');
        return {
          ...subAdmin.toObject(),
          stats
        };
      })
    );

    logger.info(`Sub-admins retrieved by: ${req.user.email}`, {
      userId: req.user._id,
      role: req.user.role,
      filters: filter,
      total
    });

    res.json({
      success: true,
      data: {
        subAdmins: subAdminsWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalSubAdmins: total,
          hasNext: skip + subAdmins.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    logger.error('Get all sub-admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sub-admins'
    });
  }
};

// Get sub-admin by ID
export const getSubAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const subAdmin = await User.findOne({ _id: id, role: 'sub_admin' })
      .select('-password -refreshTokens')
      .populate('department', 'name description');
    
    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Sub-admin not found'
      });
    }

    // Calculate statistics for this sub-admin
    const stats = await calculateSubAdminStats(subAdmin.department?.name || '');

    res.json({
      success: true,
      data: {
        subAdmin: {
          ...subAdmin.toObject(),
          stats
        }
      }
    });
  } catch (error) {
    logger.error('Get sub-admin by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sub-admin'
    });
  }
};

// Create new sub-admin
export const createSubAdmin = async (req, res) => {
  try {
    const { name, email, department } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Verify department exists and get department name
    const departmentDoc = await Department.findById(department);
    if (!departmentDoc || !departmentDoc.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Department not found or inactive'
      });
    }

    // Create new sub-admin
    const subAdmin = new User({
      name,
      email: email.toLowerCase(),
      password: 'Subadmin#9978', // Default password
      role: 'sub_admin',
      department: departmentDoc._id, // Store department ObjectId
      isActive: true
    });

    await subAdmin.save();

    // Add sub-admin to department
    await departmentDoc.addSubAdmin(subAdmin._id);

    // Calculate initial stats
    const stats = await calculateSubAdminStats(departmentDoc._id);

    logger.info(`Sub-admin created: ${subAdmin.name}`, {
      subAdminId: subAdmin._id,
      department: subAdmin.department,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Sub-admin created successfully',
      data: {
        subAdmin: {
          ...subAdmin.toObject(),
          stats
        },
        defaultPassword: 'Subadmin#9978'
      }
    });
  } catch (error) {
    logger.error('Create sub-admin error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create sub-admin'
    });
  }
};

// Update sub-admin
export const updateSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department, isActive } = req.body;

    const subAdmin = await User.findOne({ _id: id, role: 'sub_admin' });
    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Sub-admin not found'
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== subAdmin.email) {
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: id }
      });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Check if department is being changed
    if (department) {
      const newDepartment = await Department.findById(department);
      if (!newDepartment || !newDepartment.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Department not found or inactive'
        });
      }

      // Only update if department is actually changing
      if (!newDepartment._id.equals(subAdmin.department)) {
        // Remove from old department
        const oldDepartment = await Department.findById(subAdmin.department);
        if (oldDepartment) {
          await oldDepartment.removeSubAdmin(subAdmin._id);
        }

        // Add to new department
        await newDepartment.addSubAdmin(subAdmin._id);
      }
    }

    // Update sub-admin fields
    if (name) subAdmin.name = name;
    if (email) subAdmin.email = email.toLowerCase();
    if (department) {
      const newDepartment = await Department.findById(department);
      if (newDepartment) {
        subAdmin.department = newDepartment._id;
      }
    }
    if (isActive !== undefined) subAdmin.isActive = isActive;

    await subAdmin.save();

    // Calculate updated stats - get department name for stats
    const currentDepartment = await Department.findById(subAdmin.department);
    const stats = await calculateSubAdminStats(currentDepartment?.name || '');

    logger.info(`Sub-admin updated: ${subAdmin.name}`, {
      subAdminId: subAdmin._id,
      updatedBy: req.user._id,
      updatedFields: Object.keys(req.body)
    });

    res.json({
      success: true,
      message: 'Sub-admin updated successfully',
      data: {
        subAdmin: {
          ...subAdmin.toObject(),
          stats
        }
      }
    });
  } catch (error) {
    logger.error('Update sub-admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update sub-admin'
    });
  }
};

// Delete sub-admin
export const deleteSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const subAdmin = await User.findOne({ _id: id, role: 'sub_admin' });
    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Sub-admin not found'
      });
    }

    // Remove from department
    const department = await Department.findById(subAdmin.department);
    if (department) {
      await department.removeSubAdmin(subAdmin._id);
    }

    // Delete the sub-admin (hard delete)
    await User.findByIdAndDelete(id);

    logger.info(`Sub-admin deleted: ${subAdmin.name}`, {
      subAdminId: subAdmin._id,
      department: subAdmin.department,
      deletedBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Sub-admin deleted successfully'
    });
  } catch (error) {
    logger.error('Delete sub-admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete sub-admin'
    });
  }
};

// Reset sub-admin password
export const resetSubAdminPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const subAdmin = await User.findOne({ _id: id, role: 'sub_admin' });
    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Sub-admin not found'
      });
    }

    // Reset password to default
    subAdmin.password = 'Subadmin#9978';
    await subAdmin.save();

    logger.info(`Sub-admin password reset: ${subAdmin.name}`, {
      subAdminId: subAdmin._id,
      resetBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        newPassword: 'Subadmin#9978'
      }
    });
  } catch (error) {
    logger.error('Reset sub-admin password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
};

// Get available departments for assignment
export const getAvailableDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .select('name description subAdmins')
      .populate('subAdmins', 'name email');

    const departmentsWithStatus = departments.map(dept => ({
      _id: dept._id,
      name: dept.name,
      description: dept.description,
      hasSubAdmin: dept.subAdmins.length > 0,
      subAdminCount: dept.subAdmins.length,
      subAdmins: dept.subAdmins
    }));

    res.json({
      success: true,
      data: {
        departments: departmentsWithStatus
      }
    });
  } catch (error) {
    logger.error('Get available departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve departments'
    });
  }
};

// Get sub-admin statistics
export const getSubAdminStats = async (req, res) => {
  try {
    // Get total sub-admins
    const totalSubAdmins = await User.countDocuments({ role: 'sub_admin' });
    const activeSubAdmins = await User.countDocuments({ role: 'sub_admin', isActive: true });

    // Get sub-admins by department
    const subAdminsByDepartment = await User.aggregate([
      { $match: { role: 'sub_admin' } },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get overall complaint statistics
    const complaintStats = await Complaint.aggregate([
      {
        $group: {
          _id: null,
          totalComplaints: { $sum: 1 },
          pendingComplaints: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          processingComplaints: {
            $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
          },
          resolvedComplaints: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalSubAdmins,
        activeSubAdmins,
        inactiveSubAdmins: totalSubAdmins - activeSubAdmins,
        subAdminsByDepartment,
        complaintStats: complaintStats[0] || {
          totalComplaints: 0,
          pendingComplaints: 0,
          processingComplaints: 0,
          resolvedComplaints: 0
        }
      }
    });
  } catch (error) {
    logger.error('Get sub-admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sub-admin statistics'
    });
  }
};

// Helper function to calculate sub-admin statistics
async function calculateSubAdminStats(department) {
  try {
    const stats = await Complaint.aggregate([
      { $match: { category: department } },
      {
        $group: {
          _id: null,
          totalComplaints: { $sum: 1 },
          pendingComplaints: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          processingComplaints: {
            $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
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

    return stats.length > 0 ? {
      totalComplaints: stats[0].totalComplaints || 0,
      pendingComplaints: stats[0].pendingComplaints || 0,
      processingComplaints: stats[0].processingComplaints || 0,
      resolvedComplaints: stats[0].resolvedComplaints || 0,
      avgResolutionTime: stats[0].avgResolutionTime || 0
    } : {
      totalComplaints: 0,
      pendingComplaints: 0,
      processingComplaints: 0,
      resolvedComplaints: 0,
      avgResolutionTime: 0
    };
  } catch (error) {
    logger.error('Calculate sub-admin stats error:', error);
    return {
      totalComplaints: 0,
      pendingComplaints: 0,
      processingComplaints: 0,
      resolvedComplaints: 0,
      avgResolutionTime: 0
    };
  }
}

