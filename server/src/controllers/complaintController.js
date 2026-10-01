import Complaint from '../models/Complaint.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import { logger } from '../config/logger.js';
import { findSimilarComplaints, escalatePriority } from '../utils/complaintSimilarity.js';
import { calculatePriorityFromText, priorityToUrgency } from '../utils/complaintPriority.js';
import {
  sendComplaintNotification,
  sendNewComplaintAlertToSubAdmin,
  sendStatusUpdateToUser,
  sendStatusUpdateToSubAdmin
} from '../utils/email.js';

// Create new complaint
export const createComplaint = async (req, res) => {
  try {
    const { title, description, department, category, isAnonymous = false } = req.body;
    const user = req.user;

    // Validate department and category
    const dept = await Department.findById(department);
    if (!dept) {
      return res.status(400).json({
        success: false,
        message: 'Department not found'
      });
    }

    // When department has categories, category is required and must belong to department
    if (dept.categories && dept.categories.length > 0) {
      if (!category || !String(category).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Please select a category for this department'
        });
      }
      const validCategory = dept.categories.some(c => String(c).trim().toLowerCase() === String(category).trim().toLowerCase());
      if (!validCategory) {
        return res.status(400).json({
          success: false,
          message: 'Selected category does not belong to this department'
        });
      }
    }

    // Priority 1-10 from words in title/description; urgency label derived from it (1-3 low, 4-6 medium, 7-10 high)
    const priority = calculatePriorityFromText(title, description);
    const urgency = priorityToUrgency(priority);

    // Create complaint object (not saved yet)
    const complaint = new Complaint({
      title,
      description,
      department,
      category: category ? String(category).trim() : undefined,
      priority,
      urgency,
      isAnonymous,
      userId: user._id,
      userName: isAnonymous ? 'Anonymous User' : user.name,
      userEmail: isAnonymous ? 'anonymous@system.local' : user.email
    });

    // Check for similar complaints before saving
    const similarComplaints = await findSimilarComplaints(Complaint, complaint, {
      threshold: 0.7, // 70% similarity threshold
      maxResults: 1
    });

    // If similar complaint exists, escalate priority and return existing complaint
    if (similarComplaints.length > 0) {
      const similarComplaint = similarComplaints[0].complaint;

      logger.info(`Similar complaint found: ${similarComplaint.complaintId}`, {
        newTitle: title,
        existingTitle: similarComplaint.title,
        similarity: similarComplaints[0].similarity
      });

      // Escalate priority number (1-10) of the existing complaint when duplicate is submitted
      const oldPriority = typeof similarComplaint.priority === 'number' ? similarComplaint.priority : 5;
      const newPriority = escalatePriority(oldPriority);
      const oldUrgency = similarComplaint.urgency || priorityToUrgency(oldPriority);
      const newUrgency = priorityToUrgency(newPriority);

      similarComplaint.priority = newPriority;
      similarComplaint.urgency = newUrgency;

      similarComplaint.internalNotes.push({
        note: `Priority escalated from ${oldPriority} to ${newPriority} (${oldUrgency} → ${newUrgency}) due to similar complaint`,
        addedAt: new Date(),
        isVisibleToUser: false
      });

      await similarComplaint.save();

      logger.info(`Priority escalated for complaint ${similarComplaint.complaintId}`, {
        complaintId: similarComplaint._id,
        oldPriority,
        newPriority
      });

      // Return existing complaint information
      return res.status(200).json({
        success: true,
        message: 'A similar complaint already exists in our system',
        isDuplicate: true,
        data: {
          existingComplaint: {
            id: similarComplaint._id,
            complaintId: similarComplaint.complaintId,
            title: similarComplaint.title,
            description: similarComplaint.description,
            department: similarComplaint.department,
            priority: similarComplaint.priority,
            urgency: similarComplaint.urgency,
            status: similarComplaint.status,
            createdAt: similarComplaint.createdAt,
            priorityEscalated: oldPriority !== newPriority,
            newPriority: similarComplaint.priority
          },
          message: 'Your complaint is similar to an existing one. We have escalated the priority of that complaint and are working on resolving it.'
        }
      });
    }

    // No similar complaint found, save the new complaint
    await complaint.save();

    // Auto-assign to sub-admin of the department if available
    if (department) {
      const subAdmin = await User.findSubAdminsByDepartment(department);
      if (subAdmin.length > 0) {
        complaint.assignedTo = subAdmin[0]._id;
        await complaint.save();
      }
    }

    logger.info(`New complaint created: ${complaint.complaintId}`, {
      complaintId: complaint._id,
      userId: user._id,
      department: complaint.department,
      priority: complaint.priority,
      urgency: complaint.urgency
    });

    // Notify complaint creator (non-anonymous)
    if (!complaint.isAnonymous) {
      sendComplaintNotification(complaint, { name: user.name, email: user.email }, 'created')
        .catch(err => logger.error('Complaint created email failed:', err));
    }

    // Notify sub-admins of the department
    User.findSubAdminsByDepartment(department)
      .then(subAdmins => {
        subAdmins.forEach(sa =>
          sendNewComplaintAlertToSubAdmin(complaint, sa, dept.name)
            .catch(err => logger.error('Sub-admin new complaint email failed:', err))
        );
      })
      .catch(err => logger.error('Failed to fetch sub-admins for email:', err));

    res.status(201).json({
      success: true,
      message: 'Complaint created successfully',
      data: {
        complaint: {
          id: complaint._id,
          complaintId: complaint.complaintId,
          title: complaint.title,
          status: complaint.status,
          department: complaint.department,
          category: complaint.category,
          priority: complaint.priority,
          urgency: complaint.urgency,
          createdAt: complaint.createdAt
        }
      }
    });
  } catch (error) {
    logger.error('Create complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create complaint'
    });
  }
};

