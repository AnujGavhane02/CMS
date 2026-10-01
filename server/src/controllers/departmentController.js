import Department from '../models/Department.js';
import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import { logger } from '../config/logger.js';

// Get all departments
export const getAllDepartments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Get departments with pagination
    const departments = await Department.find(filter)
      .populate('subAdmins', 'name email role')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Department.countDocuments(filter);

    // Update stats for each department
    for (const department of departments) {
      await department.updateStats();
    }

    logger.info(`Departments retrieved by: ${req.user.email}`, {
      userId: req.user._id,
      role: req.user.role,
      filters: filter,
      total
    });

    res.json({
      success: true,
      data: {
        departments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalDepartments: total,
          hasNext: skip + departments.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    logger.error('Get all departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve departments'
    });
  }
};

// Get department by ID
export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.getWithStats(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    res.json({
      success: true,
      data: { department }
    });
  } catch (error) {
    logger.error('Get department by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve department'
    });
  }
};

// Create new department
export const createDepartment = async (req, res) => {
  try {
    const { name, description, categories = [] } = req.body;
    const createdBy = req.user._id;

    // Check if department already exists
    const existingDept = await Department.findOne({ name });
    if (existingDept) {
      return res.status(409).json({
        success: false,
        message: 'Department with this name already exists'
      });
    }

    // Create new department
    const department = new Department({
      name,
      description,
      categories: Array.isArray(categories) ? categories.filter(c => c && String(c).trim()) : [],
      createdBy
    });

    await department.save();
    await department.populate('createdBy', 'name email');

    logger.info(`Department created: ${department.name}`, {
      departmentId: department._id,
      createdBy: req.user._id,
      name: department.name
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: { department }
    });
  } catch (error) {
    logger.error('Create department error:', error);
    
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
      message: 'Failed to create department'
    });
  }
};

// Update department
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, categories } = req.body;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Check if name is being changed and if it's already taken
    if (name && name !== department.name) {
      const existingDept = await Department.findOne({ 
        name, 
        _id: { $ne: id } 
      });
      if (existingDept) {
        return res.status(409).json({
          success: false,
          message: 'Department name already exists'
        });
      }
    }

    // Update department fields
    if (name) department.name = name;
    if (description) department.description = description;
    if (isActive !== undefined) department.isActive = isActive;
    if (categories !== undefined) {
      department.categories = Array.isArray(categories) ? categories.filter(c => c && String(c).trim()) : [];
    }

    await department.save();
    await department.populate('subAdmins', 'name email role');
    await department.populate('createdBy', 'name email');

    logger.info(`Department updated: ${department.name}`, {
      departmentId: department._id,
      updatedBy: req.user._id,
      updatedFields: Object.keys(req.body)
    });

    res.json({
      success: true,
      message: 'Department updated successfully',
      data: { department }
    });
  } catch (error) {
    logger.error('Update department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update department'
    });
  }
};

// Delete department
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Check if department has active complaints
    const activeComplaints = await Complaint.countDocuments({ 
      department: department._id,
      status: { $in: ['pending', 'processing'] }
    });

    if (activeComplaints > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department with ${activeComplaints} active complaints. Please resolve or reassign them first.`
      });
    }

    // Check if department has sub-admins
    if (department.subAdmins.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department with ${department.subAdmins.length} assigned sub-admins. Please reassign them first.`
      });
    }

    // Soft delete by deactivating
    department.isActive = false;
    await department.save();

    logger.info(`Department deactivated: ${department.name}`, {
      departmentId: department._id,
      deactivatedBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Department deactivated successfully'
    });
  } catch (error) {
    logger.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete department'
    });
  }
};

// Add sub-admin to department
export const addSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'sub_admin') {
      return res.status(400).json({
        success: false,
        message: 'User must be a sub-admin to be assigned to department'
      });
    }

    // Check if user is already assigned to another department
    if (user.department && user.department !== department.name) {
      return res.status(400).json({
        success: false,
        message: 'User is already assigned to another department'
      });
    }

    // Add sub-admin to department
    await department.addSubAdmin(userId);
    
    // Update user's department
    user.department = department.name;
    await user.save();

    await department.populate('subAdmins', 'name email role');

    logger.info(`Sub-admin added to department: ${department.name}`, {
      departmentId: department._id,
      userId,
      addedBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Sub-admin added to department successfully',
      data: { department }
    });
  } catch (error) {
    logger.error('Add sub-admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add sub-admin to department'
    });
  }
};

// Remove sub-admin from department
export const removeSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove sub-admin from department
    await department.removeSubAdmin(userId);
    
    // Clear user's department
    user.department = undefined;
    await user.save();

    await department.populate('subAdmins', 'name email role');

    logger.info(`Sub-admin removed from department: ${department.name}`, {
      departmentId: department._id,
      userId,
      removedBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Sub-admin removed from department successfully',
      data: { department }
    });
  } catch (error) {
    logger.error('Remove sub-admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove sub-admin from department'
    });
  }
};

// Get department statistics
export const getDepartmentStats = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.getWithStats(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Get recent complaints for this department
    const recentComplaints = await Complaint.find({ department: department._id })
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        department,
        recentComplaints
      }
    });
  } catch (error) {
    logger.error('Get department stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve department statistics'
    });
  }
};

// Get all department statistics
export const getAllDepartmentStats = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true });
    
    // Update stats for all departments
    for (const department of departments) {
      await department.updateStats();
    }

    // Get overall statistics
    const overallStats = await Complaint.aggregate([
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
        departments,
        overallStats: overallStats[0] || {
          totalComplaints: 0,
          pendingComplaints: 0,
          processingComplaints: 0,
          resolvedComplaints: 0
        }
      }
    });
  } catch (error) {
    logger.error('Get all department stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve department statistics'
    });
  }
};
