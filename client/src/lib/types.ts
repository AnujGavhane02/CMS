export type UserRole = "master_admin" | "sub_admin" | "user";

export type ComplaintStatus = "pending" | "processing" | "resolved" | "rejected";

export type UrgencyLevel = "low" | "medium" | "high";

export type Department = 
  | "IT"
  | "Library"
  | "Hostel"
  | "Academics"
  | "Sports"
  | "Cafeteria"
  | "Transport"
  | "Maintenance";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: Department;
  createdAt: Date;
}

export interface Complaint {
  id: string;
  complaintId?: string;
  title: string;
  description: string;
  category?: string; // Category within the department (e.g. "Network", "Software")
  department?: string | { name: string; description?: string }; // Support both ObjectId and populated object
  /** Priority 1-10 (1-3 low, 4-6 medium, 7-10 high). Set from words in title/description. */
  priority?: number;
  urgency: UrgencyLevel;
  status: ComplaintStatus;
  isAnonymous: boolean;
  userId: string;
  userName: string;
  userEmail: string;
  assignedTo?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  feedback?: Feedback;
  statusHistory: StatusHistoryItem[];
}

export interface StatusHistoryItem {
  status: ComplaintStatus;
  timestamp: Date;
  updatedBy?: string;
  notes?: string;
}

export interface Feedback {
  rating: number;
  comment: string;
  sentiment: "positive" | "neutral" | "negative";
  createdAt: Date;
}

export interface DashboardStats {
  totalComplaints: number;
  pending: number;
  processing: number;
  resolved: number;
  rejected: number;
  avgResolutionTime: number;
  satisfactionRate: number;
  totalFeedback: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}
