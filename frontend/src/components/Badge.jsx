/**
 * Small status pill. Colors map to the existing brand tokens so a "success"
 * badge always means sage, "danger" always means rust, etc. across every
 * panel that uses it - status shouldn't have a different visual language on
 * every screen.
 */
const VARIANTS = {
  success: "bg-sage/10 text-sage border-sage/20",
  danger: "bg-rust/10 text-rust border-rust/20",
  warning: "bg-brass/10 text-brass border-brass/30",
  neutral: "bg-slate/10 text-slate border-slate/20",
  brand: "bg-indigo/10 text-link border-indigo/20",
};

export default function Badge({ children, variant = "neutral", className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium capitalize whitespace-nowrap ${VARIANTS[variant] || VARIANTS.neutral} ${className}`}
    >
      {children}
    </span>
  );
}
