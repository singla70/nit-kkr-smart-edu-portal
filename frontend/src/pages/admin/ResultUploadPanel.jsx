import { useState, useEffect } from "react";
import { UploadCloud } from "lucide-react";
import client from "../../api/client";
import Badge from "../../components/Badge";

export default function ResultUploadPanel() {
  const [form, setForm] = useState({ branch: "", semester: "", year: "" });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [batches, setBatches] = useState([]);

  const loadBatches = async () => {
    const { data } = await client.get("/admin/results/batches");
    setBatches(data);
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!file) {
      setError("Please choose a result PDF.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("branch", form.branch);
      formData.append("semester", form.semester);
      if (form.year) formData.append("year", form.year);
      formData.append("file", file);

      const { data } = await client.post("/admin/results/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult({ ...data.summary, sourcePdfUrl: data.sourcePdfUrl });
      loadBatches();
    } catch (err) {
      setError(err.response?.data?.message || "Upload/extraction failed.");
    } finally {
      setLoading(false);
    }
  };

  const retryFailed = async (sourcePdfUrl) => {
    setLoading(true);
    try {
      await client.post("/admin/results/batches/retry", { sourcePdfUrl });
      loadBatches();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="bg-surface border border-slate/10 rounded-sm p-6 max-w-xl">
        <h3 className="font-display text-lg text-ink mb-1">Upload Result PDF</h3>
        <p className="text-slate text-xs mb-4">
          Extraction runs immediately: PDF → per-student segmentation → batches of 8 → structured data saved to a
          pending review queue. Nothing reaches students until you verify it in <strong>Pending Verification</strong>{" "}
          and commit it.
        </p>

        {error && <p className="text-rust text-sm mb-4 bg-rust/10 px-3 py-2 rounded">{error}</p>}
        {result && (
          <div className="text-sm mb-4 bg-sage/10 text-sage px-3 py-2 rounded space-y-1">
            <p>
              {result.completed}/{result.totalBatches} batches completed
              {result.failed > 0 ? (
                <>
                  {`, ${result.failed} failed `}
                  <button
                    type="button"
                    onClick={() => retryFailed(result.sourcePdfUrl)}
                    className="underline text-rust"
                  >
                    retry failed batches
                  </button>
                </>
              ) : (
                "."
              )}
            </p>
            {result.possiblyMissedStudents > 0 && (
              <p className="text-rust">
                Heads up: ~{result.possiblyMissedStudents} roll number(s) in the PDF don't appear in any extracted
                student - double-check the Pending Verification queue for gaps.
              </p>
            )}
            <p>Go to the Pending Verification tab to review and commit these results.</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          <input
            placeholder="Branch"
            required
            value={form.branch}
            onChange={(e) => setForm({ ...form, branch: e.target.value })}
            className="field"
          />
          <input
            placeholder="Semester"
            type="number"
            required
            value={form.semester}
            onChange={(e) => setForm({ ...form, semester: e.target.value })}
            className="field"
          />
          <input
            placeholder="Year"
            type="number"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
            className="field"
          />
        </div>

        <input type="file" accept="application/pdf" required onChange={(e) => setFile(e.target.files[0])} className="text-sm mb-4 block" />

        <button type="submit" disabled={loading} className="btn-primary">
          <UploadCloud size={14} />
          {loading ? "Extracting... this may take a while" : "Upload & Extract"}
        </button>
      </form>

      <div className="bg-surface border border-slate/10 rounded-sm p-6 transition-shadow hover:shadow-md">
        <h3 className="font-display text-lg text-ink mb-1">Extraction Batches</h3>
        <p className="ledger-rule mb-4" />
        {batches.length === 0 ? (
          <p className="text-slate text-sm">No batches yet.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="data-table w-full text-sm">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Sem</th>
                <th>Students</th>
                <th>Status</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b._id}>
                  <td>{b.branch}</td>
                  <td>{b.semester}</td>
                  <td>{b.rollNumbersInBatch?.length}</td>
                  <td>
                    <Badge variant={b.status === "completed" ? "success" : b.status === "failed" ? "danger" : "neutral"}>
                      {b.status}
                    </Badge>
                  </td>
                  <td className="text-xs text-rust">{b.errorMessage}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
