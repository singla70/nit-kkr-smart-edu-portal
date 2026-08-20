/**
 * Clickable feature tile used on the landing page. `onClick` decides what
 * happens (guest lookup navigates directly; everything else opens the
 * login-required modal, since Landing only renders for signed-out visitors).
 */
export default function FeatureCard({ icon: Icon, title, description, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-surface border border-slate/10 rounded-sm p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-brass/40"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-sm bg-indigo/10 flex items-center justify-center text-link group-hover:bg-indigo group-hover:text-cream transition-colors">
          <Icon size={20} />
        </div>
        {badge && (
          <span className="text-[10px] uppercase tracking-wide text-brass bg-brass/10 px-2 py-1 rounded-sm">
            {badge}
          </span>
        )}
      </div>
      <p className="font-display text-base text-ink mb-1">{title}</p>
      <p className="text-slate text-xs leading-relaxed">{description}</p>
    </button>
  );
}
