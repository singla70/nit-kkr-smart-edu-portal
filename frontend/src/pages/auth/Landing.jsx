import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  MessageSquareText,
  BookOpen,
  Library,
  ClipboardList,
  Megaphone,
  Bell,
  Bookmark,
  CheckSquare,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import FeatureCard from "../../components/FeatureCard";
import LoginRequiredModal from "../../components/LoginRequiredModal";
import ThemeToggleButton from "../../components/ThemeToggleButton";

const FEATURES = [
  {
    icon: FileText,
    title: "Result Lookup",
    description: "Search by roll number or ask in plain English. Free, no account needed.",
    badge: "Free",
    guestAccessible: true,
  },
  {
    icon: MessageSquareText,
    title: "AI Assistant",
    description: "Ask about results, policies, or announcements - one chat, auto-routed to the right answer.",
  },
  {
    icon: BookOpen,
    title: "Previous Year Questions",
    description: "Browse PYQs by subject and year, with questions extracted so you can ask AI about any one directly.",
  },
  {
    icon: Library,
    title: "Study Resources",
    description: "Notes and lab manuals uploaded by your teachers, organized by branch and semester.",
  },
  {
    icon: ClipboardList,
    title: "Assignments",
    description: "See what's due, with attachments, filterable by subject and semester.",
  },
  {
    icon: Megaphone,
    title: "Announcements",
    description: "College-wide notices from teachers and admin, in one feed.",
  },
  {
    icon: Bell,
    title: "Policy Notifications",
    description: "Attendance, internship, scholarship and exam policies - searchable, not buried in PDFs.",
  },
  {
    icon: Bookmark,
    title: "Bookmarks",
    description: "Save PYQs, notes, and announcements you want to find again quickly.",
  },
  {
    icon: CheckSquare,
    title: "To-Do List",
    description: "A personal task list built into the portal - nothing extra to install.",
  },
];

export default function Landing() {
  const [modalFeature, setModalFeature] = useState(null);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-backdrop">
      {/* Hero */}
      <div className="relative overflow-hidden px-4 pt-20 pb-24">
        <ThemeToggleButton className="fixed top-6 right-6 z-10" />
        {/* decorative brass rings, purely visual */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full border border-brass/10" />
        <div className="pointer-events-none absolute -top-10 -right-10 w-72 h-72 rounded-full border border-brass/15" />

        <div className="relative max-w-3xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brass/10 border border-brass/30 mb-6">
            <GraduationCap size={28} className="text-brass" />
          </div>
          <p className="text-xs uppercase tracking-[0.35em] text-brass mb-4">NIT Kurukshetra</p>
          <h1 className="font-display text-4xl sm:text-6xl text-cream leading-tight">
            Smart Edu Portal
          </h1>
          <p className="text-cream/60 text-base sm:text-lg max-w-xl mx-auto mt-5 leading-relaxed">
            Results, resources, and an AI assistant that actually knows your college — built for
            students, teachers, and admin, in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-9">
            <Link
              to="/result-lookup"
              className="inline-flex items-center justify-center gap-2 bg-brass text-ink px-6 py-3 rounded-sm text-sm font-medium hover:bg-brass/90 transition-colors"
            >
              Check a result free <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-transparent border border-cream/25 text-cream px-6 py-3 rounded-sm text-sm font-medium hover:bg-cream/5 transition-colors"
            >
              Sign in
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mt-12 text-cream/40 text-xs uppercase tracking-wide">
            <span>9 features, one login</span>
            <span className="w-1 h-1 rounded-full bg-cream/20" />
            <span>AI-powered results</span>
            <span className="w-1 h-1 rounded-full bg-cream/20" />
            <span>Built for 3 roles</span>
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div className="bg-parchment px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 animate-slide-up">
            <h2 className="font-display text-2xl sm:text-3xl text-ink">Everything in one portal</h2>
            <p className="text-slate text-sm mt-2">Tap any feature below — sign in takes a few seconds.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-up">
            {FEATURES.map((f) => (
              <FeatureCard
                key={f.title}
                icon={f.icon}
                title={f.title}
                description={f.description}
                badge={f.badge}
                onClick={() => {
                  if (f.guestAccessible) {
                    navigate("/result-lookup");
                  } else {
                    setModalFeature(f.title);
                  }
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Role entry points */}
      <div className="bg-backdrop px-4 py-16 border-t border-cream/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl text-cream text-center mb-8">Get started</h2>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="bg-surface rounded-sm p-6 border border-slate/10">
              <p className="font-display text-lg text-ink mb-1">Student</p>
              <p className="text-slate text-sm mb-4">Results, PYQs, assignments, AI chat, and more.</p>
              <div className="flex gap-3">
                <Link
                  to="/login"
                  className="flex-1 text-center bg-indigo text-cream py-2 rounded text-sm font-medium hover:bg-indigo/90 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="flex-1 text-center bg-transparent border border-indigo/40 text-ink py-2 rounded text-sm font-medium hover:bg-indigo/5 transition-colors"
                >
                  Sign up
                </Link>
              </div>
            </div>

            <div className="bg-surface rounded-sm p-6 border border-slate/10">
              <p className="font-display text-lg text-ink mb-1">Teacher</p>
              <p className="text-slate text-sm mb-4">Post assignments, material, and announcements.</p>
              <Link
                to="/login?role=teacher"
                className="block text-center bg-indigo text-cream py-2 rounded text-sm font-medium hover:bg-indigo/90 transition-colors"
              >
                Teacher sign in
              </Link>
              <p className="text-xs text-slate/70 mt-3">Accounts are created by your admin — no self sign-up.</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-backdrop text-center pb-8">
        <Link to="/login?role=admin" className="text-cream/30 text-xs tracking-wide hover:text-cream/60 transition-colors">
          Admin access
        </Link>
      </footer>

      <LoginRequiredModal featureName={modalFeature} onClose={() => setModalFeature(null)} />
    </div>
  );
}
