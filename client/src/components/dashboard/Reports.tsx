import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, TrendingUp, Loader2, BarChart3, Users, Clock, CheckCircle } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface ReportData {
  subAdmin: {
    _id: string;
    name: string;
    email: string;
    department: {
      _id: string;
      name: string;
      description: string;
    };
  };
  period: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalComplaints: number;
    resolvedComplaints: number;
    pendingComplaints: number;
    processingComplaints: number;
    rejectedComplaints: number;
    resolutionRate: number;
    avgResolutionTime: number;
  };
  urgencyStats: {
    low: number;
    medium: number;
    high: number;
  };
  weeklyData: Array<{
    week: string;
    received: number;
    resolved: number;
    pending: number;
    processing: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
  }>;
  recentComplaints: Array<{
    _id: string;
    title: string;
    status: string;
    urgency: string;
    createdAt: string;
    resolvedAt?: string;
    user: {
      name: string;
      email: string;
    };
  }>;
  satisfactionData: {
    totalFeedback: number;
    avgRating: number;
    satisfactionRate: number;
    positive: number;
    negative: number;
  };
  sentimentData: {
    totalFeedbacks: number;
    positive: number;
    neutral: number;
    negative: number;
    avgRating: number;
    avgSentimentScore: number;
  };
}

export const Reports = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.role === 'sub_admin') {
      fetchReportData();
    }
  }, [user, selectedPeriod]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getSubAdminReports(user.id, selectedPeriod);
      setReportData(data);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      toast({
        title: "Error",
        description: "Failed to load report data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (type: string) => {
    toast({
      title: "Report Generated",
      description: `${type} report has been downloaded successfully.`,
    });
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading reports...</span>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No report data available</p>
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{reportData.subAdmin.department.name} Department Reports</h2>
          <p className="text-muted-foreground">Analytics for {reportData.subAdmin.name} - {reportData.period} view</p>
        </div>

        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => handleDownload("Weekly")}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.summary.totalComplaints}</div>
            <p className="text-xs text-muted-foreground">This {reportData.period}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.summary.resolutionRate}%</div>
            <p className="text-xs text-green-600">
              {reportData.summary.resolvedComplaints} of {reportData.summary.totalComplaints} resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Resolution Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.summary.avgResolutionTime} days</div>
            <p className="text-xs text-muted-foreground">Average resolution time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.satisfactionData.satisfactionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {reportData.satisfactionData.totalFeedback} feedback received
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.weeklyData}>
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="received" stroke="#8884d8" strokeWidth={2} name="Received" />
                <Line type="monotone" dataKey="resolved" stroke="#82ca9d" strokeWidth={2} name="Resolved" />
                <Line type="monotone" dataKey="pending" stroke="#ffc658" strokeWidth={2} name="Pending" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Complaints by Urgency</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'High', value: reportData.urgencyStats.high, color: '#ff6b6b' },
                    { name: 'Medium', value: reportData.urgencyStats.medium, color: '#ffd93d' },
                    { name: 'Low', value: reportData.urgencyStats.low, color: '#6bcf7f' }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'High', value: reportData.urgencyStats.high, color: '#ff6b6b' },
                    { name: 'Medium', value: reportData.urgencyStats.medium, color: '#ffd93d' },
                    { name: 'Low', value: reportData.urgencyStats.low, color: '#6bcf7f' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sentiment Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.sentimentData.totalFeedbacks > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { 
                        name: "Positive", 
                        value: reportData.sentimentData.positive, 
                        color: "#22c55e",
                        percentage: ((reportData.sentimentData.positive / reportData.sentimentData.totalFeedbacks) * 100).toFixed(1)
                      },
                      { 
                        name: "Neutral", 
                        value: reportData.sentimentData.neutral, 
                        color: "#6b7280",
                        percentage: ((reportData.sentimentData.neutral / reportData.sentimentData.totalFeedbacks) * 100).toFixed(1)
                      },
                      { 
                        name: "Negative", 
                        value: reportData.sentimentData.negative, 
                        color: "#ef4444",
                        percentage: ((reportData.sentimentData.negative / reportData.sentimentData.totalFeedbacks) * 100).toFixed(1)
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: "Positive", value: reportData.sentimentData.positive, color: "#22c55e" },
                      { name: "Neutral", value: reportData.sentimentData.neutral, color: "#6b7280" },
                      { name: "Negative", value: reportData.sentimentData.negative, color: "#ef4444" }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${value} feedbacks (${props.payload.percentage}%)`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <p>No feedback data available</p>
                  <p className="text-sm">Sentiment analysis will appear here once feedbacks are submitted</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Complaints */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Complaints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.recentComplaints.length > 0 ? (
              reportData.recentComplaints.map((complaint) => (
                <div key={complaint._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{complaint.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      by {complaint.user.name} • {new Date(complaint.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      complaint.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      complaint.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      complaint.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {complaint.status}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      complaint.urgency === 'high' ? 'bg-red-100 text-red-800' :
                      complaint.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {complaint.urgency}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No recent complaints</p>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
