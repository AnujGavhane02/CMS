import { body, param, query, validationResult } from 'express-validator';
import { logger } from '../config/logger.js';

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    logger.warn('Validation errors:', errorMessages);
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  
  next();
};

// User validation rules
export const validateUserRegistration = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('role')
    .optional()
    .isIn(['master_admin', 'sub_admin', 'user'])
    .withMessage('Invalid role'),
  
  body('department')
    .optional()
    .isMongoId()
    .withMessage('Invalid department ID'),
  
  handleValidationErrors
];

export const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

export const validateUserUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('department')
    .optional()
    .isMongoId()
    .withMessage('Invalid department ID'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  handleValidationErrors
];

// Complaint validation rules
export const validateComplaintCreation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  
  body('department')
    .isMongoId()
    .withMessage('Invalid department ID'),
  
  body('urgency')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid urgency level'),
  
  body('isAnonymous')
    .optional()
    .isBoolean()
    .withMessage('isAnonymous must be a boolean'),
  
  handleValidationErrors
];

export const validateComplaintUpdate = [
  body('status')
    .optional()
    .isIn(['pending', 'processing', 'resolved', 'rejected'])
    .withMessage('Invalid status'),
  
  body('urgency')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid urgency level'),
  
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid assigned user ID'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  
  handleValidationErrors
];

export const validateFeedback = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),
  
  body('sentiment')
    .optional()
    .isIn(['positive', 'neutral', 'negative'])
    .withMessage('Invalid sentiment'),
  
  handleValidationErrors
];

// Parameter validation
export const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  
  handleValidationErrors
];

// Validate subAdminId parameter
export const validateSubAdminId = [
  param('subAdminId')
    .isMongoId()
    .withMessage('Invalid sub-admin ID format'),
  
  handleValidationErrors
];

// Validate complaint ID parameter (supports both ObjectId and custom complaint IDs)
export const validateComplaintId = [
  param('complaintId')
    .notEmpty()
    .withMessage('Complaint ID is required')
    .custom((value) => {
      // Check if it's a MongoDB ObjectId (24 hex characters)
      if (/^[0-9a-fA-F]{24}$/.test(value)) {
        return true;
      }
      // Check if it's a custom complaint ID format (3-20 chars, uppercase letters, numbers, hyphens)
      if (/^[A-Z0-9-]{3,20}$/.test(value)) {
        return true;
      }
      throw new Error('Invalid complaint ID format. Must be either a valid ObjectId or custom ID format (e.g., CMP-001)');
    }),
  
  handleValidationErrors
];

// Validate parameter 'id' for complaint routes (supports both ObjectId and custom complaint IDs)
export const validateComplaintIdParam = [
  param('id')
    .notEmpty()
    .withMessage('Complaint ID is required')
    .custom((value) => {
      if (/^[0-9a-fA-F]{24}$/.test(value)) {
        return true;
      }
      if (/^[A-Z0-9-]{3,20}$/.test(value)) {
        return true;
      }
      throw new Error('Invalid ID format. Must be either a valid ObjectId or custom ID format (e.g., CMP-001)');
    }),
  
  handleValidationErrors
];

// Query validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Limit must be between 1 and 10000'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'status', 'urgency', 'title'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  handleValidationErrors
];

export const validateComplaintFilters = [
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'resolved', 'rejected'])
    .withMessage('Invalid status filter'),
  
  query('category')
    .optional()
    .isIn(['IT', 'Library', 'Hostel', 'Academics', 'Sports', 'Cafeteria', 'Transport', 'Maintenance'])
    .withMessage('Invalid category filter'),
  
  query('urgency')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid urgency filter'),
  
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateFrom'),
  
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateTo'),
  
  handleValidationErrors
];

// Sub-admin validation rules
export const validateSubAdminCreation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('department')
    .notEmpty()
    .withMessage('Department is required')
    .isMongoId()
    .withMessage('Invalid department ID')
    .custom(async (value) => {
      const Department = (await import('../models/Department.js')).default;
      const department = await Department.findOne({ _id: value, isActive: true });
      if (!department) {
        throw new Error('Department not found or inactive');
      }
      return true;
    }),
  
  handleValidationErrors
];

export const validateSubAdminUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('department')
    .optional()
    .isMongoId()
    .withMessage('Invalid department ID')
    .custom(async (value) => {
      if (value) {
        const Department = (await import('../models/Department.js')).default;
        const department = await Department.findOne({ _id: value, isActive: true });
        if (!department) {
          throw new Error('Department not found or inactive');
        }
      }
      return true;
    }),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  handleValidationErrors
];

// File upload validation
export const validateFileUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB

  const files = req.files || [req.file];
  
  for (const file of files) {
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `File type ${file.mimetype} is not allowed`
      });
    }

    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`
      });
    }
  }

  next();
};
