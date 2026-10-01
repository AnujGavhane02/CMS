# Complaint Management System (CMS)

A full-stack, production-ready web application for managing institutional complaints with intelligent duplicate detection, AI-powered sentiment analysis, and role-based access control.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture & Data Flow](#architecture--data-flow)
- [Features](#features)
- [User Roles](#user-roles)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Security](#security)

---

## Overview

The CMS is a complaint management platform designed for institutions (colleges, organizations). It allows users to file complaints, track their status, and receive resolution updates. Admins and department heads manage, prioritize, and resolve complaints — while the system automates duplicate detection, priority scoring, and sentiment analysis using NLP.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI Library | shadcn/ui + Radix UI + Tailwind CSS |
| State / Data | React Context + TanStack Query + Axios |
| Forms | react-hook-form + Zod |
| Charts | Recharts |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Authentication | JWT (access + refresh tokens) + bcryptjs |
| NLP / AI | natural, sentiment (AFINN), string-similarity |
| Chatbot | Google Gemini (gemini-3-flash) |
| File Upload | Multer |
| Export | PDFKit + ExcelJS (server) / jsPDF + xlsx (client) |
| Email | Nodemailer |
| Logging | Winston + Morgan |
| Security | Helmet, express-mongo-sanitize, xss, rate-limit |

---

## Architecture & Data Flow

### System Architecture (3-Tier)

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                          │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │              React SPA  (Vite + TypeScript)              │  │
│   │                                                          │  │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │  │
│   │  │  Auth    │  │Dashboard │  │Analytics │  │Chatbot │  │  │
│   │  │  Pages   │  │  Pages   │  │  Charts  │  │Widget  │  │  │
│   │  └──────────┘  └──────────┘  └──────────┘  └────────┘  │  │
│   │         │              │              │           │       │  │
│   │         └──────────────┴──────────────┴───────────┘       │  │
│   │                         Axios API Client                   │  │
│   └────────────────────────────┬─────────────────────────────┘  │
└────────────────────────────────┼────────────────────────────────┘
                     HTTPS/REST  │
┌────────────────────────────────▼────────────────────────────────┐
│                       EXPRESS.JS SERVER                         │
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                    Middleware Pipeline                    │  │
│   │   Helmet → CORS → Rate Limiter → Body Parser → Morgan    │  │
│   │   → Auth (JWT) → Sanitize/XSS → Validation → Controller  │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────┐ ┌─────────┐  │
│   │  Auth  │ │Complaint│ │Analytics │ │ Users  │ │  Dept   │  │
│   │ Router │ │ Router  │ │  Router  │ │ Router │ │ Router  │  │
│   └────┬───┘ └────┬────┘ └────┬─────┘ └───┬────┘ └────┬────┘  │
│        │          │            │            │           │        │
│   ┌────▼──────────▼────────────▼────────────▼───────────▼────┐  │
│   │                      Controllers                          │  │
│   │   Auth · Complaint · Analytics · User · Dept · Feedback  │  │
│   │   SubAdmin · File · Chat · Track · Reports               │  │
│   └──────────────────────────┬────────────────────────────────┘  │
│                              │                                   │
│   ┌──────────────────────────▼────────────────────────────────┐  │
│   │                    Utility Services                       │  │
│   │  ┌─────────────────┐  ┌──────────────────┐               │  │
│   │  │ complaintSimilar│  │ complaintPriority │               │  │
│   │  │ ity.js          │  │ .js               │               │  │
│   │  │ (Dice + Jaccard) │  │ (AFINN + keywords)│               │  │
│   │  └─────────────────┘  └──────────────────┘               │  │
│   │  ┌─────────────────┐  ┌──────────────────┐               │  │
│   │  │  sentiment.js   │  │    email.js       │               │  │
│   │  │ (keyword/emotion)│  │  (Nodemailer)    │               │  │
│   │  └─────────────────┘  └──────────────────┘               │  │
│   └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
         ┌─────────────────────┼────────────────────────┐
         │                     │                        │
┌────────▼────────┐  ┌─────────▼────────┐  ┌───────────▼────────┐
│    MongoDB      │  │  Local Filesystem │  │   Google Gemini    │
│   (Mongoose)    │  │  (Multer Uploads) │  │   (Chatbot API)    │
│                 │  │                  │  │                    │
│  Users          │  │  /uploads/       │  │  gemini-3-flash    │
│  Complaints     │  │  (PDF, images,   │  │  (AI responses)    │
│  Departments    │  │   docs max 10MB) │  │                    │
│  Feedbacks      │  │                  │  │                    │
└─────────────────┘  └──────────────────┘  └────────────────────┘
```

---

### Level 0 DFD — Context Diagram

```
                  ┌──────────────────────────────┐
  File/Track      │                              │   Notifications
  Complaints ────►│                              │──────────────────► User
                  │                              │
  View Status ───►│    COMPLAINT MANAGEMENT      │   Status Updates
  Give Feedback ─►│         SYSTEM               │──────────────────► Admin / Sub-Admin
                  │                              │
  Manage Users ──►│                              │   Reports / Analytics
  Manage Depts ──►│                              │──────────────────► Master Admin
                  │                              │
  AI Queries ────►│                              │──────────────────► Gemini API
                  └──────────────────────────────┘
```

---

### Level 1 DFD — Main Processes

```
┌──────────┐        ┌─────────────────────────────────────────────────────────┐
│          │        │                                                         │
│          │─ 1.0 ─►│  AUTHENTICATION                                         │
│          │ Login  │  (Register / Login / Refresh Token / Logout)            │
│          │◄───────│                     │                                   │
│          │  JWT   │                     │ User Session                      │
│          │        │                     ▼                                   │
│  USER /  │        │  ┌──────────────────────────────────────────────────┐   │
│ ADMIN /  │─ 2.0 ─►│  │ COMPLAINT PROCESSING                             │   │
│  SUB-    │ Submit │  │                                                  │   │
│  ADMIN   │        │  │  ① Receive complaint data                        │   │
│          │        │  │       ↓                                          │   │
│          │        │  │  ② Check Duplicate  ─── string-similarity ──►   │   │
│          │        │  │       │               NLP (Jaccard) + Dice       │   │
│          │        │  │       ↓ (unique)                                 │   │
│          │        │  │  ③ Calculate Priority ── sentiment + keywords ─► │   │
│          │        │  │       ↓                                          │   │
│          │        │  │  ④ Save Complaint  ──────────────────────► MongoDB│  │
│          │        │  │       ↓                                          │   │
│          │        │  │  ⑤ Email Notification ──────────────────► SMTP  │   │
│          │        │  └──────────────────────────────────────────────────┘   │
│          │        │                                                         │
│          │─ 3.0 ─►│  COMPLAINT MANAGEMENT (Admin)                          │
│          │ Update │  Update Status → Add Notes → Assign Staff              │
│          │        │  ↓ Each status change → Email → Feedback Request        │
│          │        │                                                         │
│          │─ 4.0 ─►│  ANALYTICS & REPORTING                                 │
│          │ Query  │  Aggregation Pipelines → Charts / PDF / Excel          │
│          │        │                                                         │
│          │─ 5.0 ─►│  FEEDBACK & SENTIMENT                                  │
│          │ Rate   │  Rating + Comment → Sentiment Score → DB               │
│          │        │                                                         │
│          │─ 6.0 ─►│  CHATBOT                                               │
│          │ Chat   │  User Message → Gemini API → Contextual Reply          │
│          │        │                                                         │
└──────────┘        └─────────────────────────────────────────────────────────┘
```

---

### Level 2 DFD — Complaint Submission Flow

```
User                  Frontend                  Backend                    DB
 │                       │                         │                       │
 │── Fill Form ─────────►│                         │                       │
 │                       │── POST /api/complaints ►│                       │
 │                       │                         │── Validate Input      │
 │                       │                         │── Fetch last 100     ►│
 │                       │                         │◄─ Open complaints ────│
 │                       │                         │                       │
 │                       │                         │── Dice Coefficient    │
 │                       │                         │   + Jaccard NLP       │
 │                       │                         │                       │
 │                       │         [Duplicate?]    │                       │
 │                       │◄── 409 Existing ────────│                       │
 │◄── Show Existing ─────│  complaint info         │── Escalate Priority  ►│
 │                       │                         │── Add internal note  ►│
 │                       │                         │                       │
 │                       │         [Unique]         │                       │
 │                       │                         │── AFINN Sentiment     │
 │                       │                         │── Keyword Analysis    │
 │                       │                         │── Score 1–10 Priority │
 │                       │                         │── Save Complaint ────►│
 │                       │                         │── Save Attachments   ►│
 │                       │                         │── Send Email ────────►│ (SMTP)
 │                       │◄─── 201 Success ────────│                       │
 │◄── Complaint ID ──────│                         │                       │
```

---

### Level 2 DFD — Authentication Flow

```
Client                          Server                          MongoDB
  │                                │                               │
  │── POST /auth/login ───────────►│                               │
  │   { email, password }          │── Find user by email ────────►│
  │                                │◄─ User document ──────────────│
  │                                │── bcrypt.compare()            │
  │                                │── Generate Access Token (24h) │
  │                                │── Generate Refresh Token (7d) │
  │                                │── Store refresh token ───────►│
  │◄── { accessToken, refreshToken,│                               │
  │      user } ──────────────────│                               │
  │                                │                               │
  │── Subsequent API Requests ────►│                               │
  │   Authorization: Bearer <JWT>  │── Verify JWT signature        │
  │                                │── Check user exists & active ►│
  │                                │◄─ User status ────────────────│
  │◄── Protected Resource ────────│                               │
  │                                │                               │
  │── POST /auth/refresh-token ───►│                               │
  │   { refreshToken }             │── Verify refresh token ──────►│
  │                                │◄─ Token found ────────────────│
  │                                │── Issue new access token      │
  │◄── { accessToken } ───────────│                               │
```

---

### Role-Based Access Control Flow

```
                    ┌─────────────────────────────────┐
  HTTP Request ────►│     JWT Middleware (auth.js)     │
                    │  Verify token → Attach req.user  │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │   authorize(...roles) Middleware │
                    │   Check req.user.role            │
                    └──────────────┬──────────────────┘
                                   │
            ┌──────────────────────┼─────────────────────────┐
            │                      │                         │
            ▼                      ▼                         ▼
    ┌───────────────┐    ┌──────────────────┐    ┌────────────────────┐
    │  master_admin │    │    sub_admin      │    │       user         │
    │               │    │                  │    │                    │
    │  All routes   │    │  Department-     │    │  Own complaints    │
    │  All data     │    │  scoped data     │    │  Own feedback      │
    │  All actions  │    │  Status updates  │    │  Track by ID       │
    │               │    │  Dept analytics  │    │  Chatbot access    │
    └───────────────┘    └──────────────────┘    └────────────────────┘
```

---

## Features

### Core
- **File Complaint** — Submit complaints with title, description, category, urgency, and file attachments
- **Track Complaint** — Public endpoint to track any complaint by ID without login
- **Status Lifecycle** — `pending → processing → resolved / rejected` with history log
- **File Attachments** — Upload PDFs, images, and Word documents (up to 5 files, 10 MB each)

### Intelligent Processing
- **Duplicate Detection** — Checks new complaints against last 100 open complaints using Dice coefficient + NLP Jaccard similarity (threshold: 60%). Escalates priority on match instead of creating duplicate.
- **Auto Priority Scoring** — Multi-factor analysis on complaint text: AFINN sentiment score, urgency keywords (`urgent`, `critical`, `broken`), exclamation frequency, and text length. Outputs 1–10 priority score.
- **Sentiment Analysis** — Classifies complaint and feedback text into emotion categories (frustration, satisfaction, concern) and extracts top keywords.

### Administration
- **Master Admin** — Full system control: manage users, departments, sub-admins, view all complaints and system-wide analytics
- **Sub-Admin (Department Head)** — Manage complaints within their department: update status, add internal notes, assign staff, generate department reports
- **User Verification Queue** — Master admin must approve new user registrations before access is granted

### Analytics & Reporting
- Dashboard KPIs (total, pending, processing, resolved, rejected)
- Category and urgency breakdowns
- Monthly complaint trends
- Resolution time analysis
- Satisfaction ratings and sentiment trends
- Department performance comparison
- Export to PDF and Excel

### Communication
- **Email Notifications** — Automated emails for complaint creation, status updates, and feedback requests via Nodemailer
- **AI Chatbot** — Google Gemini-powered assistant embedded in the dashboard to answer CMS-related queries

---

## User Roles

| Role | Access |
|---|---|
| `master_admin` | Full system: all complaints, all departments, user management, system analytics |
| `sub_admin` | Department-scoped: complaints in their department, status updates, department analytics |
| `user` | Own complaints only: file, track, view status, submit feedback |

Default seed credentials:

| Role | Email | Password |
|---|---|---|
| Master Admin | admin@institute.edu | Admin123! |
| Sub-Admin (IT) | it.admin@institute.edu | Admin123! |
| User | john.doe@institute.edu | User123! |

---

## Database Schema

### Users
```
{
  name, email, password (bcrypt),
  role: [master_admin | sub_admin | user],
  department, isActive, lastLogin,
  refreshTokens: [{ token, createdAt }],
  profile: { phone, studentId, employeeId, avatar }
}
```

### Complaints
```
{
  title, description, department, category,
  urgency: [low | medium | high],
  status: [pending | processing | resolved | rejected],
  priority: Number (1–10),
  userId, userName, userEmail,
  assignedTo: ObjectId(User),
  attachments: [{ filename, originalName, mimeType, size, path }],
  statusHistory: [{ status, changedBy, changedAt, note }],
  internalNotes: [{ note, addedBy, addedAt }],
  tags: [String],
  isAnonymous: Boolean,
  resolvedAt: Date
}
```

### Departments
```
{
  name, description,
  categories: [String],
  isActive, createdBy,
  subAdmins: [ObjectId(User)],
  stats: { totalComplaints, resolved, pending, avgResolutionTime }
}
```

### Feedbacks
```
{
  complaint: ObjectId, department: String,
  user: ObjectId, rating: (1–5),
  note: String,
  sentiment: { score, category, confidence },
  isVisible: Boolean
}
```

---

## API Reference

### Authentication — `/api/auth`
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/register` | Register new user | Public |
| POST | `/login` | Login | Public |
| POST | `/refresh-token` | Refresh access token | Public |
| POST | `/logout` | Logout | User |
| GET | `/profile` | Get own profile | User |
| PUT | `/profile` | Update profile | User |
| PUT | `/change-password` | Change password | User |

### Complaints — `/api/complaints`
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/` | File new complaint (duplicate check + priority) | User |
| GET | `/` | List complaints (paginated, filtered) | Admin |
| GET | `/:id` | Get complaint detail | User/Admin |
| PUT | `/:id/status` | Update status | Admin |
| PUT | `/:id/assign` | Assign to staff | Admin |
| POST | `/:id/note` | Add internal note | Admin |
| POST | `/:id/feedback` | Submit feedback | User |
| GET | `/department/:dept` | Complaints by department | Sub-Admin |
| GET | `/user/:userId` | User's complaints | User/Admin |

### Analytics — `/api/analytics`
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/dashboard` | Dashboard KPIs | Admin |
| GET | `/category` | Category breakdown | Admin |
| GET | `/urgency` | Urgency breakdown | Admin |
| GET | `/trends/monthly` | Monthly trends | Admin |
| GET | `/resolution-time` | Resolution time stats | Admin |
| GET | `/satisfaction` | Satisfaction analysis | Admin |
| GET | `/sentiment` | Sentiment trends | Admin |
| GET | `/department-performance` | Per-department metrics | Master Admin |

### Users — `/api/users`
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/` | List all users | Master Admin |
| POST | `/` | Create user | Master Admin |
| GET | `/:id` | Get user | Master Admin |
| PUT | `/:id` | Update user | Master Admin |
| DELETE | `/:id` | Delete user | Master Admin |
| PATCH | `/verify/:userId` | Verify user account | Master Admin |

### Departments — `/api/departments`
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/` | List departments | Public |
| POST | `/` | Create department | Master Admin |
| PUT | `/:id` | Update department | Master Admin |
| DELETE | `/:id` | Delete department | Master Admin |
| POST | `/:id/sub-admins` | Add sub-admin | Master Admin |

### Other
| Route | Description |
|---|---|
| `POST /api/chat` | AI chatbot (Gemini) |
| `GET /api/track/:complaintId` | Public complaint tracking |
| `POST /api/files/upload` | Upload files |
| `GET /api/files/download/:filename` | Download file |
| `POST /api/feedbacks` | Submit feedback |

---

## Project Structure

```
cms/
├── client/                         # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/          # Role-specific dashboard views
│   │   │   │   ├── AllComplaints.tsx
│   │   │   │   ├── DepartmentComplaints.tsx
│   │   │   │   ├── MyComplaints.tsx
│   │   │   │   ├── FileComplaint.tsx
│   │   │   │   ├── Analytics.tsx
│   │   │   │   ├── Reports.tsx
│   │   │   │   ├── Departments.tsx
│   │   │   │   ├── SubAdmins.tsx
│   │   │   │   └── Settings.tsx
│   │   │   ├── shared/             # Reusable components
│   │   │   │   ├── ComplaintCard.tsx
│   │   │   │   ├── ComplaintDetailsDialog.tsx
│   │   │   │   ├── FeedbackModal.tsx
│   │   │   │   ├── Chatbot.tsx
│   │   │   │   └── StatusProgress.tsx
│   │   │   └── ui/                 # shadcn/ui component library
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx     # Global auth state
│   │   ├── lib/
│   │   │   ├── api.ts              # Axios API client
│   │   │   └── dataService.ts      # Data fetching helpers
│   │   └── pages/
│   │       ├── Index.tsx           # Landing page
│   │       ├── Auth.tsx            # Login / Register
│   │       ├── Dashboard.tsx       # Role-based dashboard
│   │       └── TrackComplaint.tsx  # Public tracking
│   └── vite.config.ts
│
└── server/                         # Express backend
    └── src/
        ├── config/
        │   ├── database.js         # MongoDB connection
        │   └── logger.js           # Winston configuration
        ├── controllers/            # Route handlers
        │   ├── authController.js
        │   ├── complaintController.js
        │   ├── analyticsController.js
        │   ├── userController.js
        │   ├── departmentController.js
        │   ├── subAdminController.js
        │   ├── feedbackController.js
        │   ├── chatController.js
        │   ├── fileController.js
        │   └── trackComplaintController.js
        ├── middleware/
        │   ├── auth.js             # JWT verification + RBAC
        │   ├── security.js         # Helmet, sanitize, XSS
        │   ├── validation.js       # Input validation rules
        │   ├── upload.js           # Multer file handler
        │   └── rateLimiter.js      # Rate limiting
        ├── models/
        │   ├── User.js
        │   ├── Complaint.js
        │   ├── Department.js
        │   └── Feedback.js
        ├── routes/
        │   ├── auth.js
        │   ├── complaints.js
        │   ├── analytics.js
        │   ├── users.js
        │   ├── departments.js
        │   ├── subAdmins.js
        │   ├── feedbacks.js
        │   ├── files.js
        │   ├── chat.js
        │   └── track.js
        └── utils/
            ├── complaintSimilarity.js   # Duplicate detection
            ├── complaintPriority.js     # Auto priority scoring
            ├── sentiment.js             # NLP sentiment analysis
            ├── email.js                 # Email templates
            ├── export.js                # PDF/Excel generation
            └── seed.js                  # DB seed data
```

---

## Setup & Installation

### Prerequisites
- Node.js >= 18
- MongoDB >= 4.4 (local or Atlas)
- Google Gemini API key (for chatbot)

### 1. Clone & Install

```bash
git clone <repo-url>
cd cms

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### 2. Configure Environment

```bash
# Backend
cp server/env.example server/.env
# Edit server/.env with your values

# Frontend
echo "VITE_API_URL=http://localhost:5000/api" > client/.env
```

### 3. Seed the Database

```bash
cd server
npm run seed
```

### 4. Start Development Servers

```bash
# Terminal 1 — Backend (port 5000)
cd server && npm run dev

# Terminal 2 — Frontend (port 5173)
cd client && npm run dev
```

Visit: `http://localhost:5173`

---

## Environment Variables

### Backend (`server/.env`)

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/cms_db` |
| `JWT_SECRET` | Access token secret (long random string) | |
| `JWT_REFRESH_SECRET` | Refresh token secret | |
| `JWT_EXPIRE` | Access token TTL | `24h` |
| `JWT_REFRESH_EXPIRE` | Refresh token TTL | `7d` |
| `SMTP_HOST` | Email server | `smtp.gmail.com` |
| `SMTP_PORT` | Email port | `587` |
| `SMTP_USER` | Email address | |
| `SMTP_PASS` | Email app password | |
| `FROM_EMAIL` | Sender address | `noreply@institute.edu` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `ALLOWED_ORIGINS` | CORS whitelist | `http://localhost:5173` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `10485760` |
| `GEMINI_API_KEY` | Google Gemini API key | |
| `BCRYPT_ROUNDS` | Password hash rounds | `12` |
| `LOG_LEVEL` | Winston log level | `info` |

### Frontend (`client/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000/api` |

---

## Security

| Measure | Implementation |
|---|---|
| Password hashing | bcryptjs (12 rounds) |
| Authentication | JWT with 24h expiry + refresh tokens (7d) |
| Authorization | Role-based middleware on every protected route |
| Security headers | Helmet (CSP, HSTS, X-Frame-Options, etc.) |
| NoSQL injection | express-mongo-sanitize |
| XSS prevention | xss library on all user inputs |
| Rate limiting | Separate limiters for auth, complaint creation, and general API |
| CORS | Whitelist-only origin validation |
| Request size | 10 MB max body limit |
| File validation | MIME type + extension check before storage |

---

## Logs

Logs are written to `server/logs/`:
- `error.log` — errors only (5 MB max, 5 rotating files)
- `combined.log` — all log levels (5 MB max, 5 rotating files)
- Console output is enabled in `development` mode only
