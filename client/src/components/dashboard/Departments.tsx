import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Users, FileText, Edit, Trash2, Plus, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface Department {
  _id: string;
  name: string;
  description: string;
  categories?: string[];
  isActive: boolean;
  subAdmins: Array<{ _id: string; name: string; email: string }>;
  stats: {
    totalComplaints: number;
    pendingComplaints: number;
    resolvedComplaints: number;
    avgResolutionTime: number;
  };
  createdAt: string;
  updatedAt: string;
}

export const Departments = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editCategoryInput, setEditCategoryInput] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDescription, setNewDeptDescription] = useState("");
  const [newDeptCategories, setNewDeptCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getDepartments();
      const list = response?.departments ?? response?.data ?? [];
      setDepartments(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepartment = async () => {
    try {
      if (!newDeptName.trim() || !newDeptDescription.trim()) {
        toast.error("Please fill in all required fields");
        return;
      }

      const result = await apiClient.createDepartment({
        name: newDeptName.trim(),
        description: newDeptDescription.trim(),
        categories: newDeptCategories
      });
      const newDept = result?.department ?? result;
      const fullDept = {
        ...newDept,
        subAdmins: newDept?.subAdmins ?? [],
        stats: newDept?.stats ?? { totalComplaints: 0, pendingComplaints: 0, resolvedComplaints: 0, avgResolutionTime: 0 }
      };
      setDepartments([...departments, fullDept]);
      setCreateDialogOpen(false);
      setNewDeptName("");
      setNewDeptDescription("");
      setNewDeptCategories([]);
      setNewCategoryInput("");
      
      toast.success("Department Created Successfully!");
    } catch (error) {
      console.error('Failed to create department:', error);
      toast.error("Failed to create department. Please try again.");
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    try {
      await apiClient.deleteDepartment(id);
      setDepartments(departments.filter(dept => dept._id !== id));
      toast.success("Department Deleted Successfully!");
    } catch (error) {
      console.error('Failed to delete department:', error);
      toast.error("Failed to delete department. Please try again.");
    }
  };

  const handleEditClick = (dept: Department) => {
    setEditingDept(dept);
    setEditName(dept.name);
    setEditDescription(dept.description);
    setEditCategories(dept.categories || []);
    setEditCategoryInput("");
    setEditDialogOpen(true);
  };

  const handleUpdateDepartment = async () => {
    try {
      if (!editingDept) return;

      if (!editName.trim() || !editDescription.trim()) {
        toast.error("Please fill in all required fields");
        return;
      }

      const updatedDepartment = await apiClient.updateDepartment(editingDept._id, {
        name: editName.trim(),
        description: editDescription.trim(),
        categories: editCategories
      });

      setDepartments(departments.map(dept => 
        dept._id === editingDept._id 
          ? { ...dept, name: editName.trim(), description: editDescription.trim(), categories: editCategories }
          : dept
      ));
      
      setEditDialogOpen(false);
      setEditingDept(null);
      setEditName("");
      setEditDescription("");
      setEditCategories([]);
      
      toast.success("Department Updated Successfully!");
    } catch (error) {
      console.error('Failed to update department:', error);
      toast.error("Failed to update department. Please try again.");
    }
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingDept(null);
    setEditName("");
    setEditDescription("");
    setEditCategories([]);
    setEditCategoryInput("");
  };

  const handleCancelCreate = () => {
    setCreateDialogOpen(false);
    setNewDeptName("");
    setNewDeptDescription("");
    setNewDeptCategories([]);
    setNewCategoryInput("");
  };

  const addNewCategory = () => {
    const val = newCategoryInput.trim();
    if (val && !newDeptCategories.includes(val)) {
      setNewDeptCategories([...newDeptCategories, val]);
      setNewCategoryInput("");
    }
  };

  const removeNewCategory = (cat: string) => {
    setNewDeptCategories(newDeptCategories.filter(c => c !== cat));
  };

  const addEditCategory = () => {
    const val = editCategoryInput.trim();
    if (val && !editCategories.includes(val)) {
      setEditCategories([...editCategories, val]);
      setEditCategoryInput("");
    }
  };

  const removeEditCategory = (cat: string) => {
    setEditCategories(editCategories.filter(c => c !== cat));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Department Management</h2>
          <p className="text-muted-foreground">Create, edit, and manage institute departments</p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Department</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="dept-name">Department Name</Label>
                <Input 
                  id="dept-name" 
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="e.g., Sports & Athletics" 
                />
              </div>
              <div>
                <Label htmlFor="dept-desc">Description</Label>
                <Textarea 
                  id="dept-desc" 
                  value={newDeptDescription}
                  onChange={(e) => setNewDeptDescription(e.target.value)}
                  placeholder="Brief description of department" 
                />
              </div>
              <div>
                <Label>Categories (for complaints under this department)</Label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    placeholder="e.g., Network, Software, Hardware"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNewCategory())}
                  />
                  <Button type="button" variant="outline" onClick={addNewCategory}>Add</Button>
                </div>
                {newDeptCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newDeptCategories.map((cat) => (
                      <Badge key={cat} variant="secondary" className="flex items-center gap-1">
                        {cat}
                        <button type="button" onClick={() => removeNewCategory(cat)} className="hover:bg-muted rounded p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddDepartment} className="flex-1">Create Department</Button>
                <Button variant="outline" onClick={handleCancelCreate} className="flex-1">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading departments...</span>
        </div>
      ) : departments.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <Card key={dept._id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{dept.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">{dept.description}</CardDescription>
                    </div>
                  </div>
                  {!dept.isActive && (
                    <Badge variant="destructive" className="text-xs">Inactive</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Sub-Admins
                    </span>
                    <Badge variant="secondary">{dept.subAdmins?.length ?? 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Total Complaints
                    </span>
                    <Badge variant="secondary">{dept.stats?.totalComplaints ?? 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Pending
                    </span>
                    <Badge variant="destructive">{dept.stats?.pendingComplaints ?? 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Resolved
                    </span>
                    <Badge variant="default">{dept.stats?.resolvedComplaints ?? 0}</Badge>
                  </div>
                  {dept.categories && dept.categories.length > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Categories: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dept.categories.map((cat) => (
                          <Badge key={cat} variant="outline" className="text-xs font-normal">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleEditClick(dept)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleDeleteDepartment(dept._id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No departments found. Create your first department to get started.</p>
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-dept-name">Department Name</Label>
              <Input 
                id="edit-dept-name" 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g., Sports & Athletics" 
              />
            </div>
            <div>
              <Label htmlFor="edit-dept-desc">Description</Label>
              <Textarea 
                id="edit-dept-desc" 
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Brief description of department" 
              />
            </div>
            <div>
              <Label>Categories (for complaints under this department)</Label>
              <div className="flex gap-2 mt-1">
                <Input 
                  value={editCategoryInput}
                  onChange={(e) => setEditCategoryInput(e.target.value)}
                  placeholder="e.g., Network, Software, Hardware"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEditCategory())}
                />
                <Button type="button" variant="outline" onClick={addEditCategory}>Add</Button>
              </div>
              {editCategories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editCategories.map((cat) => (
                    <Badge key={cat} variant="secondary" className="flex items-center gap-1">
                      {cat}
                      <button type="button" onClick={() => removeEditCategory(cat)} className="hover:bg-muted rounded p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdateDepartment} className="flex-1">Update</Button>
              <Button variant="outline" onClick={handleCancelEdit} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
