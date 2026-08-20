import { useState, useEffect } from "react";
import client from "../../api/client";
import BookmarkButton from "../../components/BookmarkButton";

/**
 * PYQ search + per-question "Ask AI". Clicking a question hands it off to
 * onAskAI (StudentDashboard switches to the Chat tab with it pre-filled -
 * the student can add context before sending, nothing is auto-sent here).
 */
export default function PYQsPanel({ onAskAI }) {
  const [filters, setFilters] = useState({ subject: "", branch: "", semester: "", year: "" });
  const [pyqs, setPyqs] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const { data } = await client.get("/student/pyqs", { params });
      setPyqs(data.pyqs);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-surface border border-slate/10 rounded-sm p-6 transition-shadow hover:shadow-md">
      <form onSubmit={search} className="grid grid-cols-4 gap-3 mb-4">
        {["subject", "branch", "semester", "year"].map((key) => (
          <input
            key={key}
            type={key === "semester" || key === "year" ? "number" : "text"}
            placeholder={key[0].toUpperCase() + key.slice(1)}
            value={filters[key]}
            onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
            className="px-3 py-2 border border-slate/20 rounded text-sm bg-surface text-ink"
          />
        ))}
        <button type="submit" disabled={loading} className="col-span-full sm:col-span-1 bg-indigo text-cream px-4 py-2 rounded text-sm font-medium disabled:opacity-50 w-fit">
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p className="text-rust text-sm mb-4 bg-rust/10 px-3 py-2 rounded">{error}</p>}

      {pyqs === null ? (
        <p className="text-slate text-sm">Loading...</p>
      ) : pyqs.length === 0 ? (
        <p className="text-slate text-sm">No PYQs found.</p>
      ) : (
        <div className="space-y-3">
          {pyqs.map((p) => (
            <div key={p._id} className="border border-slate/10 rounded-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">{p.subject}</p>
                  <p className="text-xs text-slate">
                    {p.branch} · Sem {p.semester} · {p.year} · {p.examType}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <BookmarkButton itemType="pyq" itemId={p._id} />
                  <a href={p.fileUrl} target="_blank" rel="noreferrer" className="text-link text-xs hover:underline transition-colors">
                    View PDF
                  </a>
                  {p.questions?.length > 0 && (
                    <button
                      onClick={() => setExpandedId(expandedId === p._id ? null : p._id)}
                      className="text-xs px-2 py-1 rounded bg-slate/10 text-slate hover:bg-slate/20 transition-colors"
                    >
                      {expandedId === p._id ? "Hide questions" : `${p.questions.length} questions`}
                    </button>
                  )}
                </div>
              </div>

              {expandedId === p._id && (
                <ul className="mt-3 space-y-2 animate-fade-in">
                  {p.questions.map((q, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 text-sm border-t border-slate/10 pt-2">
                      <span className="text-ink">
                        <span className="text-slate mr-1">{i + 1}.</span>
                        {q}
                      </span>
                      <button
                        onClick={() => onAskAI(q)}
                        className="shrink-0 text-xs px-2 py-1 rounded bg-brass/15 text-brass hover:bg-brass/25 transition-colors whitespace-nowrap"
                      >
                        Ask AI
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
