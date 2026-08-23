import { useState, useEffect } from "react";
import client from "../../api/client";

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
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate border-b border-brass/40">
                <th className="py-2">Name</th>
                <th>Roll</th>
                <th>Email</th>
                <th>Branch</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {active.map((s) => (
                <tr key={s._id} className="border-b border-slate/10">
                  <td className="py-2">{s.name}</td>
                  <td className="font-mono">{s.rollNumber}</td>
                  <td>{s.email}</td>
                  <td>{s.branch}</td>
                  <td>
                    <button onClick={() => deactivate(s._id)} className="text-rust text-xs hover:underline transition-colors">
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-surface border border-slate/10 rounded-sm p-6 transition-shadow hover:shadow-md">
        <h3 className="font-display text-lg text-ink mb-1">Deactivated Students</h3>
        <p className="text-xs text-slate mb-4">Can't log in. Reactivate to restore access, or delete permanently.</p>
        {deactivated.length === 0 ? (
          <p className="text-slate text-sm">None.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate border-b border-brass/40">
                <th className="py-2">Name</th>
                <th>Roll</th>
                <th>Email</th>
                <th>Branch</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {deactivated.map((s) => (
                <tr key={s._id} className="border-b border-slate/10">
                  <td className="py-2 text-slate">{s.name}</td>
                  <td className="font-mono text-slate">{s.rollNumber}</td>
                  <td className="text-slate">{s.email}</td>
                  <td className="text-slate">{s.branch}</td>
                  <td className="space-x-3">
                    <button onClick={() => reactivate(s._id)} className="text-sage text-xs hover:underline transition-colors">
                      Reactivate
                    </button>
                    <button
                      onClick={() => permanentlyDelete(s._id, s.name)}
                      className="text-rust text-xs hover:underline transition-colors"
                    >
                      Delete Permanently
                    </button>
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