import { useState, useEffect } from "react";
import client from "../../api/client";
import FormattedAnswer from "../../components/FormattedAnswer";

/**
 * Student's "My Results" - 3 modes: filter search, NL question (both reuse
 * the public /results/* endpoints), and a browsable list of every posted
 * result PDF (the original documents, not just extracted structured data).
 */
export default function MyResultsPanel() {
  const [mode, setMode] = useState("filter");
  const [filters, setFilters] = useState({ rollNumber: "", semester: "" });
  const [nlQuery, setNlQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState(null);
  const [nlAnswer, setNlAnswer] = useState(null);
  const [pdfs, setPdfs] = useState(null);
  const [pdfFilters, setPdfFilters] = useState({ branch: "", semester: "" });

  const runFilterSearch = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setRows(null);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const { data } = await client.get("/results/filter", { params });
      setRows(data.results);
    } catch (err) {
      setError(err.response?.data?.message || "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  const runNlQuery = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setNlAnswer(null);
    try {
      const { data } = await client.post("/results/query", { query: nlQuery });
      setNlAnswer(data.answer);
    } catch (err) {
      setError(err.response?.data?.message || "Query failed.");
    } finally {
      setLoading(false);
    }
  };

  const loadPdfs = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(pdfFilters).filter(([, v]) => v));
      const { data } = await client.get("/student/results/pdfs", { params });
      setPdfs(data.pdfs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "pdfs" && pdfs === null) loadPdfs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("filter")}
          className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
            mode === "filter" ? "bg-indigo text-cream" : "bg-surface text-slate border border-slate/20"
          }`}
        >
          Search by filters
        </button>
        <button
          onClick={() => setMode("query")}
          className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
            mode === "query" ? "bg-indigo text-cream" : "bg-surface text-slate border border-slate/20"
          }`}
        >
          Ask a question
        </button>
        <button
          onClick={() => setMode("pdfs")}
          className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
            mode === "pdfs" ? "bg-indigo text-cream" : "bg-surface text-slate border border-slate/20"
          }`}
        >
          All Result PDFs
        </button>
      </div>

      {error && <p className="text-rust text-sm mb-4 bg-rust/10 px-3 py-2 rounded">{error}</p>}

      {mode === "filter" && (
        <form onSubmit={runFilterSearch} className="bg-surface rounded-sm p-6 border border-slate/10">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <input
              placeholder="Roll number"
              value={filters.rollNumber}
              onChange={(e) => setFilters({ ...filters, rollNumber: e.target.value })}
              className="px-3 py-2 border border-slate/20 rounded font-mono text-sm bg-surface text-ink"
            />
            <input
              placeholder="Semester"
              type="number"
              value={filters.semester}
              onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
              className="px-3 py-2 border border-slate/20 rounded text-sm bg-surface text-ink"
            />
          </div>
          <button type="submit" disabled={loading} className="bg-indigo text-cream px-5 py-2 rounded text-sm font-medium disabled:opacity-50">
            {loading ? "Searching..." : "Search"}
          </button>

          {rows && (
            <div className="mt-6 overflow-x-auto">
              {rows.length === 0 ? (
                <p className="text-slate text-sm">No results found for these filters.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate border-b border-brass/40">
                      <th className="py-2">Roll</th>
                      <th>Sem</th>
                      <th>SGPA</th>
                      <th>CGPA</th>
                      <th>Status</th>
                      <th>Reappear</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r._id} className="border-b border-slate/10">
                        <td className="py-2 font-mono">{r.rollNumber}</td>
                        <td>{r.semester}</td>
                        <td>{r.sgpa}</td>
                        <td>{r.cgpa}</td>
                        <td className={r.status === "pass" ? "text-sage" : "text-rust"}>{r.status}</td>
                        <td className="text-xs">{r.reappearSubjects || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </form>
      )}

      {mode === "query" && (
        <form onSubmit={runNlQuery} className="bg-surface rounded-sm p-6 border border-slate/10">
          <textarea
            placeholder='e.g. "What is my CGPA for semester 4?"'
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate/20 rounded text-sm mb-4 bg-surface text-ink"
          />
          <button type="submit" disabled={loading} className="bg-indigo text-cream px-5 py-2 rounded text-sm font-medium disabled:opacity-50">
            {loading ? "Asking..." : "Ask"}
          </button>
          {nlAnswer && <FormattedAnswer text={nlAnswer} className="mt-6 text-sm text-ink bg-parchment2 rounded p-4 leading-relaxed" />}
        </form>
      )}

      {mode === "pdfs" && (
        <div className="bg-surface rounded-sm p-6 border border-slate/10">
          <p className="text-slate text-xs mb-4">
            Every result PDF posted by admin, in one place - the original document, not just extracted data.
          </p>
          <form onSubmit={loadPdfs} className="grid grid-cols-3 gap-3 mb-4">
            <input
              placeholder="Branch"
              value={pdfFilters.branch}
              onChange={(e) => setPdfFilters({ ...pdfFilters, branch: e.target.value })}
              className="px-3 py-2 border border-slate/20 rounded text-sm bg-surface text-ink"
            />
            <input
              placeholder="Semester"
              type="number"
              value={pdfFilters.semester}
              onChange={(e) => setPdfFilters({ ...pdfFilters, semester: e.target.value })}
              className="px-3 py-2 border border-slate/20 rounded text-sm bg-surface text-ink"
            />
            <button type="submit" disabled={loading} className="bg-indigo text-cream px-4 py-2 rounded text-sm font-medium disabled:opacity-50 w-fit">
              {loading ? "Loading..." : "Filter"}
            </button>
          </form>

          {pdfs === null ? (
            <p className="text-slate text-sm">Loading...</p>
          ) : pdfs.length === 0 ? (
            <p className="text-slate text-sm">No result PDFs posted yet.</p>
          ) : (
            <ul className="space-y-2">
              {pdfs.map((p, i) => (
                <li key={i} className="flex items-center justify-between border-b border-slate/10 pb-2 text-sm">
                  <span className="text-ink">
                    {p.branch} — Semester {p.semester} {p.year ? `(${p.year})` : ""}
                  </span>
                  <a href={p.fileUrl} target="_blank" rel="noreferrer" className="text-link hover:underline transition-colors">
                    View PDF
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
