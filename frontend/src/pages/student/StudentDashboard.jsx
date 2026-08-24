import { useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import ChatPanel from "../shared/ChatPanel";
import TodoPanel from "../shared/TodoPanel";
import FilterListPanel from "../shared/FilterListPanel";
import MyResultsPanel from "./MyResultsPanel";
import PYQsPanel from "./PYQsPanel";
import BookmarksPanel from "./BookmarksPanel";
import BookmarkButton from "../../components/BookmarkButton";
import {
  MessageSquareText,
  GraduationCap,
  FileQuestion,
  Library,
  ClipboardList,
  Megaphone,
  Bell,
  Bookmark,
  CheckSquare,
} from "lucide-react";

const NAV = [
  { key: "chat", label: "AI Assistant", icon: MessageSquareText },
  { key: "results", label: "My Results", icon: GraduationCap },
  { key: "pyqs", label: "Search PYQs", icon: FileQuestion },
  { key: "study", label: "Study Resources", icon: Library },
  { key: "assignments", label: "Assignments", icon: ClipboardList },
  { key: "announcements", label: "Announcements", icon: Megaphone },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "bookmarks", label: "Bookmarks", icon: Bookmark },
  { key: "todo", label: "To-Do", icon: CheckSquare },
];

export default function StudentDashboard() {
  const [active, setActive] = useState("chat");
  const [chatPrefill, setChatPrefill] = useState("");

  const askAI = (questionText) => {
    setChatPrefill(questionText);
    setActive("chat");
  };

  return (
    <DashboardLayout title={NAV.find((n) => n.key === active).label} navItems={NAV} activeKey={active} onNavClick={setActive}>
      {active === "chat" && (
        <ChatPanel
          endpoint="/student/chat"
          placeholder="Ask about your results, policies, or announcements..."
          prefillMessage={chatPrefill}
          onPrefillConsumed={() => setChatPrefill("")}
        />
      )}

      {active === "results" && <MyResultsPanel />}

      {active === "pyqs" && <PYQsPanel onAskAI={askAI} />}

      {active === "study" && (
        <FilterListPanel
          endpoint="/student/study-material"
          method="get"
          fields={[
            { key: "subject", label: "Subject" },
            { key: "branch", label: "Branch" },
            { key: "semester", label: "Semester", type: "number" },
          ]}
          renderRow={(m) => (
            <tr key={m._id} className="border-b border-slate/10">
              <td className="py-2">{m.title}</td>
              <td>{m.type}</td>
              <td>{m.subject}</td>
              <td>
                <a href={m.fileUrl} target="_blank" rel="noreferrer" className="text-link hover:underline transition-colors">
                  View
                </a>
              </td>
              <td>
                <BookmarkButton itemType="study_material" itemId={m._id} />
              </td>
            </tr>
          )}
          headers={["Title", "Type", "Subject", "File", "Save"]}
          responseKey="items"
          autoLoad
        />
      )}

      {active === "assignments" && (
        <FilterListPanel
          endpoint="/student/assignments"
          method="get"
          fields={[{ key: "subject", label: "Subject" }, { key: "semester", label: "Semester", type: "number" }]}
          renderRow={(a) => (
            <tr key={a._id} className="border-b border-slate/10">
              <td className="py-2">{a.title}</td>
              <td>{a.subject}</td>
              <td>{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "-"}</td>
              <td>
                {a.attachmentUrl && (
                  <a href={a.attachmentUrl} target="_blank" rel="noreferrer" className="text-link hover:underline transition-colors">
                    Attachment
                  </a>
                )}
              </td>
            </tr>
          )}
          headers={["Title", "Subject", "Due", "File"]}
          responseKey="assignments"
          autoLoad
        />
      )}

      {active === "announcements" && (
        <FilterListPanel
          endpoint="/student/announcements"
          method="get"
          fields={[]}
          renderRow={(a) => (
            <tr key={a._id} className="border-b border-slate/10">
              <td className="py-2 font-medium">{a.title}</td>
              <td>{a.body}</td>
              <td>
                {a.fileUrl && (
                  <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-link hover:underline transition-colors">
                    View PDF
                  </a>
                )}
              </td>
              <td>{new Date(a.createdAt).toLocaleDateString()}</td>
              <td>
                <BookmarkButton itemType="announcement" itemId={a._id} />
              </td>
            </tr>
          )}
          headers={["Title", "Body", "File", "Posted", "Save"]}
          responseKey={null}
          autoLoad
        />
      )}

      {active === "notifications" && (
        <FilterListPanel
          endpoint="/student/notifications"
          method="get"
          fields={[{ key: "category", label: "Category" }]}
          renderRow={(n) => (
            <tr key={n._id} className="border-b border-slate/10">
              <td className="py-2 font-medium">{n.title}</td>
              <td>{n.category}</td>
              <td>
                {n.fileUrl && (
                  <a href={n.fileUrl} target="_blank" rel="noreferrer" className="text-link hover:underline transition-colors">
                    View PDF
                  </a>
                )}
              </td>
              <td>{new Date(n.createdAt).toLocaleDateString()}</td>
              <td>
                <BookmarkButton itemType="notification" itemId={n._id} />
              </td>
            </tr>
          )}
          headers={["Title", "Category", "File", "Posted", "Save"]}
          responseKey={null}
          autoLoad
        />
      )}

      {active === "bookmarks" && <BookmarksPanel />}

      {active === "todo" && <TodoPanel endpoint="/student/todos" />}
    </DashboardLayout>
  );
}
