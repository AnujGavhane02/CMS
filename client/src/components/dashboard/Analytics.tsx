import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataService } from "@/lib/dataService";
import { Download, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export const Analytics = () => {
  const [monthlyData, setMonthlyData] = useState([]);
  const [resolutionTimeData, setResolutionTimeData] = useState([]);
  const [sentimentData, setSentimentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch monthly trends
      const monthlyTrends = await DataService.getMonthlyTrends(6);
      const formattedMonthlyData = monthlyTrends.map(item => ({
        month: new Date(item._id.year, item._id.month - 1).toLocaleDateString('en-US', { month: 'short' }),
        complaints: item.total || 0,
        resolved: item.resolved || 0
      }));
      setMonthlyData(formattedMonthlyData);
      
      // Fetch resolution time analysis
      const resolutionAnalysis = await DataService.getResolutionTimeAnalysis();
      const formattedResolutionData = resolutionAnalysis.byCategory?.map(item => ({
        dept: item.departmentName || 'Unknown Department',
        avgDays: item.avgResolutionTime || 0
      })) || [];
      setResolutionTimeData(formattedResolutionData);
      
      // Fetch sentiment analysis
      const sentimentAnalysis = await DataService.getSentimentAnalysis();
      const overall = sentimentAnalysis.overall;
      
      if (overall.totalFeedbacks > 0) {
        const sentiment = [
          { 
            name: "Positive", 
            value: overall.positive, 
            color: "#22c55e",
            percentage: ((overall.positive / overall.totalFeedbacks) * 100).toFixed(1)
          },
          { 
            name: "Neutral", 
            value: overall.neutral, 
            color: "#6b7280",
            percentage: ((overall.neutral / overall.totalFeedbacks) * 100).toFixed(1)
          },
          { 
            name: "Negative", 
            value: overall.negative, 
            color: "#ef4444",
            percentage: ((overall.negative / overall.totalFeedbacks) * 100).toFixed(1)
          },
        ];
        setSentimentData(sentiment);
      } else {
        // No feedback data available
        setSentimentData([]);
      }
      
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const handleExport = (format: string) => {
    toast({
      title: "Export Started",
      description: `Generating ${format.toUpperCase()} report...`,
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Loading Analytics...</h2>
            <p className="text-muted-foreground">Fetching comprehensive insights</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-48 bg-muted animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Analytics Error</h2>
            <p className="text-muted-foreground text-red-500">{error}</p>
          </div>
          <Button onClick={fetchAnalyticsData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Advanced Analytics</h2>
          <p className="text-muted-foreground">Comprehensive insights and reporting</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={fetchAnalyticsData} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Trends */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Complaint Trends (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="complaints" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="resolved" stroke="hsl(var(--success))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No trend data available
              </div>
            )}
            <div className="flex items-center gap-2 mt-4 text-sm">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-success">Resolution rate improved by 12% this quarter</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sentiment Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {sentimentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sentimentData.map((entry, index) => (
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

      {/* Resolution Time Analysis */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Average Resolution Time by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {resolutionTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={resolutionTimeData}>
                  <XAxis dataKey="dept" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgDays" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No resolution time data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
