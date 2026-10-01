import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Edit, Trash2, Shield, Loader2, Key } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface SubAdmin {
  _id: string;
  name: string;
  email: string;
  department: string | { _id: string; name: string; description: string };
  isActive: boolean;
  stats: {
    totalComplaints: number;
    pendingComplaints: number;
    processingComplaints: number;
    resolvedComplaints: number;
    avgResolutionTime: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Department {
  _id: string;
  name: string;
  description: string;
  hasSubAdmin: boolean;
}

export const SubAdmins = () => {
  const [admins, setAdmins] = useState<SubAdmin[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAdmin, setEditingAdmin] = useState<SubAdmin | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminDepartment, setNewAdminDepartment] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchSubAdmins();
    fetchAvailableDepartments();
  }, []);

  const fetchSubAdmins = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getSubAdmins();
      setAdmins(response.subAdmins || []);
    } catch (error) {
      console.error('Failed to fetch sub-admins:', error);
      toast.error('Failed to load sub-admins');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDepartments = async () => {
    try {
      const response = await apiClient.getAvailableDepartments();
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      toast.error('Failed to load departments');
    }
  };

  const handleAddAdmin = async () => {
    try {
      if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminDepartment) {
        toast.error("Please fill in all required fields");
        return;
      }

      const newSubAdmin = await apiClient.createSubAdmin({
        name: newAdminName.trim(),
        email: newAdminEmail.trim(),
        department: newAdminDepartment
      });

      setAdmins([...admins, newSubAdmin.subAdmin]);
      setCreateDialogOpen(false);
      setNewAdminName("");
      setNewAdminEmail("");
      setNewAdminDepartment("");

      // Refresh departments to update availability
      await fetchAvailableDepartments();

      toast.success("Sub-Admin Created Successfully!", {
        description: `Default password: ${newSubAdmin.defaultPassword}`
      });
    } catch (error) {
      console.error('Failed to create sub-admin:', error);
      toast.error("Failed to create sub-admin. Please try again.");
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    try {
      await apiClient.deleteSubAdmin(id);
      setAdmins(admins.filter(admin => admin._id !== id));
      toast.success("Sub-Admin Deleted Successfully!");

      // Refresh departments to update availability
      await fetchAvailableDepartments();
    } catch (error) {
      console.error('Failed to delete sub-admin:', error);
      toast.error("Failed to delete sub-admin. Please try again.");
    }
  };

  const handleEditClick = (admin: SubAdmin) => {
    setEditingAdmin(admin);
    setEditName(admin.name);
    setEditEmail(admin.email);
    // Use department ID directly (now it's an object with _id)
    setEditDepartment(admin.department._id || admin.department);
    setEditStatus(admin.isActive ? "active" : "inactive");
    setEditDialogOpen(true);
  };

  const handleUpdateAdmin = async () => {
    try {
      if (!editingAdmin) return;

      if (!editName.trim() || !editEmail.trim() || !editDepartment) {
        toast.error("Please fill in all required fields");
        return;
      }

      const updatedSubAdmin = await apiClient.updateSubAdmin(editingAdmin._id, {
        name: editName.trim(),
        email: editEmail.trim(),
        department: editDepartment,
        isActive: editStatus === "active"
      });

      // Get department name from ID for display
      const department = departments.find(dept => dept._id === editDepartment);
      const departmentName = department?.name || editDepartment;

      setAdmins(admins.map(admin =>
        admin._id === editingAdmin._id
          ? {
            ...admin,
            name: editName.trim(),
            email: editEmail.trim(),
            department: departmentName,
            isActive: editStatus === "active"
          }
          : admin
      ));

      setEditDialogOpen(false);
      setEditingAdmin(null);
      setEditName("");
      setEditEmail("");
      setEditDepartment("");
      setEditStatus("");

      // Refresh departments to update availability
      await fetchAvailableDepartments();

      toast.success("Sub-Admin Updated Successfully!");
    } catch (error) {
      console.error('Failed to update sub-admin:', error);
      toast.error("Failed to update sub-admin. Please try again.");
    }
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingAdmin(null);
    setEditName("");
    setEditEmail("");
    setEditDepartment("");
    setEditStatus("");
  };

  const handleCancelCreate = () => {
    setCreateDialogOpen(false);
    setNewAdminName("");
    setNewAdminEmail("");
    setNewAdminDepartment("");
  };

  const handleResetPassword = async (id: string) => {
    try {
      const result = await apiClient.resetSubAdminPassword(id);
      toast.success("Password Reset Successfully!", {
        description: `New password: ${result.newPassword}`
      });
    } catch (error) {
      console.error('Failed to reset password:', error);
      toast.error("Failed to reset password. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Sub-Admin Management</h2>
          <p className="text-muted-foreground">Add, edit, and manage department sub-administrators</p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Sub-Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Sub-Admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@institute.edu"
                />
              </div>
              <div>
                <Label htmlFor="department">Assign Department</Label>
                <Select value={newAdminDepartment} onValueChange={setNewAdminDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments
                      .filter(dept => !dept.hasSubAdmin)
                      .map((dept) => (
                        <SelectItem key={dept._id} value={dept._id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddAdmin} className="flex-1">Create Sub-Admin</Button>
                <Button variant="outline" onClick={handleCancelCreate} className="flex-1">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading sub-admins...</span>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Current Sub-Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            {admins.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin._id}>
                      <TableCell className="font-medium">{admin.name}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>{admin.department?.name || admin.department}</TableCell>
                      <TableCell>
                        <Badge variant={admin.isActive ? "default" : "secondary"}>
                          {admin.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(admin)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetPassword(admin._id)}
                            title="Reset Password"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAdmin(admin._id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sub-admins found. Create your first sub-admin to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sub-Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter full name"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="admin@institute.edu"
              />
            </div>
            <div>
              <Label htmlFor="edit-department">Assign Department</Label>
              <Select value={editDepartment} onValueChange={setEditDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem
                      key={dept._id}
                      value={dept._id}
                      disabled={dept.hasSubAdmin && dept._id !== editDepartment}
                    >
                      {dept.name} {dept.hasSubAdmin && dept._id !== editDepartment ? "(Assigned)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdateAdmin} className="flex-1">Update</Button>
              <Button variant="outline" onClick={handleCancelEdit} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
