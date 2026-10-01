import { useState, useEffect } from "react";
import { ComplaintCard } from "@/components/ComplaintCard";
import { ComplaintDetailsDialog } from "@/components/ComplaintDetailsDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, FileDown, FileSpreadsheet, Loader2, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Complaint } from "@/lib/types";
import { exportComplaintsToExcel, exportComplaintsToPDF } from "@/lib/exportUtils";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";

const ITEMS_PER_PAGE = 10;

export const DepartmentComplaints = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalComplaints, setTotalComplaints] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  // Export loading state
  const [exporting, setExporting] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [currentPage, debouncedSearch, statusFilter, priorityFilter]);

  const fetchDepartments = async () => {
    try {
      const response = await apiClient.getDepartments({ isActive: true });
      setDepartments((response as any).departments || (response as any).data || []);
    } catch (error) {
      console.error('Failed to load departments:', error);
      toast.error('Failed to load departments');
      setDepartments([]);
    } 
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter !== "all") params.urgency = priorityFilter;

      const response = await apiClient.getComplaints(params);
      console.log('Department complaints API response:', response);

      // Handle different response structures
      let complaintsData: Complaint[] = [];
      let paginationData: any = null;

      if (response.data && Array.isArray(response.data)) {
        complaintsData = response.data as any;
        paginationData = (response as any).pagination;
      } else if ((response as any).complaints && Array.isArray((response as any).complaints)) {
        complaintsData = (response as any).complaints as any;
        paginationData = (response as any).pagination;
      } else {
        console.warn('Unexpected response structure:', response);
        complaintsData = [];
      }

      setComplaints(complaintsData);

      if (paginationData) {
        setTotalPages(paginationData.totalPages || 1);
        setTotalComplaints(paginationData.totalComplaints || paginationData.totalItems || 0);
        setHasNext(paginationData.hasNext || false);
        setHasPrev(paginationData.hasPrev || false);
      }
    } catch (error) {
      console.error('Failed to fetch department complaints:', error);
      toast.error('Failed to load department complaints');
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 when filters change
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };
  const handlePriorityChange = (value: string) => {
    setPriorityFilter(value);
    setCurrentPage(1);
  };

  const fetchAllComplaintsForExport = async (): Promise<Complaint[]> => {
    try {
      const params: Record<string, any> = {
        page: 1,
        limit: 10000, // Fetch all
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter !== "all") params.urgency = priorityFilter;

      const response = await apiClient.getComplaints(params);

      let complaintsData: Complaint[] = [];
      if (response.data && Array.isArray(response.data)) {
        complaintsData = response.data as any;
      } else if ((response as any).complaints && Array.isArray((response as any).complaints)) {
        complaintsData = (response as any).complaints as any;
      }

      return complaintsData;
    } catch (error) {
      console.error('Failed to fetch all complaints for export:', error);
      toast.error('Failed to fetch complaints for export');
      return [];
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const allComplaints = await fetchAllComplaintsForExport();
      if (allComplaints.length === 0) {
        toast.error('No complaints to export');
        return;
      }
      exportComplaintsToExcel(allComplaints, 'department-complaints');
      toast.success(`Exported ${allComplaints.length} complaints to Excel`);
    } catch (error) {
      toast.error('Failed to export to Excel');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const allComplaints = await fetchAllComplaintsForExport();
      if (allComplaints.length === 0) {
        toast.error('No complaints to export');
        return;
      }
      exportComplaintsToPDF(allComplaints, 'department-complaints');
      toast.success(`Exported ${allComplaints.length} complaints to PDF`);
    } catch (error) {
      toast.error('Failed to export to PDF');
    } finally {
      setExporting(false);
    }
  };

  // Pagination helpers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Generate page numbers to display (with ellipsis logic)
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  // Calculate display range
  const rangeStart = totalComplaints === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalComplaints);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Department Complaints</h2>
          <p className="text-muted-foreground">Manage complaints for your assigned department</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchComplaints} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Export PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search complaints..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={handlePriorityChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Complaints count summary */}
      {!loading && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {rangeStart}–{rangeEnd} of {totalComplaints} complaints
          </span>
          {totalPages > 1 && (
            <span>Page {currentPage} of {totalPages}</span>
          )}
        </div>
      )}

      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading department complaints...</span>
          </div>
        ) : complaints.length > 0 ? (
          complaints.map((complaint) => (
            <ComplaintCard
              key={complaint.id}
              complaint={complaint}
              showUser={true}
              onClick={() => {
                setSelectedComplaint(complaint);
                setDialogOpen(true);
              }}
            />
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No complaints found for your department.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-4 pb-2">
          {/* First page */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous page */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1 px-3"
            onClick={() => goToPage(currentPage - 1)}
            disabled={!hasPrev}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-1 mx-1">
            {getPageNumbers().map((page, idx) =>
              page === 'ellipsis' ? (
                <span key={`ellipsis-${idx}`} className="flex h-9 w-9 items-center justify-center text-muted-foreground">
                  ···
                </span>
              ) : (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => goToPage(page)}
                >
                  {page}
                </Button>
              )
            )}
          </div>

          {/* Next page */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1 px-3"
            onClick={() => goToPage(currentPage + 1)}
            disabled={!hasNext}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last page */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ComplaintDetailsDialog
        complaint={selectedComplaint}
        open={dialogOpen}
        departments={departments}
        onOpenChange={setDialogOpen}
        onStatusUpdate={fetchComplaints}
      />
    </div>
  );
};
