import { useState, useEffect } from "react";
import client from "../../api/client";

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", department: "" });
  const [message, setMessage] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await client.get("/admin/teachers");
    setTeachers(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createTeacher = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      await client.post("/admin/teachers", form);
      setForm({ name: "", email: "", password: "", department: "" });
      setMessage({ type: "success", text: "Teacher created." });
      load();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to create teacher." });
    }
  };

  const removeTeacher = async (id) => {
    await client.delete(`/admin/teachers/${id}`);
    load();
  };

  const reactivateTeacher = async (id) => {
    await client.put(`/admin/teachers/${id}/reactivate`);
    load();
  };

  return (
    <div className="space-y-8">
      <form onSubmit={createTeacher} className="bg-surface border border-slate/10 rounded-sm p-6 max-w-xl">
        <h3 className="font-display text-lg text-ink mb-1">Add Teacher</h3>
        <p className="ledger-rule mb-4" />
        {message && (
          <p className={`text-sm mb-4 px-3 py-2 rounded ${message.type === "success" ? "bg-sage/10 text-sage" : "bg-rust/10 text-rust"}`}>
            {message.text}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <input
            placeholder="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="px-3 py-2 border border-slate/20 rounded bg-surface text-ink text-sm"
          />
          <input
            placeholder="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="px-3 py-2 border border-slate/20 rounded bg-surface text-ink text-sm"
          />
          <input
            placeholder="Password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="px-3 py-2 border border-slate/20 rounded bg-surface text-ink text-sm"
          />
          <input
            placeholder="Department"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="px-3 py-2 border border-slate/20 rounded bg-surface text-ink text-sm"
          />
        </div>
        <button type="submit" className="bg-indigo text-cream px-5 py-2 rounded text-sm font-medium">
          Create Teacher
        </button>
      </form>

      <div className="bg-surface border border-slate/10 rounded-sm p-6 transition-shadow hover:shadow-md">
        <h3 className="font-display text-lg text-ink mb-1">All Teachers</h3>
        <p className="ledger-rule mb-4" />
        {loading ? (
          <p className="text-slate text-sm">Loading...</p>
        ) : teachers.length === 0 ? (
          <p className="text-slate text-sm">No teachers yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate border-b border-brass/40">
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t._id} className="border-b border-slate/10">
                  <td className="py-2">{t.name}</td>
                  <td>{t.email}</td>
                  <td>{t.department}</td>
                  <td className={t.isActive ? "text-sage" : "text-rust"}>{t.isActive ? "active" : "deactivated"}</td>
                  <td>
                    {t.isActive ? (
                      <button onClick={() => removeTeacher(t._id)} className="text-rust text-xs hover:underline transition-colors">
                        Deactivate
                      </button>
                    ) : (
                      <button onClick={() => reactivateTeacher(t._id)} className="text-sage text-xs hover:underline transition-colors">
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
