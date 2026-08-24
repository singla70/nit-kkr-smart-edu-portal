import { useState, useEffect } from "react";
import client from "../../api/client";
import Switch from "../../components/Switch";
import { FolderOpen, ExternalLink } from "lucide-react";

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
            <div className="flex flex-col items-center text-center py-8 text-slate">
              <FolderOpen size={24} className="mb-2 opacity-40" />
              <p className="text-sm">Nothing uploaded yet.</p>
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {data[s.key].map((item) => (
                <li key={item._id} className="flex items-center justify-between border-b border-slate/10 pb-2.5 gap-3">
                  <span className={item.isVisible === false ? "text-slate line-through" : "text-ink"}>
                    {item.title || item.subject}
                  </span>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-slate text-xs">{new Date(item.createdAt).toLocaleDateString()}</span>
                    {(item.fileUrl || item.attachmentUrl) && (
                      <a
                        href={item.fileUrl || item.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-link text-xs hover:underline transition-colors"
                      >
                        View <ExternalLink size={12} />
                      </a>
                    )}
                    <Switch
                      checked={item.isVisible !== false}
                      onChange={() => toggleVisibility(s.endpoint, item._id, item.isVisible !== false)}
                      label={item.isVisible === false ? "Hidden" : "Visible"}
                    />
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
