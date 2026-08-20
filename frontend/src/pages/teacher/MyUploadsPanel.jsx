import { useState, useEffect } from "react";
import client from "../../api/client";

const SECTIONS = [
  { key: "studyMaterial", label: "Study Material", endpoint: "study-material" },
  { key: "assignments", label: "Assignments", endpoint: "assignments" },
  { key: "announcements", label: "Announcements", endpoint: "announcements" },
  { key: "pyqs", label: "PYQs", endpoint: "pyqs" },
];

export default function MyUploadsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    client.get("/teacher/my-uploads").then((res) => {
      setData(res.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const toggleVisibility = async (endpoint, id, currentlyVisible) => {
    await client.patch(`/teacher/${endpoint}/${id}/visibility`, { isVisible: !currentlyVisible });
    load();
  };

  if (loading) return <p className="text-slate text-sm">Loading...</p>;

  return (
    <div className="space-y-8">
      {SECTIONS.map((s) => (
        <div key={s.key} className="bg-surface border border-slate/10 rounded-sm p-6 animate-fade-in">
          <h3 className="font-display text-lg text-ink mb-1">{s.label}</h3>
          <p className="ledger-rule mb-4" />
          {data[s.key].length === 0 ? (
            <p className="text-slate text-sm">Nothing uploaded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data[s.key].map((item) => (
                <li key={item._id} className="flex items-center justify-between border-b border-slate/10 pb-2 gap-3">
                  <span className={item.isVisible === false ? "text-slate line-through" : ""}>
                    {item.title || item.subject}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate text-xs">{new Date(item.createdAt).toLocaleDateString()}</span>
                    {(item.fileUrl || item.attachmentUrl) && (
                      <a
                        href={item.fileUrl || item.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-link text-xs hover:underline transition-colors"
                      >
                        View
                      </a>
                    )}
                    <button
                      onClick={() => toggleVisibility(s.endpoint, item._id, item.isVisible !== false)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        item.isVisible === false
                          ? "bg-sage/10 text-sage hover:bg-sage/20"
                          : "bg-slate/10 text-slate hover:bg-slate/20"
                      }`}
                    >
                      {item.isVisible === false ? "Show" : "Hide"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
