import { Complaint, User, Department, DashboardStats } from "./types";

// Mock Users
export const mockUsers: User[] = [
  {
    id: "1",
    email: "admin@institute.edu",
    name: "Master Admin",
    role: "master_admin",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "2",
    email: "it.admin@institute.edu",
    name: "IT Department Head",
    role: "sub_admin",
    department: "IT",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "3",
    email: "library.admin@institute.edu",
    name: "Library Manager",
    role: "sub_admin",
    department: "Library",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "4",
    email: "student@institute.edu",
    name: "John Doe",
    role: "user",
    createdAt: new Date("2024-01-15"),
  },
];

// Mock Complaints
export const mockComplaints: Complaint[] = [
  {
    id: "CMP-001",
    title: "Wi-Fi connectivity issues in Lecture Hall 3",
    description: "The Wi-Fi keeps disconnecting during online classes, affecting students' ability to attend lectures.",
    category: "IT",
    urgency: "high",
    status: "processing",
    isAnonymous: false,
    userId: "4",
    userName: "John Doe",
    userEmail: "student@institute.edu",
    assignedTo: "2",
    createdAt: new Date("2024-03-15T10:30:00"),
    updatedAt: new Date("2024-03-15T14:20:00"),
    statusHistory: [
      {
        status: "pending",
        timestamp: new Date("2024-03-15T10:30:00"),
      },
      {
        status: "processing",
        timestamp: new Date("2024-03-15T14:20:00"),
        updatedBy: "IT Department Head",
        notes: "Investigating the issue. Router logs being analyzed.",
      },
    ],
  },
  {
    id: "CMP-002",
    title: "Missing books in Computer Science section",
    description: "Several reference books for Data Structures course are missing from the library.",
    category: "Library",
    urgency: "medium",
    status: "resolved",
    isAnonymous: false,
    userId: "4",
    userName: "Sarah Smith",
    userEmail: "sarah@institute.edu",
    assignedTo: "3",
    createdAt: new Date("2024-03-10T09:15:00"),
    updatedAt: new Date("2024-03-12T16:45:00"),
    resolvedAt: new Date("2024-03-12T16:45:00"),
    statusHistory: [
      {
        status: "pending",
        timestamp: new Date("2024-03-10T09:15:00"),
      },
      {
        status: "processing",
        timestamp: new Date("2024-03-10T11:00:00"),
        updatedBy: "Library Manager",
      },
      {
        status: "resolved",
        timestamp: new Date("2024-03-12T16:45:00"),
        updatedBy: "Library Manager",
        notes: "New copies ordered and placed on shelf.",
      },
    ],
    feedback: {
      rating: 5,
      comment: "Quick resolution! Books are now available.",
      sentiment: "positive",
      createdAt: new Date("2024-03-13T10:00:00"),
    },
  },
  {
    id: "CMP-003",
    title: "Poor food quality in cafeteria",
    description: "The food served yesterday was undercooked and several students complained of stomach issues.",
    category: "Cafeteria",
    urgency: "high",
    status: "pending",
    isAnonymous: true,
    userId: "anonymous",
    userName: "Anonymous User",
    userEmail: "anonymous@system.local",
    createdAt: new Date("2024-03-16T08:00:00"),
    updatedAt: new Date("2024-03-16T08:00:00"),
    statusHistory: [
      {
        status: "pending",
        timestamp: new Date("2024-03-16T08:00:00"),
      },
    ],
  },
  {
    id: "CMP-004",
    title: "Broken air conditioning in Hostel Block B",
    description: "The AC unit has been malfunctioning for three days in rooms 201-210.",
    category: "Hostel",
    urgency: "high",
    status: "processing",
    isAnonymous: false,
    userId: "5",
    userName: "Mike Johnson",
    userEmail: "mike@institute.edu",
    createdAt: new Date("2024-03-14T20:00:00"),
    updatedAt: new Date("2024-03-15T09:00:00"),
    statusHistory: [
      {
        status: "pending",
        timestamp: new Date("2024-03-14T20:00:00"),
      },
      {
        status: "processing",
        timestamp: new Date("2024-03-15T09:00:00"),
        notes: "Technician assigned. Parts ordered.",
      },
    ],
  },
  {
    id: "CMP-005",
    title: "Late syllabus distribution for Semester 6",
    description: "Students haven't received the complete syllabus even after two weeks into the semester.",
    category: "Academics",
    urgency: "medium",
    status: "resolved",
    isAnonymous: false,
    userId: "6",
    userName: "Emma Wilson",
    userEmail: "emma@institute.edu",
    createdAt: new Date("2024-03-08T11:30:00"),
    updatedAt: new Date("2024-03-11T15:00:00"),
    resolvedAt: new Date("2024-03-11T15:00:00"),
    statusHistory: [
      {
        status: "pending",
        timestamp: new Date("2024-03-08T11:30:00"),
      },
      {
        status: "processing",
        timestamp: new Date("2024-03-09T10:00:00"),
      },
      {
        status: "resolved",
        timestamp: new Date("2024-03-11T15:00:00"),
        notes: "Syllabus distributed to all students.",
      },
    ],
    feedback: {
      rating: 4,
      comment: "Resolved but took longer than expected.",
      sentiment: "neutral",
      createdAt: new Date("2024-03-12T09:00:00"),
    },
  },
];

// Mock Dashboard Stats
export const mockDashboardStats: DashboardStats = {
  totalComplaints: 245,
  pending: 45,
  processing: 87,
  resolved: 113,
  avgResolutionTime: 2.8, // days
  satisfactionRate: 4.2, // out of 5
};

// Department list
export const departments: Department[] = [
  "IT",
  "Library",
  "Hostel",
  "Academics",
  "Sports",
  "Cafeteria",
  "Transport",
  "Maintenance",
];

// Chatbot responses
export const chatbotResponses: Record<string, string> = {
  "how to file": "To file a complaint:\n1. Log in to your account\n2. Click 'File Complaint' button\n3. Fill in the required details\n4. Select urgency level\n5. Submit the form\n\nYou'll receive a complaint ID to track your request.",
  
  "track status": "To track your complaint status:\n1. Go to 'Track Complaint' page\n2. Enter your Complaint ID (e.g., CMP-001)\n3. View real-time status updates\n\nOr check 'My Complaints' in your dashboard.",
  
  "contact": "Department Contacts:\n• IT: it.support@institute.edu\n• Library: library@institute.edu\n• Hostel: hostel.admin@institute.edu\n• Academics: academics@institute.edu\n\nGeneral Helpline: +91-XXX-XXX-XXXX",
  
  "anonymous": "Yes! You can file anonymous complaints. Just check the 'Submit Anonymously' option while filing.\n\nNote: Master Admin can view the original identity for security purposes.",
  
  "timeline": "Typical resolution timeline:\n• Low priority: 5-7 days\n• Medium priority: 3-5 days\n• High priority: 1-2 days\n\nUrgent issues are addressed immediately.",
  
  "default": "I'm here to help! You can ask me about:\n• How to file a complaint\n• Tracking complaint status\n• Department contacts\n• Anonymous complaints\n• Resolution timelines\n\nOr type your question!",
};
