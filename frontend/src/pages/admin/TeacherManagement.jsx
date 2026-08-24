import { useState, useEffect } from "react";
import client from "../../api/client";
import Badge from "../../components/Badge";
import { UserPlus, UserX, RotateCcw, Trash2 } from "lucide-react";

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

  const permanentlyDeleteTeacher = async (id, name) => {
    if (!window.confirm(`Permanently delete ${name}'s account? This cannot be undone.`)) return;
    await client.delete(`/admin/teachers/${id}/permanent`);
    load();
  };

  const active = teachers.filter((t) => t.isActive);
  const deactivated = teachers.filter((t) => !t.isActive);

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
            className="field"
          />
          <input
            placeholder="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="field"
          />
          <input
            placeholder="Password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="field"
          />
          <input
            placeholder="Department"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="field"
          />
        </div>
        <button type="submit" className="btn-primary">
          <UserPlus size={14} />
          Create Teacher
        </button>
      </form>

      <div className="bg-surface border border-slate/10 rounded-sm p-6 transition-shadow hover:shadow-md">
        <h3 className="font-display text-lg text-ink mb-1">Teachers</h3>
        <p className="ledger-rule mb-4" />
        {loading ? (
          <p className="text-slate text-sm">Loading...</p>
        ) : active.length === 0 ? (
          <p className="text-slate text-sm">No active teachers.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {active.map((t) => (
                  <tr key={t._id}>
                    <td>{t.name}</td>
                    <td>{t.email}</td>
                    <td>{t.department}</td>
                    <td>
                      <Badge variant="success">Active</Badge>
                    </td>
                    <td>
                      <button onClick={() => removeTeacher(t._id)} className="btn-ghost text-rust hover:bg-rust/10">
                        <UserX size={14} />
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-surface border border-slate/10 rounded-sm p-6 transition-shadow hover:shadow-md">
        <h3 className="font-display text-lg text-ink mb-1">Deactivated Teachers</h3>
        <p className="text-xs text-slate mb-4">Can't log in. Reactivate to restore access, or delete permanently.</p>
        {loading ? (
          <p className="text-slate text-sm">Loading...</p>
        ) : deactivated.length === 0 ? (
          <p className="text-slate text-sm">None.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {deactivated.map((t) => (
                  <tr key={t._id}>
                    <td className="text-slate">{t.name}</td>
                    <td className="text-slate">{t.email}</td>
                    <td className="text-slate">{t.department}</td>
                    <td>
                      <Badge variant="neutral">Deactivated</Badge>
                    </td>
                    <td className="space-x-1 whitespace-nowrap">
                      <button onClick={() => reactivateTeacher(t._id)} className="btn-ghost text-sage hover:bg-sage/10">
                        <RotateCcw size={14} />
                        Reactivate
                      </button>
                      <button
                        onClick={() => permanentlyDeleteTeacher(t._id, t.name)}
                        className="btn-ghost text-rust hover:bg-rust/10"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </td>
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