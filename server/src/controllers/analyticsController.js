import Complaint from '../models/Complaint.js';
import User from '../models/User.js';
import Feedback from '../models/Feedback.js';
import { logger } from '../config/logger.js';

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    const { department, dateFrom, dateTo } = req.query;
    
    // Build filter based on user role and parameters
    const filter = {};
    
    if (req.user.role === 'sub_admin') {
      filter.department = req.user.department;
    } else if (department) {
      filter.department = department;
    }
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Get basic statistics
    const stats = await Complaint.aggregate([
      { $match: filter },
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

    // Get resolution time statistics
    const resolutionStats = await Complaint.aggregate([
      {
        $match: {
          ...filter,
          status: 'resolved',
          resolvedAt: { $exists: true }
        }
      },
      {
        $project: {
          resolutionTime: {
            $ceil: {
              $divide: [
                { $subtract: ['$resolvedAt', '$createdAt'] },
                1000 * 60 * 60 * 24 // Convert to days
              ]
            }
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

    // Get satisfaction rate from Feedback model
    const satisfactionStats = await Feedback.aggregate([
      {
        $match: filter
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalFeedback: { $sum: 1 }
        }
      }
    ]);

    const result = {
      totalComplaints: stats[0]?.totalComplaints || 0,
      pending: stats[0]?.pending || 0,
      processing: stats[0]?.processing || 0,
      resolved: stats[0]?.resolved || 0,
      rejected: stats[0]?.rejected || 0,
      avgResolutionTime: resolutionStats[0]?.avgResolutionTime || 0,
      satisfactionRate: satisfactionStats[0]?.avgRating || 0,
      totalFeedback: satisfactionStats[0]?.totalFeedback || 0
    };

    logger.info(`Dashboard stats retrieved by: ${req.user.email}`, {
      userId: req.user._id,
      role: req.user.role,
      filter
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics'
    });
  }
};

// Get complaints by category
export const getComplaintsByCategory = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const filter = {};
    if (req.user.role === 'sub_admin') {
      filter.department = req.user.department;
    }
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const categoryStats = await Complaint.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'departments',
          localField: 'department',
          foreignField: '_id',
          as: 'departmentInfo'
        }
      },
      {
        $unwind: {
          path: '$departmentInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$department',
          departmentName: { $first: '$departmentInfo.name' },
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          processing: {
            $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({
      success: true,
      data: categoryStats
    });
  } catch (error) {
    logger.error('Get complaints by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve category statistics'
    });
  }
};

// Get complaints by urgency
export const getComplaintsByUrgency = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const filter = {};
    if (req.user.role === 'sub_admin') {
      filter.department = req.user.department;
    }
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const urgencyStats = await Complaint.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$urgency',
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          processing: {
            $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: urgencyStats
    });
  } catch (error) {
    logger.error('Get complaints by urgency error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve urgency statistics'
    });
  }
};

// Get monthly trends
export const getMonthlyTrends = async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const { department } = req.params;
    
    const filter = {};
    if (req.user.role === 'sub_admin') {
      filter.department = req.user.department;
    } else if (department) {
      filter.department = department;
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    filter.createdAt = { $gte: startDate };

    const trends = await Complaint.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          processing: {
            $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    logger.error('Get monthly trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve monthly trends'
    });
  }
};

