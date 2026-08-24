import { useState, useEffect } from "react";
import client from "../../api/client";
import Switch from "../../components/Switch";
import { Trash2, Send } from "lucide-react";

export default function NotificationsPanel() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", category: "general", content: "" });
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(null);

  const load = async () => {
    const { data } = await client.get("/admin/notifications");
    setItems(data);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => v && formData.append(k, v));
      if (file) formData.append("file", file);
      await client.post("/admin/notifications", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setForm({ title: "", category: "general", content: "" });
      setFile(null);
      setMessage({ type: "success", text: "Notification posted." });
      load();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed." });
    }
  };

  const remove = async (id) => {
    await client.delete(`/admin/notifications/${id}`);
    load();
  };

  const toggleVisibility = async (id, currentlyVisible) => {
    await client.patch(`/admin/notifications/${id}/visibility`, { isVisible: !currentlyVisible });
    load();
  };

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="bg-surface border border-slate/10 rounded-sm p-6 max-w-xl">
        <h3 className="font-display text-lg text-ink mb-1">Post Notification</h3>
        <p className="ledger-rule mb-4" />
        {message && (
          <p className={`text-sm mb-4 px-3 py-2 rounded ${message.type === "success" ? "bg-sage/10 text-sage" : "bg-rust/10 text-rust"}`}>
            {message.text}
          </p>
        )}
        <input
          placeholder="Title"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="field mb-3"
        />
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="field mb-3"
        >
          {["attendance", "internship", "scholarship", "exam", "general"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <textarea
          placeholder="Content (used for keyword search in student chat)"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={3}
          className="field mb-3"
        />
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} className="text-sm mb-4 block" />
        <button type="submit" className="btn-primary">
          <Send size={14} />
          Post
        </button>
      </form>

      <div className="bg-surface border border-slate/10 rounded-sm p-6 transition-shadow hover:shadow-md">
        <h3 className="font-display text-lg text-ink mb-1">All Notifications</h3>
        <p className="ledger-rule mb-4" />
        {items.length === 0 ? (
          <p className="text-slate text-sm">None yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((n) => (
              <li key={n._id} className="flex justify-between items-center border-b border-slate/10 pb-2.5 gap-3">
                <span className={n.isVisible === false ? "text-slate line-through" : "text-ink"}>
                  {n.title} <span className="text-xs text-slate">({n.category})</span>
                </span>
                <div className="flex items-center gap-4 shrink-0">
                  {n.fileUrl && (
                    <a href={n.fileUrl} target="_blank" rel="noreferrer" className="text-link text-xs hover:underline transition-colors">
                      View
                    </a>
                  )}
                  <Switch
                    checked={n.isVisible !== false}
                    onChange={() => toggleVisibility(n._id, n.isVisible !== false)}
                    label={n.isVisible === false ? "Hidden" : "Visible"}
                  />
                  <button onClick={() => remove(n._id)} className="btn-ghost text-rust hover:bg-rust/10">
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
