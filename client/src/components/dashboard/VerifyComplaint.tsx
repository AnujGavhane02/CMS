import { useState } from "react";
import { Complaint } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge-variants";
import { StatusProgress } from "@/components/StatusProgress";
import { Search, FileText, Calendar, Clock, User, Mail, Tag, AlertCircle, Shield, FileDown, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { exportSingleComplaintToPDF } from "@/lib/exportUtils";
import { DataService } from "@/lib/dataService";
import { useAuth } from "@/contexts/AuthContext";

export const VerifyComplaint = () => {
  const { user } = useAuth();
  const [complaintId, setComplaintId] = useState("");
  const [searchedComplaint, setSearchedComplaint] = useState<Complaint | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if user is master admin
  const isMasterAdmin = user?.role === "master_admin";

  const handleSearch = async () => {
    if (!complaintId.trim()) {
      toast.error("Please enter a complaint ID");
      return;
    }

    if (!isMasterAdmin) {
      toast.error("Only master admin can verify complaints");
      return;
    }

    try {
      setLoading(true);
      setNotFound(false);
      
      // Search for complaint by ID
      const complaint = await DataService.getComplaintById(complaintId.trim());
      
      if (complaint) {
        setSearchedComplaint(complaint);
        toast.success("Complaint found");
      } else {
        setSearchedComplaint(null);
        setNotFound(true);
        toast.error("Complaint not found");
      }
    } catch (error) {
      console.error('Failed to fetch complaint:', error);
      setSearchedComplaint(null);
      setNotFound(true);
      toast.error("Complaint not found");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (searchedComplaint) {
      exportSingleComplaintToPDF(searchedComplaint, true);
      toast.success('Complaint exported to PDF');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Verify Complaint</h2>
        <p className="text-muted-foreground">Look up and verify anonymous complaint details by entering complaint ID</p>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Complaint ID Verification
          </CardTitle>
          <CardDescription>
            Enter the complaint ID to view full details including anonymous user information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter complaint ID (e.g., CMP-2024-001)"
                value={complaintId}
                onChange={(e) => {
                  setComplaintId(e.target.value);
                  setNotFound(false);
                }}
                onKeyPress={handleKeyPress}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading || !isMasterAdmin}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
          {!isMasterAdmin && (
            <p className="text-sm text-warning mt-2">
              Only master admin can verify complaints
            </p>
          )}
          {notFound && (
            <p className="text-sm text-destructive mt-2">
              No complaint found with ID: {complaintId}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Complaint Details */}
      {searchedComplaint && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {searchedComplaint.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <StatusBadge status={searchedComplaint.status}>
                  {searchedComplaint.status.charAt(0).toUpperCase() + searchedComplaint.status.slice(1)}
                </StatusBadge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Complaint ID */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-mono font-medium">
                Complaint ID: <span className="text-primary">{searchedComplaint.complaintId || searchedComplaint.id}</span>
              </div>
            </div>

            {/* Anonymous Badge */}
            {searchedComplaint.isAnonymous && (
              <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg border border-warning/20">
                <Shield className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-warning">Anonymous Complaint - Sensitive Information</span>
              </div>
            )}

            {/* Description */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold">Description</h4>
              </div>
              <p className="text-muted-foreground leading-relaxed">{searchedComplaint.description}</p>
            </div>

            {/* User Information - Always Shown for Master Admin */}
            <div className="p-4 bg-card rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">User Information</h4>
                {isMasterAdmin && searchedComplaint.isAnonymous && (
                  <div className="flex items-center gap-1 text-xs text-warning bg-warning/10 px-2 py-1 rounded">
                    <Shield className="h-3 w-3" />
                    <span>Master Admin View</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Name</span>
                  </div>
                  <p className="font-medium">
                    {searchedComplaint.isAnonymous && !isMasterAdmin
                      ? <span className="text-warning">Anonymous User</span>
                      : searchedComplaint.userName
                    }
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </div>
                  <p className="font-medium">
                    {searchedComplaint.isAnonymous && !isMasterAdmin
                      ? <span className="text-warning">Hidden for Privacy</span>
                      : searchedComplaint.userEmail
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  <span>Department</span>
                </div>
                <p className="font-medium">
                  {typeof searchedComplaint.department === 'object' && searchedComplaint.department?.name
                    ? searchedComplaint.department.name
                    : String(searchedComplaint.department || "—")}
                </p>
              </div>

              {searchedComplaint.category && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Tag className="h-4 w-4" />
                    <span>Category</span>
                  </div>
                  <p className="font-medium">{searchedComplaint.category}</p>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Urgency</span>
                </div>
                <StatusBadge urgency={searchedComplaint.urgency}>
                  {searchedComplaint.urgency.charAt(0).toUpperCase() + searchedComplaint.urgency.slice(1)}
                </StatusBadge>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Submitted</span>
                </div>
                <p className="font-medium">
                  {formatDistanceToNow(searchedComplaint.createdAt, { addSuffix: true })}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Last Updated</span>
                </div>
                <p className="font-medium">
                  {formatDistanceToNow(searchedComplaint.updatedAt, { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Attachments */}
            {searchedComplaint.attachments && searchedComplaint.attachments.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Attachments</h4>
                <div className="flex flex-wrap gap-2">
                  {searchedComplaint.attachments.map((attachment, index) => (
                    <Button key={index} variant="outline" size="sm">
                      {attachment}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Status Progress */}
            <div>
              <h4 className="font-semibold mb-3">Status Progress</h4>
              <StatusProgress currentStatus={searchedComplaint.status} />
            </div>

            {/* Status History */}
            {searchedComplaint.statusHistory.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Status History</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {searchedComplaint.statusHistory.map((history, index) => (
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
                        {history.timestamp.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback */}
            {searchedComplaint.feedback && (
              <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                <h4 className="font-semibold mb-2">User Feedback</h4>
                <p className="text-sm mb-2">{searchedComplaint.feedback.comment}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Rating: {searchedComplaint.feedback.rating}/5</span>
                  <span>•</span>
                  <span className="capitalize">{searchedComplaint.feedback.sentiment}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
