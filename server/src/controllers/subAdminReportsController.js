import User from '../models/User.js';
import Department from '../models/Department.js';
import Complaint from '../models/Complaint.js';
import Feedback from '../models/Feedback.js';
import { logger } from '../config/logger.js';

// Get sub-admin department reports
export const getSubAdminReports = async (req, res) => {
  try {
    const { subAdminId } = req.params;
    const { period = 'month' } = req.query; // month, week, year

    // Check authorization - sub-admins can only access their own reports
    if (req.user.role === 'sub_admin' && req.user._id.toString() !== subAdminId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own reports.'
      });
    }

    // Get sub-admin details
    const subAdmin = await User.findById(subAdminId)
      .populate('department', 'name description');
    
    if (!subAdmin || subAdmin.role !== 'sub_admin') {
      return res.status(404).json({
        success: false,
        message: 'Sub-admin not found'
      });
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
    }

    // Get complaints for this department using department ObjectId
    let complaints = await Complaint.find({
      department: subAdmin.department._id,
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('userId', 'name email');

    // If no complaints found in date range, get all complaints for this department
    if (complaints.length === 0) {
      complaints = await Complaint.find({
        department: subAdmin.department._id
      }).populate('userId', 'name email');
    }

    // Debug logging
    logger.info(`Reports debug for sub-admin: ${subAdmin.name}`, {
      subAdminId: subAdmin._id,
      departmentName: subAdmin.department.name,
      departmentId: subAdmin.department._id,
      period,
      startDate,
      endDate,
      complaintsFound: complaints.length,
      complaintStatuses: [...new Set(complaints.map(c => c.status))],
      allComplaintsInDept: await Complaint.countDocuments({ department: subAdmin.department._id })
    });

    // Calculate basic statistics
    const totalComplaints = complaints.length;
    const resolvedComplaints = complaints.filter(c => c.status === 'resolved').length;
    const pendingComplaints = complaints.filter(c => c.status === 'pending').length;
    const processingComplaints = complaints.filter(c => c.status === 'processing').length;
    const rejectedComplaints = complaints.filter(c => c.status === 'rejected').length;

    // Calculate resolution rate
    const resolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0;

    // Calculate average resolution time
    const resolvedComplaintsWithTime = complaints.filter(c => c.status === 'resolved' && c.resolvedAt);
    const avgResolutionTime = resolvedComplaintsWithTime.length > 0 
      ? resolvedComplaintsWithTime.reduce((sum, c) => {
          const resolutionTime = (new Date(c.resolvedAt) - new Date(c.createdAt)) / (1000 * 60 * 60 * 24);
          return sum + resolutionTime;
        }, 0) / resolvedComplaintsWithTime.length
      : 0;

    // Get complaints by urgency
    const urgencyStats = complaints.reduce((acc, complaint) => {
      const urgency = complaint.urgency || 'medium'; // Default to medium if urgency is undefined
      acc[urgency] = (acc[urgency] || 0) + 1;
      return acc;
    }, { low: 0, medium: 0, high: 0 });

    // Get weekly data for charts
    const weeklyData = await getWeeklyData(subAdmin.department._id, startDate, endDate);

    // Get category breakdown (if complaints have subcategories)
    const categoryBreakdown = await getCategoryBreakdown(subAdmin.department._id, startDate, endDate);

    // Get recent complaints
    const recentComplaints = await Complaint.find({
      department: subAdmin.department._id
    })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(10);

    // Get satisfaction data and sentiment analysis
    const satisfactionData = await getSatisfactionData(subAdmin.department._id, startDate, endDate);
    const sentimentData = await getSentimentData(subAdmin.department._id, startDate, endDate);

    logger.info(`Sub-admin reports generated for: ${subAdmin.name}`, {
      subAdminId: subAdmin._id,
      department: subAdmin.department.name,
      period,
      totalComplaints
    });

    res.json({
      success: true,
      data: {
        subAdmin: {
          _id: subAdmin._id,
          name: subAdmin.name,
          email: subAdmin.email,
          department: subAdmin.department
        },
        period,
        dateRange: { startDate, endDate },
        summary: {
          totalComplaints,
          resolvedComplaints,
          pendingComplaints,
          processingComplaints,
          rejectedComplaints,
          resolutionRate,
          avgResolutionTime: Math.round(avgResolutionTime * 10) / 10
        },
        urgencyStats,
        weeklyData,
        categoryBreakdown,
        recentComplaints: recentComplaints.map(c => ({
          _id: c._id,
          title: c.title,
          status: c.status,
          urgency: c.urgency,
          createdAt: c.createdAt,
          resolvedAt: c.resolvedAt,
          user: c.userId
        })),
        satisfactionData,
        sentimentData
      }
    });
  } catch (error) {
    logger.error('Get sub-admin reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sub-admin reports'
    });
  }
};

