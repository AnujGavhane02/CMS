import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Settings2, Bell, Shield, Database, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const Settings = () => {
  const [anonymousEnabled, setAnonymousEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoAssignment, setAutoAssignment] = useState(false);

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your system settings have been updated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">System Settings</h2>
        <p className="text-muted-foreground">Configure system-wide preferences and policies</p>
      </div>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Feature Controls
          </CardTitle>
          <CardDescription>Enable or disable system features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Anonymous Complaints</Label>
              <p className="text-sm text-muted-foreground">Allow users to submit complaints anonymously</p>
            </div>
            <Switch checked={anonymousEnabled} onCheckedChange={setAnonymousEnabled} />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Assignment</Label>
              <p className="text-sm text-muted-foreground">Automatically assign complaints to sub-admins</p>
            </div>
            <Switch checked={autoAssignment} onCheckedChange={setAutoAssignment} />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>Configure notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Send email alerts for new complaints</p>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="admin-email">Admin Email</Label>
            <Input id="admin-email" type="email" placeholder="admin@institute.edu" defaultValue="admin@institute.edu" />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Privacy
          </CardTitle>
          <CardDescription>Manage security settings and data policies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
            <Input id="session-timeout" type="number" defaultValue="30" />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="data-retention">Data Retention Period (days)</Label>
            <Input id="data-retention" type="number" defaultValue="365" />
            <p className="text-xs text-muted-foreground">Resolved complaints will be archived after this period</p>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version:</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Users:</span>
            <span className="font-medium">1,234</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Database Size:</span>
            <span className="font-medium">245 MB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Backup:</span>
            <span className="font-medium">2 hours ago</span>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">
        Save All Settings
      </Button>
    </div>
  );
};
