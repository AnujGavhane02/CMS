import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FileUp, Send, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export const FileComplaint = () => {
  const [anonymous, setAnonymous] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const { user } = useAuth();

  const selectedDepartment = departments.find((d) => (d._id || d.id) === departmentId);
  // Use department's categories, or default to ["General"] so dropdown always shows when dept selected
  const categories = selectedDepartment?.categories?.length
    ? selectedDepartment.categories
    : selectedDepartment
      ? ["General"]
      : [];

  // Load departments on component mount
  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setDepartmentsLoading(true);
      // Fetch departments with categories from departments collection (limit high to get all active)
      const response = await apiClient.getDepartments({ isActive: true, limit: 100 });
      // API returns { departments, pagination } - each dept has categories array from schema
      const list = (response as any)?.departments ?? (response as any)?.data ?? [];
      setDepartments(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Failed to load departments:', error);
      toast.error('Failed to load departments');
      // Fallback to hardcoded departments if API fails
      setDepartments([
        { _id: '1', name: 'IT', description: 'Information Technology', categories: ['Network', 'Software', 'Hardware'] },
        { _id: '2', name: 'Library', description: 'Library Services', categories: ['Books', 'Membership', 'Facilities'] },
        { _id: '3', name: 'Hostel', description: 'Hostel Management', categories: ['Rooms', 'Maintenance', 'Food'] },
        { _id: '4', name: 'Academics', description: 'Academic Affairs', categories: ['Exams', 'Grades', 'Courses'] },
        { _id: '5', name: 'Transport', description: 'Transportation', categories: ['Bus', 'Parking', 'Shuttle'] },
        { _id: '6', name: 'Cafeteria', description: 'Mess & Canteen', categories: ['Food Quality', 'Hygiene', 'Menu'] },
        { _id: '7', name: 'Sports', description: 'Sports & Recreation', categories: ['Equipment', 'Grounds', 'Events'] },
        { _id: '8', name: 'Maintenance', description: 'Maintenance & Facilities', categories: ['Electrical', 'Plumbing', 'General'] }
      ]);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const complaintData = {
        title: title.trim(),
        description: description.trim(),
        department: departmentId,
        category: category.trim() || undefined,
        isAnonymous: anonymous
      };

      // Validate required fields
      if (!complaintData.title || !complaintData.description || !complaintData.department) {
        toast.error("Please fill in all required fields");
        setLoading(false);
        return;
      }
      if (departmentId && categories.length > 0 && !category.trim()) {
        toast.error("Please select a category");
        setLoading(false);
        return;
      }

      console.log('Submitting complaint:', complaintData);
      
      const response = await apiClient.createComplaint(complaintData);
      
      console.log('Response from API:', response);
      
      // Check if response indicates a duplicate/similar complaint
      if ((response as any).isDuplicate) {
        const existingComplaint = (response as any).data.existingComplaint;
        const priorityEscalated = existingComplaint.priorityEscalated;
        
        console.log('Duplicate complaint detected:', existingComplaint);
        
        // Show the main message about existing complaint
        toast.info("Complaint Already Exists", {
          description: "A similar complaint already exists. It will be resolved soon.",
          duration: 8000
        });
        
        // Show additional info about the existing complaint (priority 1-10, urgency label)
        const priorityLabel = existingComplaint.urgency ? existingComplaint.urgency.charAt(0).toUpperCase() + existingComplaint.urgency.slice(1) : "—";
        setTimeout(() => {
          toast.success(`Existing Complaint ID: ${existingComplaint.complaintId}`, {
            description: `Status: ${existingComplaint.status.charAt(0).toUpperCase() + existingComplaint.status.slice(1)} | Priority: ${existingComplaint.priority ?? existingComplaint.newPriority ?? priorityLabel}${priorityEscalated ? " (Escalated)" : ""}`,
            duration: 8000
          });
        }, 1500);
      } else if ((response as any).complaint) {
        // Normal successful response
        toast.success("Complaint Submitted Successfully!", {
          description: `Your complaint has been registered with ID: ${(response as any).complaint.complaintId || 'N/A'}`
        });
      } else {
        // Fallback for unexpected response structure
        toast.success("Complaint Submitted Successfully!");
      }

      // Reset form
      setTitle("");
      setDescription("");
      setAnonymous(false);
      setDepartmentId("");
      setCategory("");
      
    } catch (error) {
      console.error('Complaint submission failed:', error);
      toast.error("Failed to submit complaint. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">File a Complaint</h2>
        <p className="text-muted-foreground">Submit your complaint and we'll address it promptly</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Complaint Details</CardTitle>
          <CardDescription>Please provide clear and detailed information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input 
                id="title" 
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief summary of your complaint" 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide detailed information about your complaint"
                rows={6}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={departmentId}
                  onValueChange={(v) => {
                    setDepartmentId(v);
                    setCategory("");
                  }}
                  required
                  disabled={departmentsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={departmentsLoading ? "Loading departments..." : "Select department"} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept._id || dept.id} value={dept._id || dept.id}>
                        {dept.name} - {dept.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {departmentsLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading departments...
                  </div>
                )}
              </div>

              {departmentId && (
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat: string) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>


            <div className="space-y-2">
              <Label htmlFor="attachments">Attachments (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input id="attachments" type="file" multiple accept="image/*,.pdf" />
                <FileUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">You can upload images or PDF files</p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="anonymous" className="cursor-pointer">Submit Anonymously</Label>
                <p className="text-sm text-muted-foreground">Your identity will be hidden from sub-admins</p>
              </div>
              <Switch id="anonymous" checked={anonymous} onCheckedChange={setAnonymous} />
            </div>

            {anonymous && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
                <AlertCircle className="h-5 w-5 text-info mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-info">Anonymous Submission</p>
                  <p className="text-muted-foreground">Your complaint will be processed anonymously, but master admins can view your identity if needed for resolution.</p>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {loading ? "Submitting..." : "Submit Complaint"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
