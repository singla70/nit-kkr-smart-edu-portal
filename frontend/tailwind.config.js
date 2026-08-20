/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Theme-aware tokens: flip app-wide via a "dark" class on <html>
        // (see ThemeContext + index.css) - dashboards, auth pages, and the
        // guest result lookup all pick this up.
        ink: "var(--color-ink)",
        parchment: "var(--color-parchment)",
        parchment2: "var(--color-parchment2)",
        surface: "var(--color-surface)",
        slate: "var(--color-slate)",
        link: "var(--color-link)", // for inline text links sitting directly on page/card backgrounds
        // Static brand tokens: intentionally the same in both modes.
        indigo: "#1B2A4A",
        backdrop: "#0F1B2D", // fixed dark stage for auth screens/modal overlays - never flips
        brass: "#C9A227",
        sage: "#5C7A5E",
        rust: "#A6432B",
        cream: "#F6F1E4", // for text sitting on the always-dark indigo/backdrop surfaces
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        slideUp: { "0%": { opacity: 0, transform: "translateY(8px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
        scaleIn: { "0%": { opacity: 0, transform: "scale(0.96)" }, "100%": { opacity: 1, transform: "scale(1)" } },
      },
    },
  },
  plugins: [],
};
