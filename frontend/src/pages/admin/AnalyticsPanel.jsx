import { useState, useEffect } from "react";
import client from "../../api/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const StatCard = ({ label, value }) => (
  <div className="bg-surface border border-slate/10 rounded-sm p-5">
    <p className="text-xs uppercase tracking-wide text-slate mb-1">{label}</p>
    <p className="font-display text-3xl text-ink">{value}</p>
  </div>
);

export default function AnalyticsPanel() {
  const [overview, setOverview] = useState(null);
  const [byDept, setByDept] = useState([]);
  const [resultsBreakdown, setResultsBreakdown] = useState([]);
  const [trending, setTrending] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [o, d, r, t, a] = await Promise.all([
        client.get("/admin/analytics/overview"),
        client.get("/admin/analytics/content-by-department"),
        client.get("/admin/analytics/results-breakdown"),
        client.get("/admin/analytics/trending-searches"),
        client.get("/admin/analytics/recent-activity"),
      ]);
      setOverview(o.data);
      setByDept(d.data);
      setResultsBreakdown(r.data);
      setTrending(t.data);
      setActivity(a.data);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p className="text-slate text-sm">Loading analytics...</p>;

  return (
    <div className="space-y-8">
      {/* System overview stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Students" value={overview.totalStudents} />
        <StatCard label="Teachers" value={overview.totalTeachers} />
        <StatCard label="Results on file" value={overview.totalResults} />
        <StatCard label="Assignments" value={overview.totalAssignments} />
        <StatCard label="Study material" value={overview.totalStudyMaterial} />
        <StatCard label="PYQs" value={overview.totalPYQs} />
        <StatCard label="Announcements" value={overview.totalAnnouncements} />
        <StatCard label="Notifications" value={overview.totalNotifications} />
      </div>

      {(overview.pendingBatches > 0 || overview.failedBatches > 0) && (
        <div className="bg-brass/10 border border-brass/30 rounded-sm px-4 py-3 text-sm text-ink">
          {overview.pendingBatches > 0 && <span className="mr-4">{overview.pendingBatches} extraction batch(es) in progress</span>}
          {overview.failedBatches > 0 && <span className="text-rust">{overview.failedBatches} batch(es) failed — check Results Upload</span>}
        </div>
      )}

      {/* Content by department */}
      <div className="bg-surface border border-slate/10 rounded-sm p-6 transition-shadow hover:shadow-md">
        <h3 className="font-display text-lg text-ink mb-1">Content by Department</h3>
        <p className="ledger-rule mb-4" />
        {byDept.length === 0 ? (
          <p className="text-slate text-sm">No content yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byDept}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4B556320" />
              <XAxis dataKey="branch" tick={{ fontSize: 12, fill: "#4B5563" }} />
              <YAxis tick={{ fontSize: 12, fill: "#4B5563" }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="results" stackId="a" fill="#1B2A4A" name="Results" />
              <Bar dataKey="assignments" stackId="a" fill="#C9A227" name="Assignments" />
              <Bar dataKey="studyMaterial" stackId="a" fill="#5C7A5E" name="Study Material" />
              <Bar dataKey="pyqs" stackId="a" fill="#A6432B" name="PYQs" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Results pass/fail breakdown */}
      <div className="bg-surface border border-slate/10 rounded-sm p-6 transition-shadow hover:shadow-md">
        <h3 className="font-display text-lg text-ink mb-1">Results Breakdown by Branch</h3>
        <p className="ledger-rule mb-4" />
        {resultsBreakdown.length === 0 ? (
          <p className="text-slate text-sm">No results yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={resultsBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4B556320" />
              <XAxis dataKey="branch" tick={{ fontSize: 12, fill: "#4B5563" }} />
              <YAxis tick={{ fontSize: 12, fill: "#4B5563" }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="pass" fill="#5C7A5E" name="Pass" />
              <Bar dataKey="fail" fill="#A6432B" name="Fail" />
              <Bar dataKey="withheld" fill="#C9A227" name="Withheld" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Trending searches */}
        <div className="bg-surface border border-slate/10 rounded-sm p-6 transition-shadow hover:shadow-md">
          <h3 className="font-display text-lg text-ink mb-1">Trending Searches</h3>
          <p className="text-xs text-slate mb-4">Last 30 days, across result queries + AI chat</p>
          {trending.length === 0 ? (
            <p className="text-slate text-sm">No search activity yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {trending.map((t, i) => (
                <li key={i} className="flex justify-between border-b border-slate/10 pb-2">
                  <span className="truncate pr-2">{t.query}</span>
                  <span className="text-brass font-mono text-xs shrink-0">×{t.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-surface border border-slate/10 rounded-sm p-6 transition-shadow hover:shadow-md">
          <h3 className="font-display text-lg text-ink mb-1">Recent Activity</h3>
          <p className="ledger-rule mb-4" />
          {activity.length === 0 ? (
            <p className="text-slate text-sm">No recent activity.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {activity.map((a, i) => (
                <li key={i} className="border-b border-slate/10 pb-2">
                  <p className="text-ink">{a.label}</p>
                  <p className="text-xs text-slate">{new Date(a.at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
