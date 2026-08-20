import { useState } from "react";
import client from "../../api/client";

/**
 * Generic multipart form: text fields + optional file. Reused for teacher's
 * study material / assignments / announcements and admin's result upload -
 * only the endpoint/fields/fileRequired differ.
 */
export default function UploadForm({ endpoint, fields, fileRequired, submitLabel }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, ""])));
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([k, v]) => v && formData.append(k, v));
      if (file) formData.append("file", file);

      const { data } = await client.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage({ type: "success", text: "Submitted successfully." });
      setValues(Object.fromEntries(fields.map((f) => [f.key, ""])));
      setFile(null);
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Submission failed." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-surface border border-slate/10 rounded-sm p-6 max-w-xl">
      {message && (
        <p className={`text-sm mb-4 px-3 py-2 rounded ${message.type === "success" ? "bg-sage/10 text-sage" : "bg-rust/10 text-rust"}`}>
          {message.text}
        </p>
      )}

      {fields.map((f) => (
        <div key={f.key} className="mb-4">
          <label className="block text-xs uppercase tracking-wide text-slate mb-1">{f.label}</label>
          <input
            type={f.type || "text"}
            required={!!f.required}
            value={values[f.key]}
            onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            className="w-full px-3 py-2 border border-slate/20 rounded bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brass"
          />
        </div>
      ))}

      <div className="mb-6">
        <label className="block text-xs uppercase tracking-wide text-slate mb-1">
          File {fileRequired ? "(required, PDF)" : "(optional, PDF)"}
        </label>
        <input
          type="file"
          accept="application/pdf"
          required={!!fileRequired}
          onChange={(e) => setFile(e.target.files[0])}
          className="text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-indigo text-cream px-5 py-2 rounded text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Submitting..." : submitLabel}
      </button>
    </form>
  );
}
