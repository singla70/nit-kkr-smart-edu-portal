import { useState, useEffect } from "react";
import client from "../../api/client";

// Human-readable labels for the flag codes computed in
// backend/src/utils/resultFlags.js - keep this list in sync with that file.
const FLAG_LABELS = {
  missing_roll_number: "Missing roll number",
  invalid_roll_number_format: "Roll number looks malformed",
  duplicate_roll_number_in_upload: "Duplicate roll number in this upload",
  missing_student_name: "Missing student name",
  invalid_sgpa: "SGPA missing or out of range",
  invalid_cgpa: "CGPA missing or out of range",
  sgpa_cgpa_large_gap: "Large SGPA/CGPA gap - worth a glance",
  unrecognized_status: "Unrecognized status value",
  missing_reappear_subject: "Status isn't 'pass' but reappear subject isn't filled in",
};

export default function PendingResultsPanel() {
  const [pending, setPending] = useState(null);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await client.get("/admin/results/pending", {
      params: flaggedOnly ? { flaggedOnly: "true" } : {},
    });
    setPending(data.results);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flaggedOnly]);

  const startEdit = (r) => {
    setEditingId(r._id);
    setEditForm({
      rollNumber: r.rollNumber,
      studentName: r.studentName,
      branch: r.branch,
      semester: r.semester,
      sgpa: r.sgpa,
      cgpa: r.cgpa,
      status: r.status,
      reappearSubjects: r.reappearSubjects,
    });
  };

  const saveEdit = async (id) => {
    await client.put(`/admin/results/pending/${id}`, editForm);
    setEditingId(null);
    setMessage({ type: "success", text: "Row updated - flags recomputed." });
    load();
  };

  const toggleTick = async (r) => {
    await client.patch(`/admin/results/pending/${r._id}/verify`, { verified: !r.verified });
    load();
  };

  const reject = async (id) => {
    await client.delete(`/admin/results/pending/${id}`);
    setMessage({ type: "success", text: "Row discarded - it will never reach the live results." });
    load();
  };

  const commitTicked = async (force = false) => {
    if (!force) {
      const flaggedTicked = pending?.filter((p) => p.verified && p.flagged).length ?? 0;
      if (flaggedTicked > 0) {
        const proceed = window.confirm(
          `${flaggedTicked} of the ticked row(s) still have open flags (see the Flags column for details). ` +
            `Commit them to live results anyway?`
        );
        if (!proceed) return;
        force = true;
      }
    }

    setCommitting(true);
    const { data } = await client.post("/admin/results/pending/commit", { force });
    setMessage({
      type: data.skipped ? "warning" : "success",
      text: `${data.committed} result(s) committed to live results.${data.skipped ? ` ${data.skipped} skipped (still flagged - fix and re-tick, or commit again to force).` : ""}`,
    });
    setCommitting(false);
    load();
  };

  const tickedCount = pending?.filter((p) => p.verified).length ?? 0;
  const flaggedCount = pending?.filter((p) => p.flagged).length ?? 0;

  return (
    <div className="bg-surface border border-slate/10 rounded-sm p-6 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <p className="text-sm text-slate">
            Freshly extracted results waiting for review. Nothing here is visible to students until you tick and commit it.
          </p>
          {pending && (
            <p className="text-xs text-slate mt-1">
              {pending.length} pending &middot; {flaggedCount} flagged &middot; {tickedCount} ticked
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
            Show flagged only
          </label>
          <button
            onClick={() => commitTicked(false)}
            disabled={committing || !tickedCount}
            className="bg-indigo text-cream px-4 py-2 rounded text-sm font-medium disabled:opacity-50 hover:bg-indigo/90 transition-colors"
          >
            {committing ? "Committing..." : `Commit ${tickedCount} ticked to live results`}
          </button>
        </div>
      </div>

      {message && (
        <p
          className={`text-sm mb-4 px-3 py-2 rounded ${
            message.type === "warning" ? "text-rust bg-rust/10" : "text-sage bg-sage/10"
          }`}
        >
          {message.text}
        </p>
      )}

      {loading && <p className="text-sm text-slate">Loading...</p>}

      {pending && pending.length === 0 && !loading && (
        <p className="text-sm text-slate">Nothing pending review right now.</p>
      )}

      {pending && pending.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate border-b border-brass/40">
              <th className="py-2 w-8"></th>
              <th>Roll</th>
              <th>Name</th>
              <th>Branch</th>
              <th>Sem</th>
              <th>SGPA</th>
              <th>CGPA</th>
              <th>Status</th>
              <th>Reappear</th>
              <th>Flags</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pending.map((r) =>
              editingId === r._id ? (
                <tr key={r._id} className="border-b border-slate/10 bg-brass/5">
                  <td></td>
                  <td>
                    <input
                      value={editForm.rollNumber || ""}
                      onChange={(e) => setEditForm({ ...editForm, rollNumber: e.target.value })}
                      className="px-2 py-1 border border-slate/20 rounded bg-surface text-ink text-sm w-28 font-mono"
                    />
                  </td>
                  <td>
                    <input
                      value={editForm.studentName || ""}
                      onChange={(e) => setEditForm({ ...editForm, studentName: e.target.value })}
                      className="px-2 py-1 border border-slate/20 rounded bg-surface text-ink text-sm w-full"
                    />
                  </td>
                  <td>
                    <input
                      value={editForm.branch || ""}
                      onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                      className="px-2 py-1 border border-slate/20 rounded bg-surface text-ink text-sm w-20"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={editForm.semester || ""}
                      onChange={(e) => setEditForm({ ...editForm, semester: Number(e.target.value) })}
                      className="px-2 py-1 border border-slate/20 rounded bg-surface text-ink text-sm w-14"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.sgpa ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, sgpa: Number(e.target.value) })}
                      className="px-2 py-1 border border-slate/20 rounded bg-surface text-ink text-sm w-16"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.cgpa ?? ""}
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
                  <td className="text-xs text-slate">-</td>
                  <td className="space-x-2 whitespace-nowrap">
                    <button onClick={() => saveEdit(r._id)} className="text-sage text-xs hover:underline transition-colors">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-slate text-xs hover:underline transition-colors">
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={r._id} className={`border-b border-slate/10 ${r.flagged ? "bg-rust/5" : ""}`}>
                  <td className="py-2">
                    <input type="checkbox" checked={r.verified} onChange={() => toggleTick(r)} title="Tick to include in next commit" />
                  </td>
                  <td className="font-mono">{r.rollNumber || <span className="text-rust">missing</span>}</td>
                  <td>{r.studentName || <span className="text-rust">missing</span>}</td>
                  <td>{r.branch}</td>
                  <td>{r.semester}</td>
                  <td>{r.sgpa}</td>
                  <td>{r.cgpa}</td>
                  <td className={r.status === "pass" ? "text-sage" : "text-rust"}>{r.status}</td>
                  <td className="text-xs">{r.reappearSubjects || "N/A"}</td>
                  <td className="max-w-[220px]">
                    {r.flagged ? (
                      <ul className="text-xs text-rust space-y-0.5">
                        {r.flags.map((f) => (
                          <li key={f}>&bull; {FLAG_LABELS[f] || f}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-sage">clean</span>
                    )}
                  </td>
                  <td className="space-x-2 whitespace-nowrap">
                    <button onClick={() => startEdit(r)} className="text-link text-xs hover:underline transition-colors">
                      Edit
                    </button>
                    <button onClick={() => reject(r._id)} className="text-rust text-xs hover:underline transition-colors">
                      Discard
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
