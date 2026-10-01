import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { logger } from '../config/logger.js';

// Verify JWT token
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Check if user has specific role
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Check if user can access department-specific resources
export const authorizeDepartment = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Master admin can access all departments
  if (req.user.role === 'master_admin') {
    return next();
  }

  // Sub-admin can only access their department
  if (req.user.role === 'sub_admin') {
    const department = req.params.department || req.body.category || req.query.department;
    
    if (department && department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this department'
      });
    }
  }

  next();
};

// Check if user can access specific complaint
export const authorizeComplaintAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const complaintId = req.params.id;
    if (!complaintId) {
      return res.status(400).json({
        success: false,
        message: 'Complaint ID required'
      });
    }

    // Import Complaint model here to avoid circular dependency
    const Complaint = (await import('../models/Complaint.js')).default;
    
    let complaint;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(complaintId);
    
    if (isObjectId) {
      complaint = await Complaint.findById(complaintId);
    } else {
      // Handle CMP-XXXXXX format (virtual derived from last 6 chars of _id)
      const cmpMatch = complaintId.match(/^CMP-([0-9A-Fa-f]{6})$/i);
      const hexSuffix = cmpMatch
        ? cmpMatch[1].toLowerCase()
        : complaintId.replace(/[^0-9a-fA-F]/g, '').slice(-6).toLowerCase();

      if (hexSuffix.length === 6) {
        const allMatches = await Complaint.find({});
        complaint = allMatches.find(c =>
          c._id.toString().slice(-6).toLowerCase() === hexSuffix
        );
      }
    }

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Master admin can access all complaints
    if (req.user.role === 'master_admin') {
      req.complaint = complaint;
      return next();
    }

    // Sub-admin can access complaints in their department
    if (req.user.role === 'sub_admin') {
      if (complaint.department.toString() === req.user.department.toString()) {
        req.complaint = complaint;
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'Access denied to this complaint'
      });
    }

    // Regular user can only access their own complaints
    if (req.user.role === 'user') {
      if (complaint.userId.toString() === req.user._id.toString()) {
        req.complaint = complaint;
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'Access denied to this complaint'
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions'
    });
  } catch (error) {
    logger.error('Complaint access authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization failed'
    });
  }
};

// Optional authentication (for public endpoints that can work with or without auth)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};
