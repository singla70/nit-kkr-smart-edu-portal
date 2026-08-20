import { useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ThemeToggleButton from "../../components/ThemeToggleButton";

const HEADINGS = {
  teacher: { title: "Teacher Sign in", subtitle: "Use the credentials your admin created for you." },
  admin: { title: "Admin Sign in", subtitle: "Restricted access." },
  default: { title: "Sign in", subtitle: "" },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const roleHint = searchParams.get("role"); // "teacher" | "admin" | null - cosmetic only, real role comes from the DB
  const copy = HEADINGS[roleHint] || HEADINGS.default;

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loginRequiredMessage = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(location.state?.from || `/${user.role}`);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-backdrop px-4 relative">
      <ThemeToggleButton className="fixed top-5 right-5 z-10" />
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <Link to="/">
            <p className="font-display text-3xl text-cream tracking-wide">NIT KKR</p>
          </Link>
          <p className="text-xs uppercase tracking-[0.25em] text-brass mt-2">Smart Edu Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-sm p-8 shadow-xl">
          <h2 className="font-display text-xl text-ink mb-1">{copy.title}</h2>
          {copy.subtitle && <p className="text-slate text-xs mb-3">{copy.subtitle}</p>}
          <p className="ledger-rule mb-6" />

          {loginRequiredMessage && !error && (
            <p className="text-brass text-sm mb-4 bg-brass/10 px-3 py-2 rounded">{loginRequiredMessage}</p>
          )}
          {error && (
            <p className="text-rust text-sm mb-4 bg-rust/10 px-3 py-2 rounded">{error}</p>
          )}

          <label className="block text-xs uppercase tracking-wide text-slate mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full mb-4 px-3 py-2 bg-surface border border-slate/20 rounded font-body text-ink focus:outline-none focus:ring-2 focus:ring-brass transition-shadow"
            placeholder="you@nitkkr.ac.in"
          />

          <label className="block text-xs uppercase tracking-wide text-slate mb-1">Password</label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full mb-6 px-3 py-2 bg-surface border border-slate/20 rounded font-body text-ink focus:outline-none focus:ring-2 focus:ring-brass transition-shadow"
            placeholder="••••••••"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo text-cream py-2.5 rounded font-medium hover:bg-indigo/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {!roleHint && (
            <p className="text-sm text-slate text-center mt-6">
              Student, no account yet?{" "}
              <Link to="/signup" className="text-link font-medium hover:underline transition-colors">
                Sign up
              </Link>
            </p>
          )}
          <p className="text-sm text-slate text-center mt-2">
            Just checking a result?{" "}
            <Link to="/result-lookup" className="text-link font-medium hover:underline transition-colors">
              Guest lookup
            </Link>
          </p>
          <p className="text-xs text-slate/60 text-center mt-4">
            <Link to="/" className="hover:underline transition-colors">&larr; Back home</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
