#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const logSuccess = (message) => log(`✅ ${message}`, colors.green);
const logError = (message) => log(`❌ ${message}`, colors.red);
const logInfo = (message) => log(`ℹ️  ${message}`, colors.blue);
const logWarning = (message) => log(`⚠️  ${message}`, colors.yellow);

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  logError('.env file not found!');
  logInfo('Please copy env.example to .env and configure your environment variables.');
  process.exit(1);
}

// Check if MongoDB is running
const checkMongoDB = () => {
  return new Promise((resolve) => {
    // Try to connect using mongoose to check if MongoDB is accessible
    import('mongoose').then((mongoose) => {
      const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms_db';
      
      mongoose.default.connect(mongoURI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      }).then(() => {
        mongoose.default.connection.close();
        resolve(true);
      }).catch(() => {
        resolve(false);
      });
    }).catch(() => {
      resolve(false);
    });
  });
};

// Main startup function
const startServer = async () => {
  logInfo('Starting CMS Backend Server...');
  
  // Check MongoDB connection
  logInfo('Checking MongoDB connection...');
  const mongoRunning = await checkMongoDB();
  
  if (!mongoRunning) {
    logWarning('MongoDB is not running or not accessible.');
    logInfo('Please start MongoDB before running the server.');
    logInfo('On Windows: Start MongoDB service or run mongod.exe');
    logInfo('Or using Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest');
    process.exit(1);
  }
  
  logSuccess('MongoDB connection verified!');
  
  // Create necessary directories
  const dirs = ['uploads', 'uploads/complaints', 'exports', 'logs'];
  dirs.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logInfo(`Created directory: ${dir}`);
    }
  });
  
  // Start the server
  logInfo('Starting Node.js server...');
  
  const server = spawn('node', ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' }
  });
  
  server.on('close', (code) => {
    if (code !== 0) {
      logError(`Server exited with code ${code}`);
    } else {
      logSuccess('Server stopped gracefully');
    }
  });
  
  server.on('error', (error) => {
    logError(`Failed to start server: ${error.message}`);
    process.exit(1);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    logInfo('Shutting down server...');
    server.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    logInfo('Shutting down server...');
    server.kill('SIGTERM');
  });
};

// Run startup
startServer().catch((error) => {
  logError(`Startup failed: ${error.message}`);
  process.exit(1);
});
