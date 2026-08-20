import { useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import FormattedAnswer from "../../components/FormattedAnswer";
import ThemeToggleButton from "../../components/ThemeToggleButton";

export default function ResultLookup() {
  const [mode, setMode] = useState("filter"); // "filter" | "query"
  const [filters, setFilters] = useState({ rollNumber: "", branch: "", semester: "" });
  const [nlQuery, setNlQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterResults, setFilterResults] = useState(null);
  const [nlAnswer, setNlAnswer] = useState(null);

  const runFilterSearch = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setFilterResults(null);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const { data } = await client.get("/results/filter", { params });
      setFilterResults(data.results);
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

  return (
    <div className="min-h-screen bg-parchment px-4 py-10 relative">
      <ThemeToggleButton variant="light-bg" className="fixed top-5 right-5 z-10" />
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-sm text-link hover:underline transition-colors">
              &larr; Home
            </Link>
            <Link to="/login" className="text-sm text-link hover:underline transition-colors">
              Sign in
            </Link>
          </div>
          <h1 className="font-display text-3xl text-ink mt-3">Result Lookup</h1>
          <p className="text-slate text-sm mt-1">Free, no account needed.</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode("filter")}
            className={`px-4 py-2 rounded-sm text-sm font-medium ${
              mode === "filter" ? "bg-indigo text-cream" : "bg-surface text-slate border border-slate/20"
            }`}
          >
            Search by filters
          </button>
          <button
            onClick={() => setMode("query")}
            className={`px-4 py-2 rounded-sm text-sm font-medium ${
              mode === "query" ? "bg-indigo text-cream" : "bg-surface text-slate border border-slate/20"
            }`}
          >
            Ask a question
          </button>
        </div>

        {error && <p className="text-rust text-sm mb-4 bg-rust/10 px-3 py-2 rounded">{error}</p>}

        {mode === "filter" ? (
          <form onSubmit={runFilterSearch} className="bg-surface rounded-sm p-6 border border-slate/10">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <input
                placeholder="Roll number"
                value={filters.rollNumber}
                onChange={(e) => setFilters({ ...filters, rollNumber: e.target.value })}
                className="px-3 py-2 border border-slate/20 rounded bg-surface text-ink font-mono text-sm"
              />
              <input
                placeholder="Branch"
                value={filters.branch}
                onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                className="px-3 py-2 border border-slate/20 rounded bg-surface text-ink text-sm"
              />
              <input
                placeholder="Semester"
                type="number"
                value={filters.semester}
                onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
                className="px-3 py-2 border border-slate/20 rounded bg-surface text-ink text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo text-cream px-5 py-2 rounded text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>

            {filterResults && (
              <div className="mt-6">
                {filterResults.length === 0 ? (
                  <p className="text-slate text-sm">No results found for these filters.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate border-b border-brass/40">
                        <th className="py-2">Roll</th>
                        <th>Name</th>
                        <th>Sem</th>
                        <th>SGPA</th>
                        <th>CGPA</th>
                        <th>Status</th>
                        <th>Reappear</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterResults.map((r) => (
                        <tr key={r._id} className="border-b border-slate/10">
                          <td className="py-2 font-mono">{r.rollNumber}</td>
                          <td>{r.studentName}</td>
                          <td>{r.semester}</td>
                          <td>{r.sgpa}</td>
                          <td>{r.cgpa}</td>
                          <td>
                            <span className={r.status === "pass" ? "text-sage" : "text-rust"}>{r.status}</span>
                          </td>
                          <td className="text-xs">{r.reappearSubjects || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={runNlQuery} className="bg-surface rounded-sm p-6 border border-slate/10">
            <textarea
              placeholder='e.g. "What is the CGPA for roll number 12345?"'
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate/20 rounded bg-surface text-ink text-sm mb-4"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo text-cream px-5 py-2 rounded text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Asking..." : "Ask"}
            </button>

            {nlAnswer && (
              <FormattedAnswer text={nlAnswer} className="mt-6 text-sm text-ink bg-parchment2 rounded p-4 leading-relaxed" />
            )}
          </form>
        )}
      </div>
    </div>
  );
}
