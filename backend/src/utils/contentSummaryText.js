// Single source of truth for the text we embed into the unified content
// index for each non-result content type. Mirrors utils/resultSummaryText.js.
// Keeping this in one place avoids the create/update paths drifting out of
// sync with each other, which previously caused edited records to show
// stale data in natural-language search results.

export const buildNotificationSummaryText = ({ title, category, content }) => {
  return `Notification: ${title}. Category: ${category || "general"}. ${content || ""}`.trim();
};

export const buildAnnouncementSummaryText = ({ title, body, audience }) => {
  return `Announcement: ${title}. Audience: ${audience || "all"}. ${body || ""}`.trim();
};

export const buildAssignmentSummaryText = ({ title, description, branch, semester, subject, dueDate }) => {
  const due = dueDate ? new Date(dueDate).toDateString() : "no due date set";
  return `Assignment: ${title}. Subject: ${subject || "N/A"}. Branch: ${branch || "N/A"}, Semester: ${
    semester ?? "N/A"
  }. Due: ${due}. ${description || ""}`.trim();
};

export const buildPYQSummaryText = ({ subject, branch, semester, year, examType }) => {
  return `Previous year question paper. Subject: ${subject}. Branch: ${branch || "N/A"}, Semester: ${
    semester ?? "N/A"
  }. Year: ${year}. Exam type: ${examType || "end"}.`.trim();
};

export const buildStudyMaterialSummaryText = ({ title, type, subject, branch, semester }) => {
  return `Study material: ${title}. Type: ${type || "notes"}. Subject: ${subject || "N/A"}. Branch: ${
    branch || "N/A"
  }, Semester: ${semester ?? "N/A"}.`.trim();
};