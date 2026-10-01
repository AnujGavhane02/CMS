import Complaint from '../models/Complaint.js';
import Department from '../models/Department.js';
import { logger } from '../config/logger.js';

// Track complaint by ID (public endpoint - no authentication required)
export const trackComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;

    let complaint;

    // Check if it's a full MongoDB ObjectId (24 hex chars)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(complaintId);

    if (isObjectId) {
      // Search by MongoDB _id directly
      complaint = await Complaint.findById(complaintId)
        .populate('department', 'name description')
        .populate('userId', 'name email');
    } else {
      // Handle CMP-XXXXXX format (virtual complaintId derived from last 6 chars of _id)
      const cmpMatch = complaintId.match(/^CMP-([0-9A-Fa-f]{6})$/i);
      const hexSuffix = cmpMatch
        ? cmpMatch[1].toLowerCase()
        : complaintId.replace(/[^0-9a-fA-F]/g, '').slice(-6).toLowerCase();

      if (hexSuffix.length === 6) {
        complaint = await Complaint.findOne({
          $expr: {
            $eq: [
              { $substr: [ { $toString: "$_id" }, 18, 6 ] },
              hexSuffix
            ]
          }
        })
        .populate('department', 'name description')
        .populate('userId', 'name email');
      }
    }

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Prepare response data with privacy protection
    const responseData = {
      _id: complaint._id,
      complaintId: complaint.complaintId || complaint._id.toString(), // Use _id as fallback if no custom complaintId
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      urgency: complaint.urgency,
      status: complaint.status,
      isAnonymous: complaint.isAnonymous,
      createdAt: complaint.createdAt,
      updatedAt: complaint.updatedAt,
      resolvedAt: complaint.resolvedAt,
      department: {
        name: complaint.department?.name || 'Unknown',
        description: complaint.department?.description || ''
      },
      // Only include user info if not anonymous
      user: complaint.isAnonymous ? null : {
        name: complaint.userName || complaint.userId?.name,
        email: complaint.userEmail || complaint.userId?.email
      },
      // Include status history (without sensitive internal notes)
      statusHistory: complaint.statusHistory.map(history => ({
        status: history.status,
        timestamp: history.timestamp,
        notes: history.isVisibleToUser ? history.notes : null,
        updatedBy: history.updatedBy ? 'System' : null // Don't reveal actual admin names
      })),
      // Include feedback if exists
      feedback: complaint.feedback ? {
        rating: complaint.feedback.rating,
        comment: complaint.feedback.comment,
        sentiment: complaint.feedback.sentiment,
        createdAt: complaint.feedback.createdAt
      } : null,
      // Include attachments if any (without sensitive paths)
      attachments: complaint.attachments ? complaint.attachments.map(attachment => ({
        filename: attachment.filename,
        originalName: attachment.originalName,
        size: attachment.size,
        url: attachment.url
      })) : []
    };

    logger.info(`Complaint tracked: ${complaintId}`, {
      complaintId,
      status: complaint.status,
      isAnonymous: complaint.isAnonymous,
      department: complaint.department?.name
    });

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    logger.error('Track complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaint information'
    });
  }
};

// Get complaint status by ID (minimal info for quick status checks)
export const getComplaintStatus = async (req, res) => {
  try {
    const { complaintId } = req.params;

    // Determine if it's an ObjectId or custom complaint ID
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(complaintId);
    
    let complaint;
    if (isObjectId) {
      // Search by MongoDB _id
      complaint = await Complaint.findById(complaintId)
        .select('title status urgency createdAt updatedAt isAnonymous');
    } else {
      // Handle CMP-XXXXXX format (virtual derived from last 6 chars of _id)
      const cmpMatch = complaintId.match(/^CMP-([0-9A-Fa-f]{6})$/i);
      const hexSuffix = cmpMatch
        ? cmpMatch[1].toLowerCase()
        : complaintId.replace(/[^0-9a-fA-F]/g, '').slice(-6).toLowerCase();

      if (hexSuffix.length === 6) {
        complaint = await Complaint.findOne({
          $expr: {
            $eq: [
              { $substr: [ { $toString: "$_id" }, 18, 6 ] },
              hexSuffix
            ]
          }
        })
        .select('title status urgency createdAt updatedAt isAnonymous');
      }
    }

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    const responseData = {
      complaintId: complaint.complaintId || complaint._id.toString(),
      title: complaint.title,
      status: complaint.status,
      urgency: complaint.urgency,
      isAnonymous: complaint.isAnonymous,
      createdAt: complaint.createdAt,
      updatedAt: complaint.updatedAt
    };

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    logger.error('Get complaint status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaint status'
    });
  }
};

// Search complaints by partial ID or title (for admin use)
export const searchComplaints = async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query || query.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 3 characters long'
      });
    }

    const isCMP = query.match(/^CMP-([0-9A-Fa-f]{1,6})$/i);
    const hexSuffix = isCMP ? isCMP[1].toLowerCase() : query.replace(/[^0-9a-fA-F]/g, '').toLowerCase();

    let queryObj = {};
    if (hexSuffix && hexSuffix.length >= 3) {
      queryObj = {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$_id" },
                regex: `${hexSuffix}$`,
                options: 'i'
              }
            }
          }
        ]
      };
    } else {
      queryObj = { title: { $regex: query, $options: 'i' } };
    }

    const complaints = await Complaint.find(queryObj)
    .select('complaintId title status urgency createdAt isAnonymous')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    const responseData = complaints.map(complaint => ({
      complaintId: complaint.complaintId,
      title: complaint.title,
      status: complaint.status,
      urgency: complaint.urgency,
      isAnonymous: complaint.isAnonymous,
      createdAt: complaint.createdAt
    }));

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    logger.error('Search complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search complaints'
    });
  }
};
