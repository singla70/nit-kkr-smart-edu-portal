import { useState, useEffect } from "react";
import client from "../../api/client";
import Badge from "../../components/Badge";
import { UserX, RotateCcw, Trash2 } from "lucide-react";

export default function StudentsPanel() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await client.get("/admin/students");
    setStudents(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const deactivate = async (id) => {
    await client.delete(`/admin/students/${id}`);
    load();
  };

  const reactivate = async (id) => {
    await client.put(`/admin/students/${id}/reactivate`);
    load();
  };

  const permanentlyDelete = async (id, name) => {
    if (!window.confirm(`Permanently delete ${name}'s account? This cannot be undone.`)) return;
    await client.delete(`/admin/students/${id}/permanent`);
    load();
  };

  const active = students.filter((s) => s.isActive);
  const deactivated = students.filter((s) => !s.isActive);

  if (loading) return <p className="text-slate text-sm">Loading...</p>;

  return (
    <div className="space-y-8">
      <div className="bg-surface border border-slate/10 rounded-sm p-6 transition-shadow hover:shadow-md">
        <h3 className="font-display text-lg text-ink mb-1">Students</h3>
        <p className="ledger-rule mb-4" />
        {active.length === 0 ? (
          <p className="text-slate text-sm">No active students.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Roll</th>
                  <th>Email</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {active.map((s) => (
                  <tr key={s._id}>
                    <td>{s.name}</td>
                    <td className="font-mono">{s.rollNumber}</td>
                    <td>{s.email}</td>
                    <td>{s.branch}</td>
                    <td>
                      <Badge variant="success">Active</Badge>
                    </td>
                    <td>
                      <button onClick={() => deactivate(s._id)} className="btn-ghost text-rust hover:bg-rust/10">
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
        <h3 className="font-display text-lg text-ink mb-1">Deactivated Students</h3>
        <p className="text-xs text-slate mb-4">Can't log in. Reactivate to restore access, or delete permanently.</p>
        {deactivated.length === 0 ? (
          <p className="text-slate text-sm">None.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Roll</th>
                  <th>Email</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {deactivated.map((s) => (
                  <tr key={s._id}>
                    <td className="text-slate">{s.name}</td>
                    <td className="font-mono text-slate">{s.rollNumber}</td>
                    <td className="text-slate">{s.email}</td>
                    <td className="text-slate">{s.branch}</td>
                    <td>
                      <Badge variant="neutral">Deactivated</Badge>
                    </td>
                    <td className="space-x-1 whitespace-nowrap">
                      <button onClick={() => reactivate(s._id)} className="btn-ghost text-sage hover:bg-sage/10">
                        <RotateCcw size={14} />
                        Reactivate
                      </button>
                      <button
                        onClick={() => permanentlyDelete(s._id, s.name)}
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