// Get weekly performance data
async function getWeeklyData(departmentId, startDate, endDate) {
  try {
    // First try with date range
    let weeklyStats = await Complaint.aggregate([
      {
        $match: {
          department: departmentId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            week: { $week: '$createdAt' }
          },
          received: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          processing: {
            $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } }
    ]);

    // If no data in date range, get all data for the department
    if (weeklyStats.length === 0) {
      weeklyStats = await Complaint.aggregate([
        {
          $match: {
            department: departmentId
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              week: { $week: '$createdAt' }
            },
            received: { $sum: 1 },
            resolved: {
              $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            processing: {
              $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } }
      ]);
    }

    return weeklyStats.map(stat => ({
      week: `Week ${stat._id.week}`,
      received: stat.received,
      resolved: stat.resolved,
      pending: stat.pending,
      processing: stat.processing
    }));
  } catch (error) {
    logger.error('Get weekly data error:', error);
    return [];
  }
}

// Get category breakdown
async function getCategoryBreakdown(departmentId, startDate, endDate) {
  try {
    // Since complaints are already categorized by department, we can break down by urgency
    let urgencyBreakdown = await Complaint.aggregate([
      {
        $match: {
          department: departmentId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$urgency',
          count: { $sum: 1 }
        }
      }
    ]);

    // If no data in date range, get all data for the department
    if (urgencyBreakdown.length === 0) {
      urgencyBreakdown = await Complaint.aggregate([
        {
          $match: {
            department: departmentId
          }
        },
        {
          $group: {
            _id: '$urgency',
            count: { $sum: 1 }
          }
        }
      ]);
    }

    return urgencyBreakdown.map(item => ({
      category: (item._id || 'medium').charAt(0).toUpperCase() + (item._id || 'medium').slice(1),
      count: item.count
    }));
  } catch (error) {
    logger.error('Get category breakdown error:', error);
    return [];
  }
}

// Get satisfaction data using new Feedback model
async function getSatisfactionData(departmentId, startDate, endDate) {
  try {
    const filter = { department: departmentId };
    if (startDate && endDate) {
      filter.createdAt = { $gte: startDate, $lte: endDate };
    }

    const satisfactionStats = await Feedback.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          positive: {
            $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] }
          },
          negative: {
            $sum: { $cond: [{ $lte: ['$rating', 2] }, 1, 0] }
          }
        }
      }
    ]);

    if (satisfactionStats.length === 0) {
      return {
        totalFeedback: 0,
        avgRating: 0,
        satisfactionRate: 0,
        positive: 0,
        negative: 0
      };
    }

    const stats = satisfactionStats[0];
    const satisfactionRate = stats.totalFeedback > 0 
      ? Math.round((stats.positive / stats.totalFeedback) * 100) 
      : 0;

    return {
      totalFeedback: stats.totalFeedback,
      avgRating: Math.round(stats.avgRating * 10) / 10,
      satisfactionRate,
      positive: stats.positive,
      negative: stats.negative
    };
  } catch (error) {
    logger.error('Get satisfaction data error:', error);
    return {
      totalFeedback: 0,
      avgRating: 0,
      satisfactionRate: 0,
      positive: 0,
      negative: 0
    };
  }
}

// Get sentiment data for department
async function getSentimentData(departmentId, startDate, endDate) {
  try {
    const filter = { department: departmentId };
    if (startDate && endDate) {
      filter.createdAt = { $gte: startDate, $lte: endDate };
    }

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

    if (sentimentStats.length === 0) {
      return {
        totalFeedbacks: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        avgRating: 0,
        avgSentimentScore: 0
      };
    }

    const stats = sentimentStats[0];
    return {
      totalFeedbacks: stats.totalFeedbacks,
      positive: stats.positive,
      neutral: stats.neutral,
      negative: stats.negative,
      avgRating: Math.round(stats.avgRating * 10) / 10,
      avgSentimentScore: Math.round(stats.avgSentimentScore * 100) / 100
    };
  } catch (error) {
    logger.error('Get sentiment data error:', error);
    return {
      totalFeedbacks: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      avgRating: 0,
      avgSentimentScore: 0
    };
  }
}

// Get department comparison data
export const getDepartmentComparison = async (req, res) => {
  try {
    const { subAdminId } = req.params;

    const subAdmin = await User.findById(subAdminId)
      .populate('department', 'name description');
    
    if (!subAdmin || subAdmin.role !== 'sub_admin') {
      return res.status(404).json({
        success: false,
        message: 'Sub-admin not found'
      });
    }

    // Get all departments for comparison
    const departments = await Department.find({ isActive: true });
    
    const departmentStats = await Promise.all(
      departments.map(async (dept) => {
        const complaints = await Complaint.find({ category: dept.name });
        const resolved = complaints.filter(c => c.status === 'resolved').length;
        const resolutionRate = complaints.length > 0 ? Math.round((resolved / complaints.length) * 100) : 0;
        
        return {
          name: dept.name,
          totalComplaints: complaints.length,
          resolutionRate,
          isCurrentDepartment: dept.name === subAdmin.department.name
        };
      })
    );

    res.json({
      success: true,
      data: {
        currentDepartment: subAdmin.department.name,
        departmentStats
      }
    });
  } catch (error) {
    logger.error('Get department comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve department comparison'
    });
  }
};
