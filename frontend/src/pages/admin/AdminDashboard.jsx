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

const NAV = [
  { key: "analytics", label: "Analytics" },
  { key: "teachers", label: "Teacher Management" },
  { key: "students", label: "Student Management" },
  { key: "resultsUpload", label: "Results Upload" },
  { key: "resultsPending", label: "Pending Verification" },
  { key: "resultsManage", label: "Results Management" },
  { key: "notifications", label: "Notifications" },
  { key: "announcements", label: "Announcements" },
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
