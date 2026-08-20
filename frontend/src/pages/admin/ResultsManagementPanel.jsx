import { useState, useEffect } from "react";
import client from "../../api/client";

export default function ResultsManagementPanel() {
  const [filters, setFilters] = useState({ rollNumber: "", branch: "", semester: "" });
  const [results, setResults] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async (e) => {
    e?.preventDefault();
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const { data } = await client.get("/admin/results", { params });
    setResults(data.results);
    setLoading(false);
  };

  // Show every result by default (no filters needed) - filters just narrow it down
  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (r) => {
    setEditingId(r._id);
    setEditForm({ studentName: r.studentName, sgpa: r.sgpa, cgpa: r.cgpa, status: r.status, reappearSubjects: r.reappearSubjects });
  };

  const saveEdit = async (id) => {
    await client.put(`/admin/results/${id}`, editForm);
    setEditingId(null);
    setMessage({ type: "success", text: "Result updated." });
    search({ preventDefault: () => {} });
  };

  const remove = async (id) => {
    await client.delete(`/admin/results/${id}`);
    search({ preventDefault: () => {} });
  };

  return (
    <div className="bg-surface border border-slate/10 rounded-sm p-6 transition-shadow hover:shadow-md">
      <form onSubmit={search} className="grid grid-cols-3 gap-3 mb-4">
        <input
          placeholder="Roll number"
          value={filters.rollNumber}
          onChange={(e) => setFilters({ ...filters, rollNumber: e.target.value })}
          className="px-3 py-2 border border-slate/20 rounded bg-surface text-ink text-sm font-mono"
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
        <button type="submit" disabled={loading} className="col-span-full sm:col-span-1 bg-indigo text-cream px-4 py-2 rounded text-sm font-medium w-fit disabled:opacity-50 hover:bg-indigo/90 transition-colors">
          {loading ? "Loading..." : "Search"}
        </button>
      </form>

      {message && <p className="text-sage text-sm mb-4 bg-sage/10 px-3 py-2 rounded">{message.text}</p>}

      {results && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate border-b border-brass/40">
              <th className="py-2">Roll</th>
              <th>Name</th>
              <th>SGPA</th>
              <th>CGPA</th>
              <th>Status</th>
              <th>Reappear</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) =>
              editingId === r._id ? (
                <tr key={r._id} className="border-b border-slate/10">
                  <td className="py-2 font-mono">{r.rollNumber}</td>
                  <td>
                    <input
                      value={editForm.studentName || ""}
                      onChange={(e) => setEditForm({ ...editForm, studentName: e.target.value })}
                      className="px-2 py-1 border border-slate/20 rounded bg-surface text-ink text-sm w-full"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={editForm.sgpa || ""}
                      onChange={(e) => setEditForm({ ...editForm, sgpa: Number(e.target.value) })}
                      className="px-2 py-1 border border-slate/20 rounded bg-surface text-ink text-sm w-16"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={editForm.cgpa || ""}
                      onChange={(e) => setEditForm({ ...editForm, cgpa: Number(e.target.value) })}
                      className="px-2 py-1 border border-slate/20 rounded bg-surface text-ink text-sm w-16"
                    />
                  </td>
                  <td>
                    <select
                      value={editForm.status || "pass"}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="px-2 py-1 border border-slate/20 rounded bg-surface text-ink text-sm"
                    >
                      {["pass", "fail", "withheld"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      value={editForm.reappearSubjects || ""}
                      onChange={(e) => setEditForm({ ...editForm, reappearSubjects: e.target.value })}
                      placeholder="N/A or subject name(s)"
                      className="px-2 py-1 border border-slate/20 rounded bg-surface text-ink text-sm w-28"
                    />
                  </td>
                  <td className="space-x-2">
                    <button onClick={() => saveEdit(r._id)} className="text-sage text-xs hover:underline transition-colors">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-slate text-xs hover:underline transition-colors">
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={r._id} className="border-b border-slate/10">
                  <td className="py-2 font-mono">{r.rollNumber}</td>
                  <td>{r.studentName}</td>
                  <td>{r.sgpa}</td>
                  <td>{r.cgpa}</td>
                  <td className={r.status === "pass" ? "text-sage" : "text-rust"}>{r.status}</td>
                  <td className="text-xs">{r.reappearSubjects || "N/A"}</td>
                  <td className="space-x-2">
                    <button onClick={() => startEdit(r)} className="text-link text-xs hover:underline transition-colors">
                      Edit
                    </button>
                    <button onClick={() => remove(r._id)} className="text-rust text-xs hover:underline transition-colors">
                      Delete
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
