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

  const remove = async (id) => {
    await client.delete(`/admin/students/${id}`);
    load();
  };

  return (
    <div className="bg-surface border border-slate/10 rounded-sm p-6 transition-shadow hover:shadow-md">
      <h3 className="font-display text-lg text-ink mb-1">All Students</h3>
      <p className="ledger-rule mb-4" />
      {loading ? (
        <p className="text-slate text-sm">Loading...</p>
      ) : students.length === 0 ? (
        <p className="text-slate text-sm">No students yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate border-b border-brass/40">
              <th className="py-2">Name</th>
              <th>Roll</th>
              <th>Email</th>
              <th>Branch</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s._id} className="border-b border-slate/10">
                <td className="py-2">{s.name}</td>
                <td className="font-mono">{s.rollNumber}</td>
                <td>{s.email}</td>
                <td>{s.branch}</td>
                <td className={s.isActive ? "text-sage" : "text-rust"}>{s.isActive ? "active" : "deactivated"}</td>
                <td>
                  {s.isActive && (
                    <button onClick={() => remove(s._id)} className="text-rust text-xs hover:underline transition-colors">
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
