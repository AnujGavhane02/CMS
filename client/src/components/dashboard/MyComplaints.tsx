import { useState, useEffect } from "react";
import { ComplaintCard } from "@/components/ComplaintCard";
import { ComplaintDetailsDialog } from "@/components/ComplaintDetailsDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileDown, FileSpreadsheet, Loader2, RefreshCw } from "lucide-react";
import { Complaint } from "@/lib/types";
import { exportComplaintsToExcel, exportComplaintsToPDF } from "@/lib/exportUtils";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export const MyComplaints = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchComplaints();
  }, [user]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      let response;
      
      if (user?.role === 'master_admin') {
        // Master admin can see all complaints
        response = await apiClient.getComplaints();
      } else if (user?.role === 'sub_admin') {
        // Sub-admin can see only their department's complaints
        response = await apiClient.getComplaintsByDepartment(user.department || '');
      } else {
        // Regular users can see only their own complaints
        response = await apiClient.getUserComplaints();
      }
      
      console.log('API response structure:', response);
      // Handle different response structures
      if (response.data && Array.isArray(response.data)) {
        setComplaints(response.data);
      } else if (response.complaints && Array.isArray(response.complaints)) {
        setComplaints(response.complaints);
      } else {
        console.warn('Unexpected response structure:', response);
        setComplaints([]);
      }
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
      toast.error('Failed to load complaints');
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredComplaints = complaints.filter((complaint) =>
    (complaint.complaintId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    complaint.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportExcel = () => {
    exportComplaintsToExcel(filteredComplaints, 'my-complaints');
    toast.success('Complaints exported to Excel');
  };

  const handleExportPDF = () => {
    exportComplaintsToPDF(filteredComplaints, 'my-complaints');
    toast.success('Complaints exported to PDF');
  };

  const getPageTitle = () => {
    if (user?.role === 'master_admin') return "All Complaints";
    if (user?.role === 'sub_admin') return `${user.department} Department Complaints`;
    return "My Complaints";
  };

  const getPageDescription = () => {
    if (user?.role === 'master_admin') return "View and manage all complaints across the institute";
    if (user?.role === 'sub_admin') return `Manage complaints assigned to ${user.department} department`;
    return "Track and manage your submitted complaints";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{getPageTitle()}</h2>
          <p className="text-muted-foreground">{getPageDescription()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchComplaints} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by complaint ID or title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading complaints...</span>
          </div>
        ) : filteredComplaints.length > 0 ? (
          filteredComplaints.map((complaint) => (
            <ComplaintCard
              key={complaint.id}
              complaint={complaint}
              onClick={() => {
                setSelectedComplaint(complaint);
                setDialogOpen(true);
              }}
            />
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {user?.role === 'master_admin' 
              ? "No complaints found in the system."
              : user?.role === 'sub_admin'
              ? `No complaints found for ${user.department} department.`
              : "No complaints found. Submit your first complaint to get started."
            }
          </div>
        )}
      </div>

      <ComplaintDetailsDialog
        complaint={selectedComplaint}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
};
