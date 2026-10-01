// API Configuration - use '/api' in dev (proxied to backend) or VITE_API_URL in prod
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: string;
  department?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    isActive: boolean;
    createdAt: string;
  };
  accessToken: string;
  refreshToken: string;
}

// Complaint types
export interface ComplaintRequest {
  title: string;
  description: string;
  department: string;
  category?: string;
  urgency?: 'low' | 'medium' | 'high';
  isAnonymous?: boolean;
}

export interface ComplaintResponse {
  id: string;
  complaintId: string;
  title: string;
  description: string;
  department: string;
  category?: string;
  /** Priority 1-10; urgency label derived from it on backend */
  priority?: number;
  urgency: string;
  status: string;
  isAnonymous: boolean;
  userId: string;
  userName: string;
  userEmail: string;
  assignedTo?: string;
  attachments?: any[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  feedback?: {
    rating: number;
    comment: string;
    sentiment: string;
    createdAt: string;
  };
  statusHistory: Array<{
    status: string;
    timestamp: string;
    updatedBy?: string;
    notes?: string;
  }>;
}

export interface DuplicateComplaintResponse {
  isDuplicate: boolean;
  data: {
    existingComplaint: {
      id: string;
      complaintId: string;
      title: string;
      description: string;
      department: string;
      urgency: string;
      status: string;
      createdAt: string;
      priorityEscalated: boolean;
      newPriority?: string;
    };
    message: string;
  };
}

// Analytics types
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

// API Client Class
class ApiClient {
  private baseURL: string;
  private accessToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.accessToken = localStorage.getItem('accessToken');
  }

  // Set authentication token
  setToken(token: string) {
    this.accessToken = token;
    localStorage.setItem('accessToken', token);
  }

  // Clear authentication token
  clearToken() {
    this.accessToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // Get refresh token
  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  // Make HTTP request
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    console.log('Making API request to:', url);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();
      console.log('API response:', { status: response.status, data });

      if (!response.ok) {
        // Handle token expiration
        if (response.status === 401 && this.accessToken) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            // Retry the original request
            headers.Authorization = `Bearer ${this.accessToken}`;
            const retryResponse = await fetch(url, {
              ...options,
              headers,
            });
            return await retryResponse.json();
          }
        }

        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Refresh access token
  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setToken(data.data.accessToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    this.clearToken();
    return false;
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data) {
      this.setToken(response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }

    return response.data!;
  }

  async register(userData: RegisterRequest): Promise<void> {
    await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    // Registration no longer issues tokens — user must verify email first
  }

