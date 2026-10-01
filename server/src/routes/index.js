import express from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import complaintRoutes from './complaints.js';
import analyticsRoutes from './analytics.js';
import fileRoutes from './files.js';
import departmentRoutes from './departments.js';
import subAdminRoutes from './subAdmins.js';
import subAdminReportsRoutes from './subAdminReports.js';
import trackComplaintRoutes from './trackComplaint.js';
import feedbackRoutes from './feedbacks.js';
import chatRoutes from './chat.js';
import escalationRoutes from './escalation.js';

const router = express.Router();

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/complaints', complaintRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/files', fileRoutes);
router.use('/departments', departmentRoutes);
router.use('/sub-admins', subAdminRoutes);
router.use('/sub-admin-reports', subAdminReportsRoutes);
router.use('/track', trackComplaintRoutes);
router.use('/feedbacks', feedbackRoutes);
router.use('/chat', chatRoutes);
router.use('/escalated', escalationRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CMS Backend API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    message: 'CMS Backend API Documentation',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'Login user',
        'POST /api/auth/refresh-token': 'Refresh access token',
        'POST /api/auth/logout': 'Logout user',
        'GET /api/auth/profile': 'Get user profile',
        'PUT /api/auth/profile': 'Update user profile',
        'PUT /api/auth/change-password': 'Change password'
      },
      users: {
        'GET /api/users': 'Get all users (Master Admin only)',
        'GET /api/users/stats': 'Get user statistics (Master Admin only)',
        'POST /api/users': 'Create new user (Master Admin only)',
        'GET /api/users/:id': 'Get user by ID',
        'PUT /api/users/:id': 'Update user (Master Admin only)',
        'DELETE /api/users/:id': 'Delete user (Master Admin only)',
        'GET /api/users/department/:department': 'Get users by department'
      },
      complaints: {
        'POST /api/complaints': 'Create new complaint',
        'GET /api/complaints': 'Get all complaints with filters',
        'GET /api/complaints/:id': 'Get complaint by ID',
        'PUT /api/complaints/:id/status': 'Update complaint status',
        'PUT /api/complaints/:id/assign': 'Assign complaint',
        'POST /api/complaints/:id/note': 'Add internal note',
        'POST /api/complaints/:id/feedback': 'Add feedback',
        'GET /api/complaints/department/:department': 'Get complaints by department',
        'GET /api/complaints/user/:userId': 'Get user complaints'
      },
      analytics: {
        'GET /api/analytics/dashboard': 'Get dashboard statistics',
        'GET /api/analytics/category': 'Get complaints by category',
        'GET /api/analytics/urgency': 'Get complaints by urgency',
        'GET /api/analytics/trends/monthly': 'Get monthly trends',
        'GET /api/analytics/resolution-time': 'Get resolution time analysis',
        'GET /api/analytics/satisfaction': 'Get satisfaction analysis',
        'GET /api/analytics/department-performance': 'Get department performance (Master Admin only)'
      },
      files: {
        'POST /api/files/upload': 'Upload files for complaint',
        'GET /api/files/info/:filename': 'Get file information',
        'GET /api/files/download/:filename': 'Download file',
        'DELETE /api/files/:filename': 'Delete file (Admin only)',
        'GET /api/files/stats': 'Get storage statistics (Admin only)'
      },
      departments: {
        'GET /api/departments': 'Get all departments (Master Admin only)',
        'GET /api/departments/stats': 'Get all department statistics (Master Admin only)',
        'GET /api/departments/:id': 'Get department by ID',
        'GET /api/departments/:id/stats': 'Get department statistics',
        'POST /api/departments': 'Create new department (Master Admin only)',
        'PUT /api/departments/:id': 'Update department (Master Admin only)',
        'DELETE /api/departments/:id': 'Delete department (Master Admin only)',
        'POST /api/departments/:id/sub-admins': 'Add sub-admin to department (Master Admin only)',
        'DELETE /api/departments/:id/sub-admins': 'Remove sub-admin from department (Master Admin only)'
      },
      subAdmins: {
        'GET /api/sub-admins': 'Get all sub-admins (Master Admin only)',
        'GET /api/sub-admins/stats': 'Get sub-admin statistics (Master Admin only)',
        'GET /api/sub-admins/available-departments': 'Get available departments for assignment (Master Admin only)',
        'GET /api/sub-admins/:id': 'Get sub-admin by ID',
        'POST /api/sub-admins': 'Create new sub-admin (Master Admin only)',
        'PUT /api/sub-admins/:id': 'Update sub-admin (Master Admin only)',
        'DELETE /api/sub-admins/:id': 'Delete sub-admin (Master Admin only)',
        'POST /api/sub-admins/:id/reset-password': 'Reset sub-admin password (Master Admin only)'
      },
      feedbacks: {
        'POST /api/feedbacks': 'Create new feedback',
        'GET /api/feedbacks/complaint/:complaintId': 'Get feedbacks for a complaint',
        'GET /api/feedbacks/department/:departmentId': 'Get feedbacks for a department',
        'GET /api/feedbacks/user': 'Get user feedbacks',
        'GET /api/feedbacks/stats': 'Get overall feedback statistics',
        'PUT /api/feedbacks/:feedbackId': 'Update feedback',
        'DELETE /api/feedbacks/:feedbackId': 'Delete feedback',
        'PATCH /api/feedbacks/:feedbackId/visibility': 'Toggle feedback visibility (Admin only)'
      }
    }
  });
});

export default router;
