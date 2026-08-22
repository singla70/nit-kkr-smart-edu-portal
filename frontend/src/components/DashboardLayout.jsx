import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate, Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

/**
 * Shared shell for all 3 role dashboards - a ledger-book layout: a fixed
 * "spine" sidebar (indigo, gold rule) and a parchment page area, so every
 * dashboard reads as a page in the same academic register.
 *
 * Theme (light/dark) is applied globally via ThemeContext (a "dark" class
 * on <html>) - this component just renders the toggle switch, it doesn't
 * own the theme scope itself anymore.
 *
 * Sidebar is always visible on desktop (md+) and an off-canvas drawer on
 * mobile - it starts closed there so it doesn't eat the whole screen, and
 * opens via the hamburger button in the header.
 */
export default function DashboardLayout({ title, navItems, activeKey, onNavClick, children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleNavClick = (key) => {
    onNavClick(key);
    setSidebarOpen(false); // auto-close on mobile after picking a section
  };

  return (
    <div className="dashboard-shell h-screen overflow-hidden flex bg-parchment text-ink relative">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-backdrop/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-64 bg-indigo text-cream flex flex-col shrink-0 h-full fixed md:static inset-y-0 left-0 z-40 transform transition-transform duration-200 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 py-6 border-b border-brass/30 shrink-0 flex items-start justify-between">
          <div>
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <p className="font-display text-xl tracking-wide">NIT KKR</p>
            </Link>
            <p className="text-xs uppercase tracking-[0.2em] text-brass mt-1">Smart Edu Portal</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-cream/70 hover:text-cream transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors duration-150 ${
                activeKey === item.key
                  ? "bg-brass/20 text-brass"
                  : "text-cream/80 hover:bg-cream/10"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-brass/30 space-y-3 shrink-0">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between text-xs uppercase tracking-wide text-cream/70 hover:text-brass transition-colors"
            aria-label="Toggle light/dark theme"
          >
            <span>{theme === "dark" ? "Dark mode" : "Light mode"}</span>
            <span className="relative inline-block w-9 h-5 rounded-full bg-cream/20">
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-brass transition-transform duration-200 ${
                  theme === "dark" ? "translate-x-4" : ""
                }`}
              />
            </span>
          </button>

          <div>
            <p className="text-sm truncate">{user?.name}</p>
            <p className="text-xs text-cream/60 capitalize">{user?.role}</p>
            <button
              onClick={handleLogout}
              className="mt-2 text-xs uppercase tracking-wide text-rust hover:text-rust/80 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto h-full min-w-0">
        <header className="px-4 md:px-8 py-6 border-b border-brass/40 bg-surface shrink-0 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-ink hover:opacity-70 transition-opacity shrink-0"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <h1 className="font-display text-2xl text-ink animate-slide-up truncate">{title}</h1>
        </header>
        <div className="p-4 md:p-8 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}