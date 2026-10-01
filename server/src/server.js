import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import configurations
import connectDB from './config/database.js';
import { logger } from './config/logger.js';
import { startEscalationEmailJob } from './utils/escalationEmailJob.js';

// Import middleware
import { securityHeaders, mongoSanitization, xssProtection, requestSizeLimiter, requestLogger, securityErrorHandler } from './middleware/security.js';
import { generalLimiter } from './middleware/rateLimiter.js';

// Import routes
import apiRoutes from './routes/index.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

// Start background jobs
startEscalationEmailJob();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    // Cloud deployment: allowed frontend origin(s) now come from the
    // ALLOWED_ORIGINS env var (comma-separated), so redeploying the frontend
    // to a new URL never requires a backend code change.
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://cms-beta-three.vercel.app')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);

    if (isLocalhost || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // This is essential if you are sending cookies or authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// --- APPLY CORS BEFORE ROUTES ---

// 1. Apply CORS globally to all incoming requests
app.use(cors(corsOptions));

// 2. Explicitly handle pre-flight OPTIONS requests across all routes
app.options('*', cors(corsOptions));

// Security middleware
app.use(securityHeaders);
app.use(mongoSanitization);
app.use(xssProtection);
app.use(requestSizeLimiter);

// Compression middleware

app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Custom request logging
app.use(requestLogger);

// Rate limiting
// app.use(generalLimiter);

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CMS Backend API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/api/health'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/docs',
      'POST /api/auth/register',
      'POST /api/auth/login'
    ]
  });
});

// Global error handler
app.use(securityErrorHandler);

// Unhandled promise rejection handler
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 CMS Backend Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 API Documentation: http://localhost:${PORT}/api/docs`);
  logger.info(`❤️  Health Check: http://localhost:${PORT}/api/health`);
});

export default app;
