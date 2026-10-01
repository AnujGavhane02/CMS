import { apiClient, ComplaintResponse, DashboardStats } from './api';
import { Complaint, DashboardStats as LocalDashboardStats } from './types';

// Derive urgency label from priority number: 1-3=low, 4-6=medium, 7-10=high
const priorityToUrgency = (priority: number | undefined): 'low' | 'medium' | 'high' => {
  if (priority == null || typeof priority !== 'number') return 'medium';
  if (priority <= 3) return 'low';
  if (priority <= 6) return 'medium';
  return 'high';
};

// Convert API complaint to local complaint type
export const convertApiComplaint = (apiComplaint: any): Complaint => {
  // Extract real user information from userId object if available
  const realUserName = apiComplaint.userId?.name || apiComplaint.userName;
  const realUserEmail = apiComplaint.userId?.email || apiComplaint.userEmail;
  // Urgency: use API value, or derive from priority (1-3=low, 4-6=medium, 7-10=high)
  const urgency = apiComplaint.urgency || priorityToUrgency(apiComplaint.priority) || 'medium';

  return {
    id: apiComplaint.id || apiComplaint._id,
    complaintId: apiComplaint.complaintId || `CMP-${String(apiComplaint.id || apiComplaint._id).slice(-6).toUpperCase()}`,
    title: apiComplaint.title,
    description: apiComplaint.description,
    category: apiComplaint.category,
    department: apiComplaint.department,
    priority: apiComplaint.priority,
    urgency: urgency as any,
    status: apiComplaint.status as any,
    isAnonymous: apiComplaint.isAnonymous,
    userId: apiComplaint.userId,
    userName: realUserName, // Use real user name from userId object
    userEmail: realUserEmail, // Use real user email from userId object
    assignedTo: apiComplaint.assignedTo,
    attachments: apiComplaint.attachments || [],
    createdAt: new Date(apiComplaint.createdAt),
    updatedAt: new Date(apiComplaint.updatedAt),
    resolvedAt: apiComplaint.resolvedAt ? new Date(apiComplaint.resolvedAt) : undefined,
    feedback: apiComplaint.feedback ? {
      rating: apiComplaint.feedback.rating,
      comment: apiComplaint.feedback.comment,
      sentiment: apiComplaint.feedback.sentiment as any,
      createdAt: new Date(apiComplaint.feedback.createdAt)
    } : undefined,
    statusHistory: (apiComplaint.statusHistory || []).map(item => ({
      status: item.status as any,
      timestamp: new Date(item.timestamp),
      updatedBy: item.updatedBy,
      notes: item.notes
    }))
  };
};

// Convert API dashboard stats to local stats type
export const convertApiDashboardStats = (apiStats: DashboardStats): LocalDashboardStats => {
  return {
    totalComplaints: apiStats.totalComplaints,
    pending: apiStats.pending,
    processing: apiStats.processing,
    resolved: apiStats.resolved,
    rejected: apiStats.rejected,
    avgResolutionTime: apiStats.avgResolutionTime,
    satisfactionRate: apiStats.satisfactionRate,
    totalFeedback: apiStats.totalFeedback
  };
};

// Data service class
export class DataService {
  // Complaints
  static async getComplaints(params: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    urgency?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ complaints: Complaint[]; pagination: any }> {
    try {
      const response = await apiClient.getComplaints(params);
      return {
        complaints: response.data.map(convertApiComplaint),
        pagination: response.pagination
      };
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
      throw error;
    }
  }

  static async getComplaintById(id: string): Promise<Complaint> {
    try {
      const response = await apiClient.getComplaintById(id);
      // Handle nested response structure - the complaint is directly in response.complaint
      const complaintData = (response as any).complaint || response;
      return convertApiComplaint(complaintData);
    } catch (error) {
      console.error('Failed to fetch complaint:', error);
      throw error;
    }
  }

  static async createComplaint(complaint: {
    title: string;
    description: string;
    category: string;
    urgency?: 'low' | 'medium' | 'high';
    isAnonymous?: boolean;
  }): Promise<Complaint> {
    try {
      const response = await apiClient.createComplaint(complaint);
      return convertApiComplaint(response);
    } catch (error) {
      console.error('Failed to create complaint:', error);
      throw error;
    }
  }

  static async updateComplaintStatus(id: string, status: string, notes?: string): Promise<Complaint> {
    try {
      const response = await apiClient.updateComplaintStatus(id, status, notes);
      return convertApiComplaint(response);
    } catch (error) {
      console.error('Failed to update complaint status:', error);
      throw error;
    }
  }