// Get resolution time analysis
export const getResolutionTimeAnalysis = async (req, res) => {
  try {
    const { department, dateFrom, dateTo } = req.query;
    
    const filter = {
      status: 'resolved',
      resolvedAt: { $exists: true }
    };
    
    if (req.user.role === 'sub_admin') {
      filter.department = req.user.department;
    } else if (department) {
      filter.department = department;
    }
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const resolutionAnalysis = await Complaint.aggregate([
      { $match: filter },
      {
        $project: {
          resolutionTime: {
            $ceil: {
              $divide: [
                { $subtract: ['$resolvedAt', '$createdAt'] },
                1000 * 60 * 60 * 24 // Convert to days
              ]
            }
          },
          department: 1,
          urgency: 1
        }
      },
      {
        $group: {
          _id: null,
          avgResolutionTime: { $avg: '$resolutionTime' },
          minResolutionTime: { $min: '$resolutionTime' },
          maxResolutionTime: { $max: '$resolutionTime' },
          totalResolved: { $sum: 1 },
          byCategory: {
            $push: {
              category: '$category',
              urgency: '$urgency',
              resolutionTime: '$resolutionTime'
            }
          }
        }
      }
    ]);

    // Get resolution time by category
    const byCategory = await Complaint.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'departments',
          localField: 'department',
          foreignField: '_id',
          as: 'departmentInfo'
        }
      },
      {
        $unwind: {
          path: '$departmentInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          resolutionTime: {
            $ceil: {
              $divide: [
                { $subtract: ['$resolvedAt', '$createdAt'] },
                1000 * 60 * 60 * 24
              ]
            }
          },
          department: 1,
          departmentName: '$departmentInfo.name'
        }
      },
      {
        $group: {
          _id: '$department',
          departmentName: { $first: '$departmentName' },
          avgResolutionTime: { $avg: '$resolutionTime' },
          count: { $sum: 1 }
        }
      },
      { $sort: { avgResolutionTime: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overall: resolutionAnalysis[0] || {},
        byCategory
      }
    });
  } catch (error) {
    logger.error('Get resolution time analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resolution time analysis'
    });
  }
};

