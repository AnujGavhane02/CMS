# CMS Backend - Complaint Management System

A scalable, secure, and modular backend architecture for a Complaint Management System tailored for educational institutes.

## 🚀 Features

### Core Functionality
- **User Management**: Role-based access control with Master Admin, Sub-Admin, and User roles
- **Complaint Management**: Full CRUD operations with status tracking and assignment
- **File Upload**: Secure file attachment system for complaints
- **Analytics**: Comprehensive dashboard with reporting and insights
- **Authentication**: JWT-based authentication with refresh tokens
- **Email Notifications**: Automated email system for status updates

### Security Features
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive request validation
- **XSS Protection**: Cross-site scripting prevention
- **MongoDB Injection Protection**: Database security
- **CORS Configuration**: Cross-origin resource sharing setup
- **Helmet Security**: Security headers middleware

### Analytics & Reporting
- **Dashboard Statistics**: Real-time complaint metrics
- **Category Analysis**: Department-wise complaint breakdown
- **Resolution Time Analysis**: Performance metrics
- **Satisfaction Analysis**: User feedback insights
- **Export Functionality**: PDF and Excel report generation

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer with local storage
- **Email**: Nodemailer
- **Logging**: Winston
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate Limiting
- **Testing**: Jest
- **Documentation**: Built-in API documentation

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/cms_db
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
   
   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   
   # CORS Configuration
   FRONTEND_URL=http://localhost:3000
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

4. **Start MongoDB**
   ```bash
   # Using MongoDB service
   sudo systemctl start mongod
   
   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### User Management (Master Admin)
- `GET /api/users` - Get all users
- `GET /api/users/stats` - Get user statistics
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/department/:department` - Get users by department

### Complaint Management
- `POST /api/complaints` - Create new complaint
- `GET /api/complaints` - Get all complaints with filters
- `GET /api/complaints/:id` - Get complaint by ID
- `PUT /api/complaints/:id/status` - Update complaint status
- `PUT /api/complaints/:id/assign` - Assign complaint
- `POST /api/complaints/:id/note` - Add internal note
- `POST /api/complaints/:id/feedback` - Add feedback
- `GET /api/complaints/department/:department` - Get complaints by department
- `GET /api/complaints/user/:userId` - Get user complaints

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard statistics
- `GET /api/analytics/category` - Get complaints by category
- `GET /api/analytics/urgency` - Get complaints by urgency
- `GET /api/analytics/trends/monthly` - Get monthly trends
- `GET /api/analytics/resolution-time` - Get resolution time analysis
- `GET /api/analytics/satisfaction` - Get satisfaction analysis
- `GET /api/analytics/department-performance` - Get department performance

### File Management
- `POST /api/files/upload` - Upload files for complaint
- `GET /api/files/info/:filename` - Get file information
- `GET /api/files/download/:filename` - Download file
- `DELETE /api/files/:filename` - Delete file (Admin only)
- `GET /api/files/stats` - Get storage statistics (Admin only)

## 🔐 Authentication

The API uses JWT-based authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

### User Roles

1. **Master Admin**
   - Full system access
   - User management
   - All analytics
   - System settings

2. **Sub-Admin**
   - Department-specific access
   - Complaint management for assigned department
   - Department analytics

3. **User**
   - Create complaints
   - View own complaints
   - Submit feedback

## 📊 Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: ['master_admin', 'sub_admin', 'user'],
  department: String (for sub_admin),
  isActive: Boolean,
  lastLogin: Date,
  refreshTokens: Array,
  profile: Object
}
```

### Complaint Model
```javascript
{
  title: String,
  description: String,
  category: String,
  urgency: ['low', 'medium', 'high'],
  status: ['pending', 'processing', 'resolved', 'rejected'],
  isAnonymous: Boolean,
  userId: ObjectId,
  userName: String,
  userEmail: String,
  assignedTo: ObjectId,
  attachments: Array,
  statusHistory: Array,
  feedback: Object,
  resolvedAt: Date
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📁 Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   └── logger.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── complaintController.js
│   │   ├── analyticsController.js
│   │   └── fileController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   ├── rateLimiter.js
│   │   ├── security.js
│   │   └── upload.js
│   ├── models/
│   │   ├── User.js
│   │   └── Complaint.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── complaints.js
│   │   ├── analytics.js
│   │   ├── files.js
│   │   └── index.js
│   ├── utils/
│   │   ├── email.js
│   │   ├── sentiment.js
│   │   ├── seed.js
│   │   └── export.js
│   └── server.js
├── uploads/
├── exports/
├── logs/
├── package.json
├── env.example
└── README.md
```

## 🚀 Deployment

### Environment Variables
Ensure all required environment variables are set in production:

```env
NODE_ENV=production
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-production-secret
SMTP_HOST=your-smtp-host
# ... other variables
```

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure production MongoDB
- [ ] Set secure JWT secrets
- [ ] Configure email settings
- [ ] Set up file storage (consider cloud storage)
- [ ] Configure CORS for production domains
- [ ] Set up monitoring and logging
- [ ] Configure reverse proxy (nginx)
- [ ] Set up SSL certificates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation at `/api/docs`

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Added analytics and reporting
- **v1.2.0** - Enhanced security features
- **v1.3.0** - File upload and export functionality
