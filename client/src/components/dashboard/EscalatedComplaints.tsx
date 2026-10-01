import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ComplaintDetailsDialog } from "@/components/ComplaintDetailsDialog";
import { Complaint } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EscalatedComplaint extends Complaint {
  slaDays: number;
  slaDeadline: string;
  overdueHours: number;
  overdueDays: number;
}

const getPriorityBand = (priority: number) => {
  if (priority >= 8) return { label: "High", color: "bg-red-100 text-red-700 border-red-200" };
  if (priority >= 4) return { label: "Medium", color: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: "Low", color: "bg-blue-100 text-blue-700 border-blue-200" };
};

const getOverdueSeverity = (overdueHours: number) => {
  if (overdueHours >= 48) return "bg-red-50 border-red-300";
  if (overdueHours >= 24) return "bg-orange-50 border-orange-300";
  return "bg-amber-50 border-amber-200";
};

const getOverdueLabel = (overdueDays: number, overdueHours: number) => {
  if (overdueDays >= 1) return `${overdueDays}d ${overdueHours % 24}h overdue`;
  return `${overdueHours}h overdue`;
};

const formatDeadline = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const EscalatedComplaints = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<EscalatedComplaint[]>([]);
  const [summary, setSummary] = useState({ high: 0, medium: 0, low: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [bandFilter, setBandFilter] = useState<string>("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchEscalated = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getEscalatedComplaints();
      const list: EscalatedComplaint[] = data.escalatedComplaints ?? [];
      setComplaints(list);
      setSummary({
        high: data.summary?.high ?? 0,
        medium: data.summary?.medium ?? 0,
        low: data.summary?.low ?? 0,
        total: data.total ?? list.length,
      });
    } catch {
      toast.error("Failed to load escalated complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscalated();
  }, []);

  const filtered = complaints.filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      c.title?.toLowerCase().includes(term) ||
      (typeof c.department === "object" ? c.department?.name : c.department ?? "")
        .toLowerCase()
        .includes(term);

    const priority = c.priority ?? 5;
    const matchesBand =
      bandFilter === "all" ||
      (bandFilter === "high" && priority >= 8) ||
      (bandFilter === "medium" && priority >= 4 && priority < 8) ||
      (bandFilter === "low" && priority < 4);

    return matchesSearch && matchesBand;
  });

  const handleView = (complaint: EscalatedComplaint) => {
    setSelectedComplaint(complaint as unknown as Complaint);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Escalated Complaints</h1>
            <p className="text-sm text-muted-foreground">
              Unresolved complaints that have exceeded their SLA deadline
            </p>
          </div>
          {!loading && (
            <Badge variant="destructive" className="ml-2 text-sm px-2 py-1">
              {summary.total}
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchEscalated} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* SLA Reference */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap gap-4 text-sm text-amber-800">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <strong>Low priority (1–3):</strong> resolve within 3 days
            </span>
            <span className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <strong>Medium priority (4–7):</strong> resolve within 2 days
            </span>
            <span className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <strong>High priority (8–10):</strong> resolve within 1 day
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className={cn("cursor-pointer transition-shadow hover:shadow-md border-red-200",
            bandFilter === "high" && "ring-2 ring-red-400")}
          onClick={() => setBandFilter(bandFilter === "high" ? "all" : "high")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
              High Priority Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{loading ? "—" : summary.high}</div>
            <p className="text-xs text-muted-foreground mt-1">Priority 8–10 · SLA: 1 day</p>
          </CardContent>
        </Card>

        <Card
          className={cn("cursor-pointer transition-shadow hover:shadow-md border-amber-200",
            bandFilter === "medium" && "ring-2 ring-amber-400")}
          onClick={() => setBandFilter(bandFilter === "medium" ? "all" : "medium")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              Medium Priority Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{loading ? "—" : summary.medium}</div>
            <p className="text-xs text-muted-foreground mt-1">Priority 4–7 · SLA: 2 days</p>
          </CardContent>
        </Card>

        <Card
          className={cn("cursor-pointer transition-shadow hover:shadow-md border-blue-200",
            bandFilter === "low" && "ring-2 ring-blue-400")}
          onClick={() => setBandFilter(bandFilter === "low" ? "all" : "low")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Low Priority Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{loading ? "—" : summary.low}</div>
            <p className="text-xs text-muted-foreground mt-1">Priority 1–3 · SLA: 3 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={bandFilter} onValueChange={setBandFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High (8–10)</SelectItem>
            <SelectItem value="medium">Medium (4–7)</SelectItem>
            <SelectItem value="low">Low (1–3)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Complaint List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 text-green-500" />
            <p className="text-lg font-medium text-foreground">
              {complaints.length === 0 ? "No escalated complaints" : "No results for current filters"}
            </p>
            <p className="text-sm">
              {complaints.length === 0
                ? "All complaints are within their SLA deadlines."
                : "Try clearing the search or filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const priority = c.priority ?? 5;
            const band = getPriorityBand(priority);
            const deptName =
              typeof c.department === "object" ? c.department?.name : c.department ?? "—";

            return (
              <Card
                key={c.id ?? (c as any)._id}
                className={cn(
                  "border transition-shadow hover:shadow-md",
                  getOverdueSeverity(c.overdueHours)
                )}
              >
                <CardContent className="py-4 px-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    {/* Left: complaint info */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          {(c as any).complaintId ?? `#${String(c.id ?? (c as any)._id).slice(-6).toUpperCase()}`}
                        </span>
                        <Badge variant="outline" className={cn("text-xs font-medium", band.color)}>
                          P{priority} · {band.label}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            c.status === "pending"
                              ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          )}
                        >
                          {c.status}
                        </Badge>
                      </div>

                      <p className="font-semibold text-foreground truncate">{c.title}</p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{deptName}</span>
                        {c.category && <span>{c.category}</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Deadline: {formatDeadline(c.slaDeadline)}
                        </span>
                      </div>
                    </div>

                    {/* Right: overdue badge + action */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-3 flex-shrink-0">
                      <div className="flex items-center gap-1.5 bg-red-100 text-red-700 rounded-full px-3 py-1 text-xs font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {getOverdueLabel(c.overdueDays, c.overdueHours)}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleView(c)}
                        className="text-xs"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedComplaint && (
        <ComplaintDetailsDialog
          complaint={selectedComplaint}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onStatusUpdate={fetchEscalated}
          userRole={user?.role ?? "user"}
        />
      )}
    </div>
  );
};
