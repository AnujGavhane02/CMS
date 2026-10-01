import { Complaint, ComplaintStatus } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/badge-variants";
import { StatusProgress } from "@/components/StatusProgress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, User, FileText, Mail, Tag, AlertCircle, Star, FileDown, MessageSquare } from "lucide-react";
import { exportSingleComplaintToPDF } from "@/lib/exportUtils";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import FeedbackList from "./FeedbackList";
import FeedbackModal from "./FeedbackModal";

interface ComplaintDetailsDialogProps {
  complaint: Complaint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate?: () => void;
  departments?: any[];
  onDepartmentUpdate?: () => void;
}

export const ComplaintDetailsDialog = ({ complaint, open, onOpenChange, onStatusUpdate, departments = [], onDepartmentUpdate }: ComplaintDetailsDialogProps) => {
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>("pending");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [refreshFeedbacks, setRefreshFeedbacks] = useState<boolean>(false);
  const isAdmin = user?.role === "master_admin" || user?.role === "sub_admin";
  const isMasterAdmin = user?.role === "master_admin";


  // Get allowed status transitions based on current status
  const getAllowedStatuses = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return [
          { value: 'processing', label: 'Processing' },
          { value: 'rejected', label: 'Rejected' },
        ];
      case 'processing':
        return [
          { value: 'resolved', label: 'Resolved' }
        ];
      case 'resolved':
        return [
          { value: 'processing', label: 'Reopen (Back to Processing)' }
        ];
      case 'rejected':
        return []; 
      default:
        return [];
    }
  };

  const allowedStatuses = complaint ? getAllowedStatuses(complaint.status) : [];

  // Set the initial selected status to the first allowed status
  useEffect(() => {
    if (complaint && allowedStatuses.length > 0) {
      setSelectedStatus(allowedStatuses[0].value as ComplaintStatus);
    }
  }, [complaint, allowedStatuses]);

  // Set the initial selected department to the current complaint's department
  useEffect(() => {
    if (complaint) {
      const currentDepartment = typeof complaint.department === 'object' && complaint.department && 'name' in complaint.department
        ? (complaint.department as { name: string }).name
        : String(complaint.department || complaint.category || "");
      setSelectedDepartment(currentDepartment);
    }
  }, [complaint]);

  if (!complaint) return null;

  const handleStatusUpdate = async () => {
    try {
      await apiClient.updateComplaintStatus(complaint.id, selectedStatus);
      toast.success(`Complaint status updated to ${selectedStatus}`);
      onStatusUpdate?.(); // Refresh the parent component's data
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update complaint status:', error);
      toast.error('Failed to update complaint status');
    }
  };

  const handleDepartmentUpdate = async () => {
    try {
      // Find the department object by name
      const department = departments.find(dept => dept.name === selectedDepartment);
      if (!department) {
        toast.error('Department not found');
        return;
      }

      await apiClient.updateComplaintDepartment(complaint.id, department._id || department.id);
      
      toast.success(`Complaint department changed to ${selectedDepartment}`);
      onDepartmentUpdate?.(); // Refresh the parent component's data
    } catch (error) {
      console.error('Failed to update complaint department:', error);
      toast.error('Failed to update complaint department');
    }
  };

  const handleExportPDF = () => {
    exportSingleComplaintToPDF(complaint, isAdmin);
    toast.success('Complaint exported to PDF');
  };

  const handleFeedbackSubmitted = () => {
    setRefreshFeedbacks(!refreshFeedbacks);
    toast.success('Feedback submitted successfully!');
  };

  const canSubmitFeedback = () => {
    return complaint?.status === 'resolved' && 
           user?.id === complaint.userId && 
           user?.role !== 'master_admin' && 
           user?.role !== 'sub_admin';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{complaint.title}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <StatusBadge status={complaint.status}>
                {complaint.status.charAt(0).toUpperCase() + complaint.status.slice(1)}
              </StatusBadge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Complaint ID */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-mono font-medium">
              Complaint ID: <span className="text-primary">{complaint.complaintId || complaint.id}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-semibold">Description</h4>
            </div>
            <p className="text-muted-foreground leading-relaxed">{complaint.description}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4" />
                <span>Department</span>
              </div>
              <p className="font-medium">
                {typeof complaint.department === 'object' && complaint.department && 'name' in complaint.department
                  ? (complaint.department as { name: string }).name
                  : String(complaint.department || "")}
              </p>
            </div>

            {complaint.category && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  <span>Category</span>
                </div>
                <p className="font-medium">{complaint.category}</p>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>Urgency</span>
              </div>
              <StatusBadge urgency={complaint.urgency}>
                {complaint.urgency.charAt(0).toUpperCase() + complaint.urgency.slice(1)}
                {typeof complaint.priority === "number" ? ` (${complaint.priority}/10)` : ""}
              </StatusBadge>
            </div>

            {isAdmin && (
              <>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>User</span>
                  </div>
                  <p className="font-medium">
                    {complaint.isAnonymous ? "Anonymous" : complaint.userName}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </div>
                  <p className="font-medium">
                    {complaint.isAnonymous ? "Hidden" : complaint.userEmail}
                  </p>
                </div>
              </>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Submitted</span>
              </div>
              <p className="font-medium">
                {formatDistanceToNow(complaint.createdAt, { addSuffix: true })}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Last Updated</span>
              </div>
              <p className="font-medium">
                {formatDistanceToNow(complaint.updatedAt, { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Attachments */}
          {complaint.attachments && complaint.attachments.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Attachments</h4>
              <div className="flex flex-wrap gap-2">
                {complaint.attachments.map((attachment, index) => (
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
            <StatusProgress currentStatus={complaint.status} />
          </div>

          {/* Status History */}
          {complaint.statusHistory.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Status History</h4>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {complaint.statusHistory.map((history, index) => (
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

          {/* Feedback Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Feedback
              </h4>
              {canSubmitFeedback() && (
                <Button 
                  onClick={() => setShowFeedbackModal(true)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Star className="h-4 w-4" />
                  Submit Feedback
                </Button>
              )}
            </div>
            <FeedbackList 
              complaintId={complaint.id}
              canSubmitFeedback={canSubmitFeedback()}
              onFeedbackSubmitted={() => setShowFeedbackModal(true)}
              refreshTrigger={refreshFeedbacks}
            />
          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <div className="pt-4 border-t space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Update Status</label>
                {allowedStatuses.length > 0 ? (
                  <div className="flex gap-2">
                    <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ComplaintStatus)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedStatuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleStatusUpdate}>Update</Button>
                  </div>
                ) : (
                  <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                    No status transitions available from "{complaint.status.charAt(0).toUpperCase() + complaint.status.slice(1)}" status
                  </div>
                )}
              </div>

              {isAdmin && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Change Department</label>
                  <div className="flex gap-2">
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept._id || dept.id} value={dept.name}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleDepartmentUpdate}>Change</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feedback Modal */}
        {complaint && (
          <FeedbackModal
            isOpen={showFeedbackModal}
            onClose={() => setShowFeedbackModal(false)}
            complaintId={complaint.id}
            onFeedbackSubmitted={handleFeedbackSubmitted}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
