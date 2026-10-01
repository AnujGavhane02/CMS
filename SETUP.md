# CMS - Complaint Management System Setup Guide

This guide will help you set up and run the complete Complaint Management System with both frontend and backend.

## 🏗️ Architecture Overview

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + MongoDB + JWT Authentication
- **Database**: MongoDB with Mongoose ODM
- **File Storage**: Local file system (configurable for cloud storage)

## 📋 Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **Git** - [Download](https://git-scm.com/)

### Alternative: Using Docker for MongoDB

If you prefer using Docker:

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd CMS

# Install frontend dependencies
cd client
npm install

# Install backend dependencies
cd ../server
npm install
```

### 2. Environment Configuration

#### Backend Environment (.env)

```bash
cd server
cp env.example .env
```

Edit the `.env` file with your configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/cms_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here-make-it-long-and-random
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Email Configuration (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@institute.edu
FROM_NAME=CMS System

# CORS Configuration
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

#### Frontend Environment (.env)

```bash
cd client
```

Create a `.env` file in the client directory:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Database Setup

#### Start MongoDB

**Option A: Using MongoDB Service**
```bash
# Linux/macOS
sudo systemctl start mongod

# macOS with Homebrew
brew services start mongodb-community
```

**Option B: Using Docker**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### Seed Database (Optional)

```bash
cd server
npm run seed
```

This will create:
- 1 Master Admin (admin@institute.edu / Admin123!)
- 8 Sub-Admins (one for each department)
- 4 Sample Users
- 5 Sample Complaints

### 4. Start the Application

#### Terminal 1: Backend Server
```bash
cd server
npm start
```

The backend will start on `http://localhost:5000`

#### Terminal 2: Frontend Development Server
```bash
cd client
npm run dev
```

The frontend will start on `http://localhost:5173`

## 🔐 Default Login Credentials

After seeding the database, you can use these credentials:

### Master Admin
- **Email**: admin@institute.edu
- **Password**: Admin123!

### Sub-Admins (Department Heads)
- **Email**: {department}.admin@institute.edu
- **Password**: SubAdmin123!
- **Departments**: IT, Library, Hostel, Academics, Sports, Cafeteria, Transport, Maintenance

### Sample Users
- **Email**: john.doe@institute.edu
- **Password**: User123!

## 📱 Application Features

### For All Users
- **Authentication**: Secure login/logout with JWT tokens
- **Profile Management**: Update personal information
- **Complaint Creation**: File new complaints with attachments
- **Complaint Tracking**: View complaint status and history
- **Feedback System**: Rate and comment on resolved complaints

### For Sub-Admins
- **Department Management**: Manage complaints in assigned department
- **Status Updates**: Update complaint status with notes
- **Assignment**: Assign complaints to team members
- **Analytics**: View department-specific analytics

### For Master Admin
- **User Management**: Create, update, and manage all users
- **System Analytics**: Access comprehensive system reports
- **Department Performance**: Monitor all departments
- **System Settings**: Configure system-wide settings

## 🛠️ Development Commands

### Backend Commands
```bash
cd server

# Development with auto-reload
npm run dev

# Production start
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Seed database
npm run seed

# Clear database
npm run clear
```

### Frontend Commands
```bash
cd client

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📊 API Documentation

Once the backend is running, you can access:

- **API Documentation**: http://localhost:5000/api/docs
- **Health Check**: http://localhost:5000/api/health
- **API Base URL**: http://localhost:5000/api

## 🔧 Configuration Options

### Backend Configuration

#### Database Options
- **Local MongoDB**: `mongodb://localhost:27017/cms_db`
- **MongoDB Atlas**: `mongodb+srv://username:password@cluster.mongodb.net/cms_db`
- **Docker MongoDB**: `mongodb://localhost:27017/cms_db`

#### File Storage Options
- **Local Storage**: Files stored in `server/uploads/`
- **Cloud Storage**: Configure Cloudinary or AWS S3 in environment variables

#### Email Configuration
- **Gmail**: Use App Password for authentication
- **SMTP**: Configure any SMTP server
- **Disabled**: Set `SMTP_USER` to empty to disable email features

### Frontend Configuration

#### API Endpoints
- **Development**: `http://localhost:5000/api`
- **Production**: Update `VITE_API_URL` in `.env`

#### Build Options
- **Development**: `npm run dev`
- **Production**: `npm run build`

## 🚨 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Or using Docker
docker start mongodb
```

#### 2. Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

#### 3. Permission Denied
```bash
# Make scripts executable
chmod +x server/scripts/start.js
```

#### 4. Environment Variables Not Loading
- Ensure `.env` files are in the correct directories
- Restart the development servers
- Check for typos in environment variable names

### Logs and Debugging

#### Backend Logs
- **Console**: Real-time logs in terminal
- **File**: `server/logs/combined.log` and `server/logs/error.log`

#### Frontend Logs
- **Browser Console**: Open Developer Tools (F12)
- **Network Tab**: Check API requests and responses

## 📁 Project Structure

```
CMS/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # UI Components
│   │   ├── contexts/      # React Contexts
│   │   ├── lib/          # Utilities and API
│   │   ├── pages/        # Page Components
│   │   └── hooks/        # Custom Hooks
│   ├── public/           # Static Assets
│   └── package.json
├── server/               # Node.js Backend
│   ├── src/
│   │   ├── config/      # Configuration
│   │   ├── controllers/ # Route Controllers
│   │   ├── middleware/  # Custom Middleware
│   │   ├── models/      # Database Models
│   │   ├── routes/      # API Routes
│   │   ├── utils/       # Utility Functions
│   │   └── server.js    # Main Server File
│   ├── uploads/          # File Uploads
│   ├── exports/         # Generated Reports
│   ├── logs/            # Application Logs
│   └── package.json
└── SETUP.md             # This file
```

## 🔒 Security Considerations

### Production Deployment

1. **Environment Variables**
   - Use strong, unique JWT secrets
   - Configure secure MongoDB connection
   - Set up proper CORS origins

2. **Database Security**
   - Enable MongoDB authentication
   - Use SSL/TLS connections
   - Regular backups

3. **File Upload Security**
   - Validate file types and sizes
   - Scan for malware
   - Store files securely

4. **API Security**
   - Rate limiting enabled
   - Input validation
   - XSS protection
   - SQL injection prevention

## 📞 Support

If you encounter issues:

1. Check the logs for error messages
2. Verify all environment variables are set correctly
3. Ensure MongoDB is running and accessible
4. Check that all required ports are available
5. Review the API documentation at `/api/docs`

## 🎯 Next Steps

After successful setup:

1. **Customize**: Update branding, colors, and content
2. **Configure**: Set up email notifications and file storage
3. **Deploy**: Deploy to production environment
4. **Monitor**: Set up logging and monitoring
5. **Scale**: Configure for high availability

## 📄 License

This project is licensed under the MIT License.
