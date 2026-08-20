import { useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import ChatPanel from "../shared/ChatPanel";
import TodoPanel from "../shared/TodoPanel";
import UploadForm from "../shared/UploadForm";
import MyUploadsPanel from "./MyUploadsPanel";

const NAV = [
  { key: "chat", label: "AI Assistant" },
  { key: "material", label: "Upload Material" },
  { key: "pyqs", label: "Upload PYQ" },
  { key: "assignments", label: "Post Assignment" },
  { key: "announcements", label: "Post Announcement" },
  { key: "uploads", label: "My Uploads" },
  { key: "todo", label: "To-Do" },
];

export default function TeacherDashboard() {
  const [active, setActive] = useState("chat");

  return (
    <DashboardLayout title={NAV.find((n) => n.key === active).label} navItems={NAV} activeKey={active} onNavClick={setActive}>
      {active === "chat" && <ChatPanel endpoint="/teacher/chat" placeholder="Ask anything..." />}

      {active === "material" && (
        <UploadForm
          endpoint="/teacher/study-material"
          fields={[
            { key: "title", label: "Title", required: true },
            { key: "subject", label: "Subject", required: true },
            { key: "branch", label: "Branch" },
            { key: "semester", label: "Semester", type: "number" },
            { key: "type", label: "Type (notes / lab_manual / other)" },
          ]}
          fileRequired
          submitLabel="Upload Material"
        />
      )}

      {active === "pyqs" && (
        <UploadForm
          endpoint="/teacher/pyqs"
          fields={[
            { key: "subject", label: "Subject", required: true },
            { key: "branch", label: "Branch" },
            { key: "semester", label: "Semester", type: "number" },
            { key: "year", label: "Exam year", type: "number", required: true },
            { key: "examType", label: "Type (mid / end / other)" },
          ]}
          fileRequired
          submitLabel="Upload PYQ"
        />
      )}

      {active === "assignments" && (
        <UploadForm
          endpoint="/teacher/assignments"
          fields={[
            { key: "title", label: "Title", required: true },
            { key: "description", label: "Description" },
            { key: "branch", label: "Branch", required: true },
            { key: "semester", label: "Semester", type: "number", required: true },
            { key: "subject", label: "Subject", required: true },
            { key: "dueDate", label: "Due date", type: "date" },
          ]}
          submitLabel="Post Assignment"
        />
      )}

      {active === "announcements" && (
        <UploadForm
          endpoint="/teacher/announcements"
          fields={[
            { key: "title", label: "Title", required: true },
            { key: "body", label: "Body" },
            { key: "audience", label: "Audience (all / students / teachers)" },
          ]}
          submitLabel="Post Announcement"
        />
      )}

      {active === "uploads" && <MyUploadsPanel />}

      {active === "todo" && <TodoPanel endpoint="/teacher/todos" />}
    </DashboardLayout>
  );
}