  async sendEmailVerificationOtp(email: string): Promise<void> {
    await this.request('/auth/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyEmailOtp(email: string, otp: string): Promise<void> {
    await this.request('/auth/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async forgotPassword(email: string): Promise<void> {
    await this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    await this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    });
  }

  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    }
    this.clearToken();
  }

  async getProfile(): Promise<AuthResponse['user']> {
    const response = await this.request<{ user: AuthResponse['user'] }>('/auth/profile');
    return response.data!.user;
  }

  async updateProfile(userData: Partial<RegisterRequest>): Promise<AuthResponse['user']> {
    const response = await this.request<{ user: AuthResponse['user'] }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return response.data!.user;
  }

  async changePassword(passwordData: { currentPassword: string; newPassword: string }): Promise<void> {
    await this.request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }

  // Complaint endpoints
  async createComplaint(complaint: ComplaintRequest): Promise<any> {
    const response = await this.request<any>('/complaints', {
      method: 'POST',
      body: JSON.stringify(complaint),
    });
    // Return the full response including isDuplicate flag at top level
    return {
      ...response,
      ...(response.data || {}),
      isDuplicate: (response as any).isDuplicate
    };
  }

  async getComplaints(params: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    department?: string;
    urgency?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PaginatedResponse<ComplaintResponse>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await this.request<PaginatedResponse<ComplaintResponse>>(
      `/complaints?${searchParams.toString()}`
    );
    console.log('getComplaints response:', response);
    return response.data!;
  }

  async getComplaintById(id: string): Promise<ComplaintResponse> {
    const response = await this.request<ComplaintResponse>(`/complaints/${id}`);
    return response.data!;
  }

  async updateComplaintStatus(id: string, status: string, notes?: string): Promise<ComplaintResponse> {
    const response = await this.request<ComplaintResponse>(`/complaints/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
    return response.data!;
  }

  async assignComplaint(id: string, assignedTo: string): Promise<ComplaintResponse> {
    const response = await this.request<ComplaintResponse>(`/complaints/${id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ assignedTo }),
    });
    return response.data!;
  }

  async updateComplaintDepartment(id: string, department: string): Promise<ComplaintResponse> {
    const response = await this.request<ComplaintResponse>(`/complaints/${id}/department`, {
      method: 'PUT',
      body: JSON.stringify({ department }),
    });
    return response.data!;
  }

  async addComplaintNote(id: string, note: string, isVisibleToUser = false): Promise<ComplaintResponse> {
    const response = await this.request<ComplaintResponse>(`/complaints/${id}/note`, {
      method: 'POST',
      body: JSON.stringify({ note, isVisibleToUser }),
    });
    return response.data!;
  }

  async addComplaintFeedback(id: string, rating: number, comment: string, sentiment?: string): Promise<ComplaintResponse> {
    const response = await this.request<ComplaintResponse>(`/complaints/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment, sentiment }),
    });
    return response.data!;
  }

  async getComplaintsByDepartment(department: string, params: any = {}): Promise<PaginatedResponse<ComplaintResponse>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await this.request<PaginatedResponse<ComplaintResponse>>(
      `/complaints/department/${department}?${searchParams.toString()}`
    );
    console.log('getComplaintsByDepartment response:', response);
    return response.data!;
  }

  async getUserComplaints(userId?: string, params: any = {}): Promise<PaginatedResponse<ComplaintResponse>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    // For regular users, don't pass userId - let the backend determine from token
    const endpoint = userId ? `/complaints/user/${userId}` : '/complaints/user';
    const response = await this.request<PaginatedResponse<ComplaintResponse>>(
      `${endpoint}?${searchParams.toString()}`
    );
    console.log('getUserComplaints response:', response);
    return response.data!;
  }

  // Analytics endpoints
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.request<DashboardStats>('/analytics/dashboard');
    return response.data!;
  }

  async getComplaintsByCategory(): Promise<any[]> {
    const response = await this.request<any[]>('/analytics/category');
    return response.data!;
  }

  async getComplaintsByUrgency(): Promise<any[]> {
    const response = await this.request<any[]>('/analytics/urgency');
    return response.data!;
  }

  async getMonthlyTrends(months = 12): Promise<any[]> {
    const response = await this.request<any[]>(`/analytics/trends/monthly?months=${months}`);
    return response.data!;
  }

  async getResolutionTimeAnalysis(): Promise<any> {
    const response = await this.request<any>('/analytics/resolution-time');
    return response.data!;
  }

  async getSatisfactionAnalysis(): Promise<any> {
    const response = await this.request<any>('/analytics/satisfaction');
    return response.data!;
  }

  async getSentimentAnalysis(): Promise<any> {
    const response = await this.request<any>('/analytics/sentiment');
    return response.data!;
  }

  async getDepartmentPerformance(): Promise<any[]> {
    const response = await this.request<any[]>('/analytics/department-performance');
    return response.data!;
  }

  // File upload
  async uploadFiles(files: File[]): Promise<any[]> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${this.baseURL}/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('File upload failed');
    }

    const data = await response.json();
    return data.data.files;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Department endpoints
  async getDepartments(params: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PaginatedResponse<any>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await this.request<PaginatedResponse<any>>(
      `/departments?${searchParams.toString()}`
    );
    return response.data!;
  }

  async getDepartmentById(id: string): Promise<any> {
    const response = await this.request<any>(`/departments/${id}`);
    return response.data!;
  }

  async createDepartment(department: { name: string; description: string; categories?: string[] }): Promise<any> {
    const response = await this.request<any>('/departments', {
      method: 'POST',
      body: JSON.stringify(department),
    });
    return response.data!;
  }

  async updateDepartment(id: string, department: { name?: string; description?: string; isActive?: boolean; categories?: string[] }): Promise<any> {
    const response = await this.request<any>(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(department),
    });
    return response.data!;
  }

  async deleteDepartment(id: string): Promise<void> {
    await this.request(`/departments/${id}`, {
      method: 'DELETE',
    });
  }

  async addSubAdminToDepartment(departmentId: string, userId: string): Promise<any> {
    const response = await this.request<any>(`/departments/${departmentId}/sub-admins`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    return response.data!;
  }

  async removeSubAdminFromDepartment(departmentId: string, userId: string): Promise<any> {
    const response = await this.request<any>(`/departments/${departmentId}/sub-admins`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });
    return response.data!;
  }

  async getDepartmentStats(id: string): Promise<any> {
    const response = await this.request<any>(`/departments/${id}/stats`);
    return response.data!;
  }

  async getAllDepartmentStats(): Promise<any> {
    const response = await this.request<any>('/departments/stats');
    return response.data!;
  }

  // Sub-Admin endpoints
  async getSubAdmins(params: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PaginatedResponse<any>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await this.request<PaginatedResponse<any>>(
      `/sub-admins?${searchParams.toString()}`
    );
    return response.data!;
  }

  async getSubAdminById(id: string): Promise<any> {
    const response = await this.request<any>(`/sub-admins/${id}`);
    return response.data!;
  }

  async createSubAdmin(subAdmin: { name: string; email: string; department: string }): Promise<any> {
    const response = await this.request<any>('/sub-admins', {
      method: 'POST',
      body: JSON.stringify(subAdmin),
    });
    return response.data!;
  }

  async updateSubAdmin(id: string, subAdmin: {
    name?: string;
    email?: string;
    department?: string;
    isActive?: boolean
  }): Promise<any> {
    const response = await this.request<any>(`/sub-admins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(subAdmin),
    });
    return response.data!;
  }

  async deleteSubAdmin(id: string): Promise<void> {
    await this.request(`/sub-admins/${id}`, {
      method: 'DELETE',
    });
  }

  async resetSubAdminPassword(id: string): Promise<any> {
    const response = await this.request<any>(`/sub-admins/${id}/reset-password`, {
      method: 'POST',
    });
    return response.data!;
  }

  async getAvailableDepartments(): Promise<any> {
    const response = await this.request<any>('/sub-admins/available-departments');
    return response.data!;
  }

  async getSubAdminStats(): Promise<any> {
    const response = await this.request<any>('/sub-admins/stats');
    return response.data!;
  }

  // Sub-Admin Reports endpoints
  async getSubAdminReports(subAdminId: string, period: string = 'month'): Promise<any> {
    const response = await this.request<any>(`/sub-admin-reports/${subAdminId}?period=${period}`);
    return response.data!;
  }

  async getDepartmentComparison(subAdminId: string): Promise<any> {
    const response = await this.request<any>(`/sub-admin-reports/${subAdminId}/comparison`);
    return response.data!;
  }

  // Track Complaint endpoints (public - no authentication required)
  async trackComplaint(complaintId: string): Promise<any> {
    const response = await this.request<any>(`/track/${complaintId}`);
    return response.data!;
  }

  async getComplaintStatus(complaintId: string): Promise<any> {
    const response = await this.request<any>(`/track/${complaintId}/status`);
    return response.data!;
  }

  async searchComplaints(query: string, limit: number = 10): Promise<any> {
    const response = await this.request<any>(`/track/search?query=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data!;
  }

  // Feedback endpoints
  async createFeedback(feedback: { complaintId: string; rating: number; note: string }): Promise<any> {
    const response = await this.request<any>('/feedbacks', {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
    return response;
  }

  async getComplaintFeedbacks(complaintId: string): Promise<any> {
    const response = await this.request<any>(`/feedbacks/complaint/${complaintId}`);
    return response;
  }

  async getDepartmentFeedbacks(departmentId: string, params: { startDate?: string; endDate?: string } = {}): Promise<any> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await this.request<any>(
      `/feedbacks/department/${departmentId}?${searchParams.toString()}`
    );
    return response;
  }

  async getUserFeedbacks(): Promise<any> {
    const response = await this.request<any>('/feedbacks/user');
    return response;
  }

  async updateFeedback(feedbackId: string, feedback: { rating?: number; note?: string }): Promise<any> {
    const response = await this.request<any>(`/feedbacks/${feedbackId}`, {
      method: 'PUT',
      body: JSON.stringify(feedback),
    });
    return response;
  }

  async deleteFeedback(feedbackId: string): Promise<void> {
    await this.request(`/feedbacks/${feedbackId}`, {
      method: 'DELETE',
    });
  }

  async getOverallFeedbackStats(params: { startDate?: string; endDate?: string } = {}): Promise<any> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await this.request<any>(
      `/feedbacks/stats?${searchParams.toString()}`
    );
    return response;
  }

  async getAllFeedbacks(params: {
    page?: number;
    limit?: number;
    rating?: string;
    sentiment?: string;
  } = {}): Promise<any> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await this.request<any>(
      `/feedbacks?${searchParams.toString()}`
    );
    return response.data;
  }

  async toggleFeedbackVisibility(feedbackId: string): Promise<any> {
    const response = await this.request<any>(`/feedbacks/${feedbackId}/visibility`, {
      method: 'PATCH',
    });
    return response;
  }

  async fetchUnverifiedUsers(): Promise<any> {
    const response = await this.request<any>("/users/unverified/users", {
      method: "GET",
    });
    return response;
  }

  async verifyUser(userId: string): Promise<any> {
    const response = await this.request<any>(`/users/verify/${userId}`, {
      method: "PATCH",
    });
    return response;
  }

  async deleteUser(userId: string): Promise<any> {
    await this.request(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async getAllUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  } = {}): Promise<any> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await this.request<any>(`/users?${searchParams.toString()}`);
    return response.data;
  }

  async updateUser(id: string, userData: { isActive?: boolean; name?: string; email?: string; role?: string; department?: string }): Promise<any> {
    const response = await this.request<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return response.data;
  }

  // Chatbot (Gemini AI)
  // Escalated complaints (SLA-breached unresolved complaints) — admin & sub_admin only
  async getEscalatedComplaints(): Promise<any> {
    const response = await this.request<any>('/escalated');
    return response.data!;
  }

  async sendChatMessage(
    message: string,
    history: Array<{ sender: 'user' | 'bot'; text: string }> = []
  ): Promise<{ response: string }> {
    const res = await this.request<any>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    });
    // Handle various response shapes: direct, nested, or double-nested (e.g. { data: { success, data: { response } } })
    const text =
      res?.data?.data?.response ??  // double-nested: { data: { data: { response } } }
      res?.data?.response ??         // nested: { data: { response } }
      (res as any)?.response;         // direct: { response }
    if (typeof text !== 'string') {
      throw new Error(res?.message || 'Failed to get chatbot response');
    }
    return { response: text };
  }
}

// Create and export API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// Types are already exported above
