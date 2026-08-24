/**
 * Metric tile for dashboard overviews. Extracted from AnalyticsPanel's
 * inline StatCard so it can carry an icon + accent color - the plain
 * label/number version read flat next to the charts below it.
 */
export default function StatCard({ icon: Icon, label, value, accent = "indigo" }) {
  const accentStyles = {
    indigo: "bg-indigo/10 text-link",
    brass: "bg-brass/10 text-brass",
    sage: "bg-sage/10 text-sage",
    rust: "bg-rust/10 text-rust",
  }[accent];

  return (
    <div className="bg-surface border border-slate/10 rounded-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-wide text-slate">{label}</p>
        {Icon && (
          <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${accentStyles}`}>
            <Icon size={16} />
          </span>
        )}
      </div>
      <p className="font-display text-3xl text-ink">{value}</p>
    </div>
  );
}
