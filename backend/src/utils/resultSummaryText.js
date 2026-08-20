// Single source of truth for the summary text we embed into Pinecone for a
// result record. Used at extraction time, on manual admin edits, and (for
// reference) when reasoning about what the semantic index contains.
// Keeping this in one place avoids the extraction/update paths drifting out
// of sync with each other, which previously caused edited records to show
// stale data in natural-language search results.
export const buildResultSummaryText = ({
  rollNumber,
  studentName,
  branch,
  semester,
  sgpa,
  cgpa,
  status,
  subjects,
  reappearSubjects,
}) => {
  const subjectsText = (subjects || []).map((s) => `${s.name} (${s.grade})`).join(", ");
  return `Roll ${rollNumber}, ${studentName || ""}, Branch ${branch}, Semester ${semester}, SGPA ${sgpa}, CGPA ${cgpa}, Status ${status}, Reappear ${reappearSubjects || "N/A"}. Subjects: ${subjectsText}`;
};
