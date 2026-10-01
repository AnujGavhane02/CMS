import express from 'express';
import { body, param, query } from 'express-validator';
import {
  createFeedback,
  getComplaintFeedbacks,
  getDepartmentFeedbacks,
  getUserFeedbacks,
  updateFeedback,
  deleteFeedback,
  getOverallFeedbackStats,
  toggleFeedbackVisibility,
  getAllFeedbacks
} from '../controllers/feedbackController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const feedbackValidation = [
  body('complaintId')
    .isMongoId()
    .withMessage('Valid complaint ID is required'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('note')
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Note is required and must be between 1 and 1000 characters')
];

const updateFeedbackValidation = [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('note')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Note must be between 1 and 1000 characters')
];

const complaintIdValidation = [
  param('complaintId')
    .isMongoId()
    .withMessage('Valid complaint ID is required')
];

const feedbackIdValidation = [
  param('feedbackId')
    .isMongoId()
    .withMessage('Valid feedback ID is required')
];

const departmentIdValidation = [
  param('departmentId')
    .isMongoId()
    .withMessage('Valid department ID is required')
];

const dateValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
];

// Create new feedback
router.post('/', authenticateToken, feedbackValidation, createFeedback);

// Get feedbacks for a specific complaint
router.get('/complaint/:complaintId', authenticateToken, complaintIdValidation, getComplaintFeedbacks);

// Get feedbacks for a department
router.get('/department/:departmentId', authenticateToken, departmentIdValidation, dateValidation, getDepartmentFeedbacks);

// Get user's feedbacks
router.get('/user', authenticateToken, getUserFeedbacks);

// Get overall feedback statistics
router.get('/stats', authenticateToken, dateValidation, getOverallFeedbackStats);

// Get all feedbacks
router.get('/', authenticateToken, getAllFeedbacks);

// Update feedback
router.put('/:feedbackId', authenticateToken, feedbackIdValidation, updateFeedbackValidation, updateFeedback);

// Delete feedback
router.delete('/:feedbackId', authenticateToken, feedbackIdValidation, deleteFeedback);

// Toggle feedback visibility (admin/subadmin only)
router.patch('/:feedbackId/visibility', authenticateToken, feedbackIdValidation, toggleFeedbackVisibility);

export default router;
