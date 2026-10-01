import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLocation, useNavigate } from "react-router-dom";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { AllComplaints } from "@/components/dashboard/AllComplaints";
import { SubAdmins } from "@/components/dashboard/SubAdmins";
import { Departments } from "@/components/dashboard/Departments";
import { Analytics } from "@/components/dashboard/Analytics";
import { Settings } from "@/components/dashboard/Settings";
import { DepartmentComplaints } from "@/components/dashboard/DepartmentComplaints";
import { Reports } from "@/components/dashboard/Reports";
import { FileComplaint } from "@/components/dashboard/FileComplaint";
import { MyComplaints } from "@/components/dashboard/MyComplaints";
import { VerifyComplaint } from "@/components/dashboard/VerifyComplaint";
import AccountRequests from "@/components/dashboard/UserRequest";
import { EscalatedComplaints } from "@/components/dashboard/EscalatedComplaints";
import { Users } from "@/components/dashboard/Users";
import { Feedbacks } from "@/components/dashboard/Feedbacks";

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active section from route
  const getActiveSection = () => {
    const path = location.pathname;
    if (path.includes("/verify-complaint")) return "verify-complaint";
    if (path.includes("/users")) return "users";
    if (path.includes("/feedback")) return "feedback";
    if (path.includes("/escalated")) return "escalated";
    if (path.includes("/complaints")) return "complaints";
    if (path.includes("/sub-admins")) return "sub-admins";
    if (path.includes("/departments")) return "departments";
    if (path.includes("/analytics")) return "analytics";
    if (path.includes("/settings")) return "settings";
    if (path.includes("/reports")) return "reports";
    if (path.includes("/file-complaint")) return "file";
    if (path.includes("/my-complaints")) return "my-complaints";
    if (path.includes("/request")) return "request";
    return user.role === 'user'? "my-complaints" :  "overview";
  };

  const activeSection = getActiveSection();

  // Master Admin View
  if (user?.role === "master_admin") {
    return (
      <DashboardLayout>
        {activeSection === "overview" && <DashboardOverview />}
        {activeSection === "complaints" && <AllComplaints />}
        {activeSection === "verify-complaint" && <VerifyComplaint />}
        {activeSection === "sub-admins" && <SubAdmins />}
        {activeSection === "users" && <Users />}
        {activeSection === "feedback" && <Feedbacks />}
        {activeSection === "departments" && <Departments />}
        {activeSection === "analytics" && <Analytics />}
        {activeSection === "settings" && <Settings />}
        {activeSection === "request" && <AccountRequests />}
        {activeSection === "escalated" && <EscalatedComplaints />}
      </DashboardLayout>
    );
  }

  // Sub-Admin View
  if (user?.role === "sub_admin") {
    return (
      <DashboardLayout>
        {activeSection === "overview" && <DashboardOverview />}
        {activeSection === "complaints" && <DepartmentComplaints />}
        {activeSection === "feedback" && <Feedbacks />}
        {activeSection === "reports" && <Reports />}
        {activeSection === "escalated" && <EscalatedComplaints />}
      </DashboardLayout>
    );
  }

  // User View
  return (
    <DashboardLayout>
      {activeSection === "file" && <FileComplaint />}
      {activeSection === "my-complaints" && <MyComplaints />}
    </DashboardLayout>
  );
};

export default Dashboard;