// Get all complaints with filters
export const getAllComplaints = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      department,
      urgency,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object based on user role
    const filter = {};

    // Role-based filtering
    if (req.user.role === 'user') {
      filter.userId = req.user._id;
    } else if (req.user.role === 'sub_admin') {
      filter.department = req.user.department;
    }
    // Master admin can see all complaints

    // Apply additional filters
    if (status) filter.status = status;
    if (department && req.user.role === 'master_admin') {
      // Only master admin can filter by specific department
      filter.department = department;
    }
    if (urgency) filter.urgency = urgency;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    if (search) {
      // Check if searching by CMP-XXXXXX complaint ID format
      const cmpMatch = search.match(/^CMP-([0-9A-Fa-f]{6})$/i);
      if (cmpMatch) {
        // Virtual complaintId is derived from last 6 hex chars of _id
        const hexSuffix = cmpMatch[1].toLowerCase();
        filter.$expr = {
          $eq: [
            { $substr: [ { $toString: "$_id" }, 18, 6 ] },
            hexSuffix
          ]
        };
      } else {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Get complaints with pagination
    const complaints = await Complaint.find(filter)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .populate({
        path: 'department',
        select: 'name description',
        model: 'Department'
      })
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Complaint.countDocuments(filter);

    logger.info(`Complaints retrieved by: ${req.user.email}`, {
      userId: req.user._id,
      role: req.user.role,
      filters: filter,
      total
    });

    res.json({
      success: true,
      data: {
        complaints,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalComplaints: total,
          hasNext: skip + complaints.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    logger.error('Get all complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaints'
    });
  }
};

// Get complaint by ID
export const getComplaintById = async (req, res) => {
  try {
    const complaint = req.complaint; // Set by authorizeComplaintAccess middleware

    // Populate related fields
    await complaint.populate('userId', 'name email');
    await complaint.populate('assignedTo', 'name email');

    res.json({
      success: true,
      data: { complaint }
    });
  } catch (error) {
    logger.error('Get complaint by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaint'
    });
  }
};

// Update complaint status
export const updateComplaintStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const complaint = req.complaint;

    // Update status with history
    await complaint.updateStatus(status, req.user._id, notes);

    logger.info(`Complaint status updated: ${complaint.complaintId}`, {
      complaintId: complaint._id,
      newStatus: status,
      updatedBy: req.user._id,
      notes
    });

    // Notify complaint owner
    sendStatusUpdateToUser(complaint)
      .catch(err => logger.error('Status update email to user failed:', err));

    // Notify sub-admins of the department (skip the user who made the change)
    User.findSubAdminsByDepartment(complaint.department)
      .then(subAdmins => {
        subAdmins
          .filter(sa => sa._id.toString() !== req.user._id.toString())
          .forEach(sa =>
            sendStatusUpdateToSubAdmin(complaint, sa)
              .catch(err => logger.error('Status update email to sub-admin failed:', err))
          );
      })
      .catch(err => logger.error('Failed to fetch sub-admins for status email:', err));

    res.json({
      success: true,
      message: 'Complaint status updated successfully',
      data: { complaint }
    });
  } catch (error) {
    logger.error('Update complaint status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update complaint status'
    });
  }
};

