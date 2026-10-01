import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users as UsersIcon, Search, ShieldCheck, ShieldAlert, Loader2, Ban, UserCheck, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { toast } from "sonner";
import { DataService } from "@/lib/dataService";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: "master_admin" | "sub_admin" | "user";
  isActive: boolean;
  isVerified: boolean;
  department?: string | { name: string };
  createdAt: string;
}

const ITEMS_PER_PAGE = 10;

export const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionType, setActionType] = useState<"restrict" | "unrestrict">("restrict");
  const [actionLoading, setActionLoading] = useState(false);

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
    fetchUsers();
  }, [currentPage, debouncedSearch, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (roleFilter !== "all") params.role = roleFilter;
      if (statusFilter !== "all") params.isActive = statusFilter === "active";

      const response = await DataService.getAllUsers(params);
      setUsers(response.users || []);
      
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages || 1);
        setTotalUsers(response.pagination.totalUsers || 0);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load users list");
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (user: UserProfile, type: "restrict" | "unrestrict") => {
    setSelectedUser(user);
    setActionType(type);
    setConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      const newStatus = actionType === "unrestrict";
      
      await DataService.updateUser(selectedUser._id, { isActive: newStatus });
      
      toast.success(
        actionType === "restrict"
          ? `User ${selectedUser.name} restricted successfully`
          : `User ${selectedUser.name} restriction removed successfully`
      );

      // Update in local state
      setUsers(users.map(u => u._id === selectedUser._id ? { ...u, isActive: newStatus } : u));
    } catch (error: any) {
      console.error(`Failed to ${actionType} user:`, error);
      toast.error(error.message || `Failed to perform restriction action`);
    } finally {
      setActionLoading(false);
      setConfirmOpen(false);
      setSelectedUser(null);
    }
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const rangeStart = totalUsers === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalUsers);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">User Management</h2>
        <p className="text-muted-foreground">Manage user accounts and restrict or remove restrictions from them</p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="user">Student / User</SelectItem>
            <SelectItem value="sub_admin">Sub-Admin</SelectItem>
            <SelectItem value="master_admin">Master Admin</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="restricted">Restricted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Count Info */}
      {!loading && (
        <div className="text-sm text-muted-foreground">
          Showing {rangeStart}–{rangeEnd} of {totalUsers} users
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading users list...</span>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UsersIcon className="h-5 w-5" />
              Register list
            </CardTitle>
          </CardHeader>
          <CardContent>
            {users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((item) => {
                    const isSelf = item._id === currentUser?.id;
                    const isMasterAdmin = item.role === "master_admin";

                    return (
                      <TableRow key={item._id} className={isSelf ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium">
                          {item.name} {isSelf && <span className="text-xs text-muted-foreground ml-1">(You)</span>}
                        </TableCell>
                        <TableCell>{item.email}</TableCell>
                        <TableCell className="capitalize">
                          {item.role.replace("_", " ")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.isActive ? "default" : "destructive"}>
                            {item.isActive ? "Active" : "Restricted"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isMasterAdmin ? (
                            <span className="text-xs text-muted-foreground italic">Protected</span>
                          ) : item.isActive ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleActionClick(item, "restrict")}
                              className="gap-1.5"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Restrict user
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleActionClick(item, "unrestrict")}
                              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              Remove restriction
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found matching your filters.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium mx-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {actionType === "restrict" ? (
                <>
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  <span>Confirm Restricting User</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  <span>Confirm Removing Restriction</span>
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "restrict" ? (
                <span>
                  Are you absolutely sure you want to restrict <strong>{selectedUser?.name}</strong> ({selectedUser?.email})?
                  Restricted users cannot log in to the Complaint Management System.
                </span>
              ) : (
                <span>
                  Are you sure you want to remove the restriction from <strong>{selectedUser?.name}</strong> ({selectedUser?.email})?
                  They will be allowed to log in and use the system again.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmAction();
              }}
              disabled={actionLoading}
              className={actionType === "restrict" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-green-600 hover:bg-green-700 text-white"}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : actionType === "restrict" ? (
                "Yes, Restrict User"
              ) : (
                "Yes, Remove Restriction"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
