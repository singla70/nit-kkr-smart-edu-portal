import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

/**
 * Compact icon toggle for pages outside the dashboard (auth/landing/guest
 * lookup) - same ThemeContext as the dashboard's sidebar switch, just a
 * smaller footprint that fits a corner instead of a sidebar.
 *
 * variant="dark-bg" (default) - for pages sitting on the fixed bg-backdrop
 *   (Login/Signup/Landing) - always-light icon/text, since that backdrop
 *   never changes color.
 * variant="light-bg" - for pages on the flipping bg-parchment surface
 *   (guest Result Lookup) - uses theme-aware tokens so it stays legible in
 *   both modes.
 */
export default function ThemeToggleButton({ className = "", variant = "dark-bg" }) {
  const { theme, toggleTheme } = useTheme();

  const styles =
    variant === "light-bg"
      ? "bg-slate/10 text-ink hover:bg-slate/20"
      : "bg-cream/10 text-cream hover:bg-cream/20";

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle light/dark theme"
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors ${styles} ${className}`}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
