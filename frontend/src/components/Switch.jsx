/**
 * On/off switch, visually identical to the light/dark toggle in
 * DashboardLayout's sidebar - extracted here so every hide/show,
 * enable/disable control in the app looks and behaves the same way instead
 * of a mix of text links and checkboxes.
 */
export default function Switch({ checked, onChange, label, disabled = false, className = "" }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none ${className}`}
    >
      <span
        className={`relative inline-block w-9 h-5 rounded-full shrink-0 transition-colors ${
          checked ? "bg-sage" : "bg-slate/25"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </span>
      {label && <span className="text-xs text-slate">{label}</span>}
    </button>
  );
}