// Assign complaint to user
export const assignComplaint = async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const complaint = req.complaint;

    // Verify assigned user exists and has appropriate role
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return res.status(404).json({
        success: false,
        message: 'Assigned user not found'
      });
    }

    if (assignedUser.role === 'user') {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign complaint to regular user'
      });
    }

    if (assignedUser.role === 'sub_admin' && assignedUser.department && complaint.department) {
      const Dept = (await import('../models/Department.js')).default;
      const complaintDept = await Dept.findById(complaint.department);
      if (complaintDept && assignedUser.department !== complaintDept.name) {
        return res.status(400).json({
          success: false,
          message: 'Sub-admin department does not match complaint department'
        });
      }
    }

    complaint.assignedTo = assignedTo;
    await complaint.save();

    logger.info(`Complaint assigned: ${complaint.complaintId}`, {
      complaintId: complaint._id,
      assignedTo,
      assignedBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Complaint assigned successfully',
      data: { complaint }
    });
  } catch (error) {
    logger.error('Assign complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign complaint'
    });
  }
};

// Add internal note to complaint
export const addInternalNote = async (req, res) => {
  try {
    const { note, isVisibleToUser = false } = req.body;
    const complaint = req.complaint;

    await complaint.addInternalNote(note, req.user._id, isVisibleToUser);

    logger.info(`Internal note added to complaint: ${complaint.complaintId}`, {
      complaintId: complaint._id,
      addedBy: req.user._id,
      isVisibleToUser
    });

    res.json({
      success: true,
      message: 'Internal note added successfully',
      data: { complaint }
    });
  } catch (error) {
    logger.error('Add internal note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add internal note'
    });
  }
};

// Add feedback to complaint
export const addFeedback = async (req, res) => {
  try {
    const { rating, comment, sentiment } = req.body;
    const complaint = req.complaint;

    // Check if complaint is resolved
    if (complaint.status !== 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be added to resolved complaints'
      });
    }

    // Check if user owns the complaint
    if (complaint.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this complaint'
      });
    }

    await complaint.addFeedback(rating, comment, sentiment);

    logger.info(`Feedback added to complaint: ${complaint.complaintId}`, {
      complaintId: complaint._id,
      rating,
      sentiment
    });

    res.json({
      success: true,
      message: 'Feedback added successfully',
      data: { complaint }
    });
  } catch (error) {
    logger.error('Add feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add feedback'
    });
  }
};

// Get complaints by department
export const getComplaintsByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Check access permissions
    if (req.user.role === 'sub_admin' && req.user.department !== department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this department'
      });
    }

    const filter = { department: department };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const complaints = await Complaint.find(filter)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .populate({
        path: 'department',
        select: 'name description',
        model: 'Department'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Complaint.countDocuments(filter);

    res.json({
      success: true,
      data: {
        complaints,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalComplaints: total,
          hasNext: skip + complaints.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    logger.error('Get complaints by department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaints'
    });
  }
};

// Get user's complaints
export const getUserComplaints = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.params.userId || req.user._id;

    // Check if user can access these complaints
    if (req.user.role === 'user' && userId && userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const filter = { userId };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const complaints = await Complaint.find(filter)
      .populate('assignedTo', 'name email')
      .populate({
        path: 'department',
        select: 'name description',
        model: 'Department'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Complaint.countDocuments(filter);

    res.json({
      success: true,
      data: {
        complaints,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalComplaints: total,
          hasNext: skip + complaints.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    logger.error('Get user complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaints'
    });
  }
};

// Update complaint department (Master Admin only)
export const updateComplaintDepartment = async (req, res) => {
  try {
    const { department } = req.body;

    if (!["master_admin", "sub_admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin users can update complaint department",
      });
    }

    const Complaint = (await import("../models/Complaint.js")).default;
    const Department = (await import("../models/Department.js")).default;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    const departmentExists = await Department.findById(department);
    if (!departmentExists) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    complaint.department = department;
    complaint.statusHistory.push({
      status: complaint.status,
      updatedBy: req.user._id,
      notes: `Department changed to ${departmentExists.name}`,
      timestamp: new Date(),
    });

    await complaint.save();

    res.json({
      success: true,
      message: "Complaint department updated successfully",
      data: complaint,
    });
  } catch (error) {
    console.error("Update complaint department error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update complaint department",
    });
  }
};

