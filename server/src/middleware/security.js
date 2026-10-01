import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';
import { logger } from '../config/logger.js';

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// MongoDB injection protection
export const mongoSanitization = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn(`MongoDB injection attempt detected: ${key}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    });
  }
});

// XSS protection
export const xssProtection = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    }
  }

  // Sanitize query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = xss(req.query[key]);
      }
    }
  }

  next();
};

// Request size limiter
export const requestSizeLimiter = (req, res, next) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const contentLength = parseInt(req.get('content-length') || '0');
  
  if (contentLength > maxSize) {
    logger.warn(`Request size limit exceeded: ${contentLength} bytes`, {
      ip: req.ip,
      url: req.url
    });
    
    return res.status(413).json({
      success: false,
      message: 'Request entity too large'
    });
  }
  
  next();
};

// IP whitelist middleware (for admin endpoints)
export const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // No whitelist configured
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.includes(clientIP)) {
      return next();
    }

    logger.warn(`Unauthorized IP access attempt: ${clientIP}`, {
      url: req.url,
      userAgent: req.get('User-Agent')
    });

    return res.status(403).json({
      success: false,
      message: 'Access denied from this IP address'
    });
  };
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous'
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

// Error handler for security-related errors
export const securityErrorHandler = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    logger.warn('Validation error', {
      error: err.message,
      ip: req.ip,
      url: req.url
    });
    
    return res.status(400).json({
      success: false,
      message: 'Invalid request data'
    });
  }

  if (err.name === 'CastError') {
    logger.warn('Cast error', {
      error: err.message,
      ip: req.ip,
      url: req.url
    });
    
    return res.status(400).json({
      success: false,
      message: 'Invalid data format'
    });
  }

  if (err.name === 'MongoError' && err.code === 11000) {
    logger.warn('Duplicate key error', {
      error: err.message,
      ip: req.ip,
      url: req.url
    });
    
    return res.status(409).json({
      success: false,
      message: 'Resource already exists'
    });
  }

  // Log unexpected errors
  logger.error('Unexpected error', {
    error: err.message,
    stack: err.stack,
    ip: req.ip,
    url: req.url
  });

  next(err);
};
