import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusProgress } from "@/components/StatusProgress";
import { ArrowLeft, Search, FileText, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface TrackedComplaint {
  _id: string;
  complaintId: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  department: {
    name: string;
    description: string;
  };
  user?: {
    name: string;
    email: string;
  } | null;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    notes?: string;
    updatedBy?: string;
  }>;
  feedback?: {
    rating: number;
    comment: string;
    sentiment: string;
    createdAt: string;
  };
  attachments?: Array<{
    filename: string;
    originalName: string;
    size: number;
    url: string;
  }>;
}

const TrackComplaint = () => {
  const [complaintId, setComplaintId] = useState("");
  const [foundComplaint, setFoundComplaint] = useState<TrackedComplaint | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!complaintId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a complaint ID",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSearched(true);
      
      const data = await apiClient.trackComplaint(complaintId.trim().toUpperCase());
      setFoundComplaint(data);
      
      toast({
        title: "Success",
        description: "Complaint found successfully",
      });
    } catch (error: any) {
      console.error('Track complaint error:', error);
      setFoundComplaint(null);
      setError(error.message || 'Failed to track complaint');
      
      toast({
        title: "Error",
        description: error.message || "Failed to track complaint",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>Track Your Complaint</CardTitle>
                <CardDescription>Enter your complaint ID to view status</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Enter Complaint ID (e.g., CMP-001)"
                value={complaintId}
                onChange={(e) => setComplaintId(e.target.value)}
                className="flex-1"
                disabled={loading}
              />
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Searching...' : 'Track'}
              </Button>
            </form>

            {searched && !foundComplaint && !loading && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No complaint found with ID: <span className="font-mono font-semibold">{complaintId}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Please check the ID and try again.
                </p>
                {error && (
                  <p className="text-sm text-red-600 mt-2">
                    Error: {error}
                  </p>
                )}
              </div>
            )}

            {foundComplaint && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg">{foundComplaint.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        {foundComplaint.complaintId}
                      </span>
                      {foundComplaint.isAnonymous && (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                          Anonymous
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {foundComplaint.description}
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Department:</span>
                      <span className="ml-2 font-medium">{foundComplaint.department?.name ?? "—"}</span>
                    </div>
                    {foundComplaint.category && (
                      <div>
                        <span className="text-muted-foreground">Category:</span>
                        <span className="ml-2 font-medium">{foundComplaint.category}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Urgency:</span>
                      <span className="ml-2 font-medium capitalize">{foundComplaint.urgency}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Submitted:</span>
                      <span className="ml-2 font-medium">
                        {formatDistanceToNow(new Date(foundComplaint.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span className="ml-2 font-medium">
                        {formatDistanceToNow(new Date(foundComplaint.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  {foundComplaint.user && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Submitted by:</span>
                        <span className="ml-2 font-medium">{foundComplaint.user.name}</span>
                        <span className="ml-2 text-muted-foreground">({foundComplaint.user.email})</span>
                      </div>
                    </div>
                  )}
                </div>

                <StatusProgress currentStatus={foundComplaint.status} />

                {foundComplaint.statusHistory && foundComplaint.statusHistory.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Status History</h4>
                    <div className="space-y-3">
                      {foundComplaint.statusHistory.map((history, index) => (
                        <div key={index} className="flex gap-3 pb-3 border-b last:border-0">
                          <div className="flex-1">
                            <p className="font-medium capitalize">{history.status}</p>
                            {history.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{history.notes}</p>
                            )}
                            {history.updatedBy && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Updated by: {history.updatedBy}
                              </p>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(history.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {foundComplaint.feedback && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h4 className="font-semibold text-green-800">Your Feedback</h4>
                    </div>
                    <p className="text-sm mb-2">{foundComplaint.feedback.comment}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Rating: {foundComplaint.feedback.rating}/5</span>
                      <span>•</span>
                      <span className="capitalize">{foundComplaint.feedback.sentiment}</span>
                      <span>•</span>
                      <span>{new Date(foundComplaint.feedback.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}

                {foundComplaint.attachments && foundComplaint.attachments.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Attachments</h4>
                    <div className="space-y-2">
                      {foundComplaint.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{attachment.originalName}</p>
                            <p className="text-xs text-muted-foreground">
                              {(attachment.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Have an account?
              </p>
              <Button variant="link" onClick={() => navigate("/auth")}>
                Sign in to view all your complaints
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrackComplaint;