// Get satisfaction analysis
export const getSatisfactionAnalysis = async (req, res) => {
  try {
    const { department, dateFrom, dateTo } = req.query;
    
    const filter = {};
    
    if (req.user.role === 'sub_admin') {
      filter.department = req.user.department;
    } else if (department) {
      filter.department = department;
    }
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const satisfactionAnalysis = await Feedback.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalFeedback: { $sum: 1 },
          positive: {
            $sum: { 
              $cond: [
                { 
                  $or: [
                    { $eq: ['$sentiment.category', 'Positive'] },
                    { $eq: ['$sentiment.category', 'positive'] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          },
          neutral: {
            $sum: { 
              $cond: [
                { 
                  $or: [
                    { $eq: ['$sentiment.category', 'Neutral'] },
                    { $eq: ['$sentiment.category', 'neutral'] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          },
          negative: {
            $sum: { 
              $cond: [
                { 
                  $or: [
                    { $eq: ['$sentiment.category', 'Negative'] },
                    { $eq: ['$sentiment.category', 'negative'] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          }
        }
      }
    ]);

    // Get satisfaction by department
    const byCategory = await Feedback.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'departments',
          localField: 'department',
          foreignField: '_id',
          as: 'departmentInfo'
        }
      },
      {
        $unwind: {
          path: '$departmentInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$department',
          departmentName: { $first: '$departmentInfo.name' },
          avgRating: { $avg: '$rating' },
          totalFeedback: { $sum: 1 },
          positive: {
            $sum: { 
              $cond: [
                { 
                  $or: [
                    { $eq: ['$sentiment.category', 'Positive'] },
                    { $eq: ['$sentiment.category', 'positive'] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          },
          neutral: {
            $sum: { 
              $cond: [
                { 
                  $or: [
                    { $eq: ['$sentiment.category', 'Neutral'] },
                    { $eq: ['$sentiment.category', 'neutral'] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          },
          negative: {
            $sum: { 
              $cond: [
                { 
                  $or: [
                    { $eq: ['$sentiment.category', 'Negative'] },
                    { $eq: ['$sentiment.category', 'negative'] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          }
        }
      },
      { $sort: { avgRating: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overall: satisfactionAnalysis[0] || {},
        byCategory
      }
    });
  } catch (error) {
    logger.error('Get satisfaction analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve satisfaction analysis'
    });
  }
};

// Get department performance
export const getDepartmentPerformance = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const filter = {};
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const departmentPerformance = await Complaint.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$department',
          totalComplaints: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $eq: ['$status', 'resolved'] },
                {
                  $ceil: {
                    $divide: [
                      { $subtract: ['$resolvedAt', '$createdAt'] },
                      1000 * 60 * 60 * 24
                    ]
                  }
                },
                null
              ]
            }
          },
          avgSatisfaction: {
            $avg: {
              $cond: [
                { $ne: ['$feedback.rating', null] },
                '$feedback.rating',
                null
              ]
            }
          }
        }
      },
      {
        $addFields: {
          resolutionRate: {
            $multiply: [
              { $divide: ['$resolved', '$totalComplaints'] },
              100
            ]
          }
        }
      },
      { $sort: { resolutionRate: -1 } }
    ]);

    res.json({
      success: true,
      data: departmentPerformance
    });
  } catch (error) {
    logger.error('Get department performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve department performance'
    });
  }
};

// Get sentiment analysis from feedbacks
export const getSentimentAnalysis = async (req, res) => {
  try {
    const { department, dateFrom, dateTo } = req.query;
    
    const filter = {};
    
    if (req.user.role === 'sub_admin') {
      filter.department = req.user.department;
    } else if (department) {
      filter.department = department;
    }
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Get overall sentiment statistics
    const sentimentStats = await Feedback.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalFeedbacks: { $sum: 1 },
          positive: {
            $sum: { 
              $cond: [
                { 
                  $or: [
                    { $eq: ['$sentiment.category', 'Positive'] },
                    { $eq: ['$sentiment.category', 'positive'] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          },
          neutral: {
            $sum: { 
              $cond: [
                { 
                  $or: [
                    { $eq: ['$sentiment.category', 'Neutral'] },
                    { $eq: ['$sentiment.category', 'neutral'] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          },
          negative: {
            $sum: { 
              $cond: [
                { 
                  $or: [
                    { $eq: ['$sentiment.category', 'Negative'] },
                    { $eq: ['$sentiment.category', 'negative'] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          },
          avgRating: { $avg: '$rating' },
          avgSentimentScore: { $avg: '$sentiment.score' }
        }
      }
    ]);

    // Get sentiment by department
    const sentimentByDepartment = await Feedback.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'departments',
          localField: 'department',
          foreignField: '_id',
          as: 'departmentInfo'
        }
      },
      {
        $unwind: {
          path: '$departmentInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$department',
          departmentName: { $first: '$departmentInfo.name' },
          totalFeedbacks: { $sum: 1 },
          positive: {
            $sum: { 
              $cond: [
                { 
                  $or: [
                    { $eq: ['$sentiment.category', 'Positive'] },
                    { $eq: ['$sentiment.category', 'positive'] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          },
          neutral: {
            $sum: { 
              $cond: [
                { 
                  $or: [
                    { $eq: ['$sentiment.category', 'Neutral'] },
                    { $eq: ['$sentiment.category', 'neutral'] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          },
          negative: {
            $sum: { 
              $cond: [
                { 
                  $or: [
                    { $eq: ['$sentiment.category', 'Negative'] },
                    { $eq: ['$sentiment.category', 'negative'] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          },
          avgRating: { $avg: '$rating' },
          avgSentimentScore: { $avg: '$sentiment.score' }
        }
      },
      {
        $addFields: {
          positivePercentage: {
            $multiply: [
              { $divide: ['$positive', '$totalFeedbacks'] },
              100
            ]
          },
          negativePercentage: {
            $multiply: [
              { $divide: ['$negative', '$totalFeedbacks'] },
              100
            ]
          }
        }
      },
      { $sort: { avgRating: -1 } }
    ]);

    // Get sentiment trends over time
    const sentimentTrends = await Feedback.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalFeedbacks: { $sum: 1 },
          positive: {
            $sum: { 
              $cond: [
                { 
                  $or: [
                    { $eq: ['$sentiment.category', 'Positive'] },
                    { $eq: ['$sentiment.category', 'positive'] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          },
          neutral: {
            $sum: { 
              $cond: [
                { 
                  $or: [
                    { $eq: ['$sentiment.category', 'Neutral'] },
                    { $eq: ['$sentiment.category', 'neutral'] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          },
          negative: {
            $sum: { 
              $cond: [
                { 
                  $or: [
                    { $eq: ['$sentiment.category', 'Negative'] },
                    { $eq: ['$sentiment.category', 'negative'] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          },
          avgRating: { $avg: '$rating' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const result = {
      overall: sentimentStats[0] || {
        totalFeedbacks: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        avgRating: 0,
        avgSentimentScore: 0
      },
      byDepartment: sentimentByDepartment,
      trends: sentimentTrends
    };

    logger.info(`Sentiment analysis retrieved by: ${req.user.email}`, {
      userId: req.user._id,
      role: req.user.role,
      filter
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Get sentiment analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sentiment analysis'
    });
  }
};
