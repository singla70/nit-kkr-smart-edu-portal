import { Link } from "react-router-dom";
import { X } from "lucide-react";

/**
 * Popup shown when a signed-out visitor clicks a feature card that needs an
 * account (everything except the free guest result lookup). Offers sign in
 * / sign up rather than silently redirecting, so the person understands why.
 */
export default function LoginRequiredModal({ featureName, onClose }) {
  if (!featureName) return null;

  return (
    <div
      className="fixed inset-0 bg-backdrop/70 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-sm p-8 max-w-sm w-full shadow-2xl animate-scale-in relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate hover:text-ink transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <p className="text-xs uppercase tracking-[0.2em] text-brass mb-2">Login required</p>
        <h3 className="font-display text-xl text-ink mb-2">{featureName}</h3>
        <p className="text-slate text-sm mb-6">
          Sign in to use this feature. Students without an account yet can sign up free.
        </p>

        <div className="flex gap-3">
          <Link
            to="/login"
            className="flex-1 text-center bg-indigo text-cream py-2.5 rounded text-sm font-medium hover:bg-indigo/90 transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="flex-1 text-center bg-transparent border border-indigo/40 text-ink py-2.5 rounded text-sm font-medium hover:bg-indigo/5 transition-colors"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
