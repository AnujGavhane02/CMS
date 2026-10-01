import { ReactNode, useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  Menu,
  X,
  MessageCircle,
  Building2,
  BarChart3,
  Bell,
  Sun,
  Moon,
  Shield,
  UserCheck2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Chatbot } from "@/components/Chatbot";
import { apiClient } from "@/lib/api";

interface DashboardLayoutProps {
  children: ReactNode;
}

interface EscalatedItem {
  _id: string;
  complaintId: string;
  title: string;
  priority: number;
  overdueHours: number;
  overdueDays: number;
  department?: { name: string } | string;
  status: string;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; // refresh every 5 minutes

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Notification state
  const [notifOpen, setNotifOpen] = useState(false);
  const [escalatedItems, setEscalatedItems] = useState<EscalatedItem[]>([]);
  const [escalatedCount, setEscalatedCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "master_admin" || user?.role === "sub_admin";

  // Fetch escalated complaints for the bell notification
  const fetchEscalated = async () => {
    if (!isAdmin) return;
    try {
      const data = await apiClient.getEscalatedComplaints();
      setEscalatedCount(data?.total ?? 0);
      setEscalatedItems((data?.escalatedComplaints ?? []).slice(0, 5));
    } catch {
      // silently ignore — notification failure shouldn't break the layout
    }
  };

  useEffect(() => {
    fetchEscalated();
    const interval = setInterval(fetchEscalated, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return "text-red-600";
    if (priority >= 4) return "text-amber-600";
    return "text-blue-600";
  };

  const getOverdueLabel = (overdueDays: number, overdueHours: number) => {
    if (overdueDays >= 1) return `${overdueDays}d ${overdueHours % 24}h overdue`;
    return `${overdueHours}h overdue`;
  };

  const menuItems =
    user?.role === "master_admin"
      ? [
          { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
          { icon: FileText, label: "All Complaints", path: "/dashboard/complaints" },
          { icon: Shield, label: "Verify Complaint", path: "/dashboard/verify-complaint" },
          { icon: AlertTriangle, label: "Escalated Complaints", path: "/dashboard/escalated" },
          { icon: Users, label: "Users", path: "/dashboard/users" },
          { icon: Users, label: "Sub-Admins", path: "/dashboard/sub-admins" },
          { icon: Building2, label: "Departments", path: "/dashboard/departments" },
          { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
          { icon: MessageCircle, label: "Feedbacks", path: "/dashboard/feedback" },
          { icon: UserCheck2, label: "User Requests", path: "/dashboard/requests" },
        ]
      : user?.role === "sub_admin"
      ? [
          { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
          { icon: FileText, label: "Department Complaints", path: "/dashboard/complaints" },
          { icon: AlertTriangle, label: "Escalated Complaints", path: "/dashboard/escalated" },
          { icon: MessageCircle, label: "Feedbacks", path: "/dashboard/feedback" }
        ]
      : [
          { icon: FileText, label: "File Complaint", path: "/dashboard/file-complaint" },
          { icon: MessageCircle, label: "My Complaints", path: "/dashboard/my-complaints" },
        ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen transition-all duration-300 bg-sidebar border-r border-sidebar-border",
          sidebarOpen ? "w-64" : "w-0 -translate-x-full md:w-16 md:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-sidebar-foreground">CMS Portal</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const isEscalated = item.path === "/dashboard/escalated";
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    !sidebarOpen && "justify-center",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                    isEscalated && escalatedCount > 0 && "text-red-600 hover:text-red-600"
                  )}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0",
                      isEscalated && escalatedCount > 0 && "text-red-500"
                    )}
                  />
                  {sidebarOpen && (
                    <span className="flex-1 text-left">{item.label}</span>
                  )}
                  {sidebarOpen && isEscalated && escalatedCount > 0 && (
                    <span className="ml-auto min-w-[1.25rem] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white leading-none">
                      {escalatedCount > 99 ? "99+" : escalatedCount}
                    </span>
                  )}
                </Button>
              );
            })}
          </nav>

          <Separator className="bg-sidebar-border" />

          {/* User Profile */}
          <div className="p-4 space-y-2">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent",
                !sidebarOpen && "justify-center"
              )}
              onClick={toggleDarkMode}
            >
              {darkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
              {sidebarOpen && <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>}
            </Button>

            {sidebarOpen && (
              <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent p-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-sidebar-accent-foreground/70 capitalize">
                    {user?.role.replace("_", " ")}
                  </p>
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive",
                !sidebarOpen && "justify-center"
              )}
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              {sidebarOpen && <span>Logout</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn("flex-1 transition-all duration-300", sidebarOpen ? "md:ml-64" : "md:ml-16")}>
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 border-b bg-card px-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="flex items-center gap-4">
            {/* Notification Bell — only for admins */}
            {isAdmin && (
              <div className="relative" ref={notifRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {escalatedCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] rounded-full bg-red-500 px-1 py-0.5 text-center text-[10px] font-bold text-white leading-none">
                      {escalatedCount > 99 ? "99+" : escalatedCount}
                    </span>
                  )}
                </Button>

                {/* Notification Dropdown */}
                {notifOpen && (
                  <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border bg-card shadow-xl">
                    {/* Dropdown header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="font-semibold text-sm">Escalated Complaints</span>
                        {escalatedCount > 0 && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            {escalatedCount}
                          </Badge>
                        )}
                      </div>
                      <button
                        onClick={() => setNotifOpen(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Notification list */}
                    <div className="max-h-72 overflow-y-auto divide-y">
                      {escalatedItems.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                          No escalated complaints
                        </div>
                      ) : (
                        escalatedItems.map((item) => {
                          const deptName =
                            typeof item.department === "object"
                              ? item.department?.name
                              : item.department ?? "—";
                          return (
                            <div
                              key={item._id}
                              className="px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => {
                                setNotifOpen(false);
                                navigate("/dashboard/escalated");
                              }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-mono text-muted-foreground">
                                    {item.complaintId}
                                  </p>
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {item.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{deptName}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <span className={cn("text-xs font-semibold", getPriorityColor(item.priority))}>
                                    P{item.priority}
                                  </span>
                                  <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-medium whitespace-nowrap">
                                    <Clock className="h-3 w-3" />
                                    {getOverdueLabel(item.overdueDays, item.overdueHours)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t px-4 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-primary hover:text-primary"
                        onClick={() => {
                          setNotifOpen(false);
                          navigate("/dashboard/escalated");
                        }}
                      >
                        View all escalated complaints →
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>

      {/* Chatbot */}
      <Chatbot />
    </div>
  );
};
