import Feedback from '../models/Feedback.js';
import Complaint from '../models/Complaint.js';
import Department from '../models/Department.js';
import { analyzeFeedbackSentiment } from '../utils/sentiment.js';
import { validationResult } from 'express-validator';

// Create new feedback
export const createFeedback = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { complaintId, rating, note } = req.body;
    const userId = req.user.id;

    // Check if complaint exists and is resolved
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    if (complaint.status !== 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be submitted for resolved complaints'
      });
    }

    // Check if user is the owner of the complaint
    if (complaint.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only submit feedback for your own complaints'
      });
    }

    // Analyze sentiment
    const sentimentAnalysis = analyzeFeedbackSentiment(rating, note);

    // Create feedback
    const feedback = new Feedback({
      complaint: complaintId,
      department: complaint.department,
      user: userId,
      rating,
      note,
      sentiment: {
        score: sentimentAnalysis.score,
        category: sentimentAnalysis.sentiment,
        confidence: sentimentAnalysis.confidence
      }
    });

    await feedback.save();

    // Populate the feedback with user details
    await feedback.populate('user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback
    });

  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get feedbacks for a specific complaint
export const getComplaintFeedbacks = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if complaint exists
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Check permissions
    const canViewFeedbacks = 
      userRole === 'master_admin' || 
      userRole === 'sub_admin' || 
      complaint.userId.toString() === userId;

    if (!canViewFeedbacks) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view feedbacks for this complaint'
      });
    }

    // Get feedbacks
    const feedbacks = await Feedback.findByComplaint(complaintId);

    // Get feedback statistics
    const stats = await Feedback.getComplaintFeedbackStats(complaintId);

    res.json({
      success: true,
      data: {
        feedbacks,
        statistics: stats[0] || {
          totalFeedbacks: 0,
          averageRating: 0,
          positiveCount: 0,
          neutralCount: 0,
          negativeCount: 0,
          ratingDistribution: []
        }
      }
    });

  } catch (error) {
    console.error('Get complaint feedbacks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get feedbacks for a department
export const getDepartmentFeedbacks = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { startDate, endDate } = req.query;
    const userRole = req.user.role;

    // Check permissions
    if (userRole !== 'master_admin' && userRole !== 'sub_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view department feedbacks'
      });
    }

    // Check if department exists
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Get feedbacks
    const feedbacks = await Feedback.findByDepartment(departmentId);

    // Get feedback statistics
    const stats = await Feedback.getDepartmentFeedbackStats(departmentId, startDate, endDate);

    res.json({
      success: true,
      data: {
        feedbacks,
        statistics: stats[0] || {
          totalFeedbacks: 0,
          averageRating: 0,
          positiveCount: 0,
          neutralCount: 0,
          negativeCount: 0,
          ratingDistribution: []
        }
      }
    });

  } catch (error) {
    console.error('Get department feedbacks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user's feedbacks
export const getUserFeedbacks = async (req, res) => {
  try {
    const userId = req.user.id;

    const feedbacks = await Feedback.findByUser(userId);

    res.json({
      success: true,
      data: feedbacks
    });

  } catch (error) {
    console.error('Get user feedbacks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update feedback
export const updateFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { rating, note } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Find feedback
    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check permissions
    const canUpdate = 
      userRole === 'master_admin' || 
      userRole === 'sub_admin' || 
      feedback.user.toString() === userId;

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this feedback'
      });
    }

    // Update feedback
    feedback.rating = rating;
    feedback.note = note;

    // Re-analyze sentiment
    const sentimentAnalysis = analyzeFeedbackSentiment(rating, note);
    feedback.sentiment = {
      score: sentimentAnalysis.score,
      category: sentimentAnalysis.sentiment,
      confidence: sentimentAnalysis.confidence
    };

    await feedback.save();

    // Populate the feedback with user details
    await feedback.populate('user', 'name email');

    res.json({
      success: true,
      message: 'Feedback updated successfully',
      data: feedback
    });

  } catch (error) {
    console.error('Update feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete feedback
export const deleteFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Find feedback
    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check permissions
    const canDelete = 
      userRole === 'master_admin' || 
      userRole === 'sub_admin' || 
      feedback.user.toString() === userId;

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this feedback'
      });
    }

    await Feedback.findByIdAndDelete(feedbackId);

    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });

  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get overall feedback statistics
export const getOverallFeedbackStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userRole = req.user.role;

    // Check permissions
    if (userRole !== 'master_admin' && userRole !== 'sub_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view overall feedback statistics'
      });
    }

    const stats = await Feedback.getOverallFeedbackStats(startDate, endDate);

    res.json({
      success: true,
      data: stats[0] || {
        totalFeedbacks: 0,
        averageRating: 0,
        positiveCount: 0,
        neutralCount: 0,
        negativeCount: 0
      }
    });

  } catch (error) {
    console.error('Get overall feedback stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Toggle feedback visibility
export const toggleFeedbackVisibility = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const userRole = req.user.role;

    // Check permissions
    if (userRole !== 'master_admin' && userRole !== 'sub_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to toggle feedback visibility'
      });
    }

    // Find feedback
    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Toggle visibility
    feedback.isVisible = !feedback.isVisible;
    await feedback.save();

    res.json({
      success: true,
      message: `Feedback ${feedback.isVisible ? 'shown' : 'hidden'} successfully`,
      data: feedback
    });

  } catch (error) {
    console.error('Toggle feedback visibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all feedbacks (Master Admin gets all, Sub-Admin gets department specific)
export const getAllFeedbacks = async (req, res) => {
  try {
    const userRole = req.user.role;
    const { page = 1, limit = 10, rating, sentiment } = req.query;

    if (userRole !== 'master_admin' && userRole !== 'sub_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view feedbacks'
      });
    }

    const filter = {};

    // Restrict Sub-Admin to their department feedbacks
    if (userRole === 'sub_admin') {
      filter.department = req.user.department;
    }

    if (rating && rating !== 'all') filter.rating = parseInt(rating);
    if (sentiment && sentiment !== 'all') filter['sentiment.category'] = sentiment;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const feedbacks = await Feedback.find(filter)
      .populate('user', 'name email')
      .populate('department', 'name')
      .populate('complaint', 'title urgency complaintId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments(filter);

    res.json({
      success: true,
      data: {
        feedbacks,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalFeedbacks: total,
          hasNext: skip + feedbacks.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all feedbacks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
