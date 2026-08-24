import { useState, useEffect } from "react";
import client from "../../api/client";
import Switch from "../../components/Switch";
import { Trash2, Send } from "lucide-react";

export default function AnnouncementsPanel() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", body: "", audience: "all" });
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(null);

  const load = async () => {
    const { data } = await client.get("/admin/announcements");
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
      await client.post("/admin/announcements", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setForm({ title: "", body: "", audience: "all" });
      setFile(null);
      setMessage({ type: "success", text: "Announcement posted." });
      load();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed." });
    }
  };

  const remove = async (id) => {
    await client.delete(`/admin/announcements/${id}`);
    load();
  };

  const toggleVisibility = async (id, currentlyVisible) => {
    await client.patch(`/admin/announcements/${id}/visibility`, { isVisible: !currentlyVisible });
    load();
  };

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="bg-surface border border-slate/10 rounded-sm p-6 max-w-xl">
        <h3 className="font-display text-lg text-ink mb-1">Post Announcement</h3>
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
        <textarea
          placeholder="Body"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          rows={3}
          className="field mb-3"
        />
        <select
          value={form.audience}
          onChange={(e) => setForm({ ...form, audience: e.target.value })}
          className="field mb-3"
        >
          {["all", "students", "teachers"].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} className="text-sm mb-4 block" />
        <button type="submit" className="btn-primary">
          <Send size={14} />
          Post
        </button>
      </form>

      <div className="bg-surface border border-slate/10 rounded-sm p-6 transition-shadow hover:shadow-md">
        <h3 className="font-display text-lg text-ink mb-1">All Announcements</h3>
        <p className="ledger-rule mb-4" />
        {items.length === 0 ? (
          <p className="text-slate text-sm">None yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((a) => (
              <li key={a._id} className="flex justify-between items-center border-b border-slate/10 pb-2.5 gap-3">
                <span className={a.isVisible === false ? "text-slate line-through" : "text-ink"}>
                  {a.title} <span className="text-xs text-slate">by {a.postedBy?.name} ({a.postedBy?.role})</span>
                </span>
                <div className="flex items-center gap-4 shrink-0">
                  {a.fileUrl && (
                    <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-link text-xs hover:underline transition-colors">
                      View
                    </a>
                  )}
                  <Switch
                    checked={a.isVisible !== false}
                    onChange={() => toggleVisibility(a._id, a.isVisible !== false)}
                    label={a.isVisible === false ? "Hidden" : "Visible"}
                  />
                  <button onClick={() => remove(a._id)} className="btn-ghost text-rust hover:bg-rust/10">
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
