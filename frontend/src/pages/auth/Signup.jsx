import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ThemeToggleButton from "../../components/ThemeToggleButton";

export default function Signup() {
  const { studentSignup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    rollNumber: "",
    branch: "",
    year: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await studentSignup({ ...form, year: form.year ? Number(form.year) : undefined });
      navigate("/student");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-backdrop px-4 py-10 relative">
      <ThemeToggleButton className="fixed top-5 right-5 z-10" />
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <Link to="/">
            <p className="font-display text-3xl text-cream tracking-wide">NIT KKR</p>
          </Link>
          <p className="text-xs uppercase tracking-[0.25em] text-brass mt-2">Student Sign up</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-sm p-8 shadow-xl">
          <h2 className="font-display text-xl text-ink mb-1">Create account</h2>
          <p className="ledger-rule mb-6" />

          {error && <p className="text-rust text-sm mb-4 bg-rust/10 px-3 py-2 rounded">{error}</p>}

          {[
            { key: "name", label: "Full name", type: "text" },
            { key: "email", label: "College email", type: "email", placeholder: "you@nitkkr.ac.in" },
            { key: "password", label: "Password", type: "password" },
            { key: "rollNumber", label: "Roll number", type: "text" },
            { key: "branch", label: "Branch", type: "text", placeholder: "CSE" },
            { key: "year", label: "Year", type: "number", placeholder: "2" },
          ].map((f) => (
            <div key={f.key} className="mb-4">
              <label className="block text-xs uppercase tracking-wide text-slate mb-1">{f.label}</label>
              <input
                type={f.type}
                required={f.key !== "year"}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={update(f.key)}
                className="field"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 mt-2"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>

          <p className="text-sm text-slate text-center mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-link font-medium hover:underline transition-colors">
              Sign in
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
