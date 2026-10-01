#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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


// Create necessary directories
const dirs = ['uploads', 'uploads/complaints', 'exports', 'logs'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logInfo(`Created directory: ${dir}`);
  }
});

logInfo('Starting CMS Backend Server in development mode...');
logWarning('Note: MongoDB connection will be checked when the server starts.');

// Start the server with nodemon
const server = spawn('npx', ['nodemon', 'src/server.js'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'development' }
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