  static async assignComplaint(id: string, assignedTo: string): Promise<Complaint> {
    try {
      const response = await apiClient.assignComplaint(id, assignedTo);
      return convertApiComplaint(response);
    } catch (error) {
      console.error('Failed to assign complaint:', error);
      throw error;
    }
  }

  static async addComplaintNote(id: string, note: string, isVisibleToUser = false): Promise<Complaint> {
    try {
      const response = await apiClient.addComplaintNote(id, note, isVisibleToUser);
      return convertApiComplaint(response);
    } catch (error) {
      console.error('Failed to add complaint note:', error);
      throw error;
    }
  }

  static async addComplaintFeedback(id: string, rating: number, comment: string, sentiment?: string): Promise<Complaint> {
    try {
      const response = await apiClient.addComplaintFeedback(id, rating, comment, sentiment);
      return convertApiComplaint(response);
    } catch (error) {
      console.error('Failed to add complaint feedback:', error);
      throw error;
    }
  }

  static async getComplaintsByDepartment(department: string, params: any = {}): Promise<{ complaints: Complaint[]; pagination: any }> {
    try {
      const response = await apiClient.getComplaintsByDepartment(department, params);
      return {
        complaints: response.data.map(convertApiComplaint),
        pagination: response.pagination
      };
    } catch (error) {
      console.error('Failed to fetch department complaints:', error);
      throw error;
    }
  }

  static async getUserComplaints(userId?: string, params: any = {}): Promise<{ complaints: Complaint[]; pagination: any }> {
    try {
      const response = await apiClient.getUserComplaints(userId, params);
      return {
        complaints: response.data.map(convertApiComplaint),
        pagination: response.pagination
      };
    } catch (error) {
      console.error('Failed to fetch user complaints:', error);
      throw error;
    }
  }

  // Analytics
  static async getDashboardStats(): Promise<LocalDashboardStats> {
    try {
      const response = await apiClient.getDashboardStats();
      return convertApiDashboardStats(response);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      throw error;
    }
  }

  static async getComplaintsByCategory(): Promise<any[]> {
    try {
      return await apiClient.getComplaintsByCategory();
    } catch (error) {
      console.error('Failed to fetch category stats:', error);
      throw error;
    }
  }

  static async getComplaintsByUrgency(): Promise<any[]> {
    try {
      return await apiClient.getComplaintsByUrgency();
    } catch (error) {
      console.error('Failed to fetch urgency stats:', error);
      throw error;
    }
  }

  static async getMonthlyTrends(months = 12): Promise<any[]> {
    try {
      return await apiClient.getMonthlyTrends(months);
    } catch (error) {
      console.error('Failed to fetch monthly trends:', error);
      throw error;
    }
  }

  static async getResolutionTimeAnalysis(): Promise<any> {
    try {
      return await apiClient.getResolutionTimeAnalysis();
    } catch (error) {
      console.error('Failed to fetch resolution time analysis:', error);
      throw error;
    }
  }

  static async getSatisfactionAnalysis(): Promise<any> {
    try {
      return await apiClient.getSatisfactionAnalysis();
    } catch (error) {
      console.error('Failed to fetch satisfaction analysis:', error);
      throw error;
    }
  }

  static async getSentimentAnalysis(): Promise<any> {
    try {
      return await apiClient.getSentimentAnalysis();
    } catch (error) {
      console.error('Failed to fetch sentiment analysis:', error);
      throw error;
    }
  }

  static async getDepartmentPerformance(): Promise<any[]> {
    try {
      return await apiClient.getDepartmentPerformance();
    } catch (error) {
      console.error('Failed to fetch department performance:', error);
      throw error;
    }
  }

  // File upload
  static async uploadFiles(files: File[]): Promise<any[]> {
    try {
      return await apiClient.uploadFiles(files);
    } catch (error) {
      console.error('Failed to upload files:', error);
      throw error;
    }
  }

  // Health check
  static async checkApiHealth(): Promise<boolean> {
    try {
      return await apiClient.healthCheck();
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }

  // Users management
  static async getAllUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  } = {}): Promise<any> {
    try {
      return await apiClient.getAllUsers(params);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  }

  static async updateUser(id: string, userData: { isActive?: boolean; name?: string; email?: string; role?: string; department?: string }): Promise<any> {
    try {
      return await apiClient.updateUser(id, userData);
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }

  static async getAllFeedbacks(params: {
    page?: number;
    limit?: number;
    rating?: string;
    sentiment?: string;
  } = {}): Promise<any> {
    try {
      return await apiClient.getAllFeedbacks(params);
    } catch (error) {
      console.error('Failed to fetch feedbacks:', error);
      throw error;
    }
  }
}
