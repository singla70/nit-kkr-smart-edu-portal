import { useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import TeacherManagement from "./TeacherManagement";
import ResultUploadPanel from "./ResultUploadPanel";
import PendingResultsPanel from "./PendingResultsPanel";
import ResultsManagementPanel from "./ResultsManagementPanel";
import NotificationsPanel from "./NotificationsPanel";
import AnnouncementsPanel from "./AnnouncementsPanel";
import StudentsPanel from "./StudentsPanel";
import AnalyticsPanel from "./AnalyticsPanel";
import {
  BarChart3,
  UserCog,
  GraduationCap,
  UploadCloud,
  ClipboardCheck,
  Database,
  Bell,
  Megaphone,
} from "lucide-react";

const NAV = [
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "teachers", label: "Teacher Management", icon: UserCog },
  { key: "students", label: "Student Management", icon: GraduationCap },
  { key: "resultsUpload", label: "Results Upload", icon: UploadCloud },
  { key: "resultsPending", label: "Pending Verification", icon: ClipboardCheck },
  { key: "resultsManage", label: "Results Management", icon: Database },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "announcements", label: "Announcements", icon: Megaphone },
];

export default function AdminDashboard() {
  const [active, setActive] = useState("analytics");

  return (
    <DashboardLayout title={NAV.find((n) => n.key === active).label} navItems={NAV} activeKey={active} onNavClick={setActive}>
      {active === "analytics" && <AnalyticsPanel />}
      {active === "teachers" && <TeacherManagement />}
      {active === "students" && <StudentsPanel />}
      {active === "resultsUpload" && <ResultUploadPanel />}
      {active === "resultsPending" && <PendingResultsPanel />}
      {active === "resultsManage" && <ResultsManagementPanel />}
      {active === "notifications" && <NotificationsPanel />}
      {active === "announcements" && <AnnouncementsPanel />}
    </DashboardLayout>
  );
}
