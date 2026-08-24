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
      // Softened radius scale - the app uses "rounded-sm" for nearly every
      // card/panel and bare "rounded" for buttons/inputs, so bumping these
      // two tokens (rather than hunting down each className) instantly
      // gives every surface a more modern, less dated corner treatment
      // app-wide, consistently, in one place.
      borderRadius: {
        sm: "0.75rem",
        DEFAULT: "0.5rem",
      },
      // Branded shadow scale (tinted with --color-ink instead of flat
      // black) so elevation reads as part of the same "ledger" palette
      // rather than a generic UI-kit shadow. Cards mostly opt in via
      // "hover:shadow-md"; a resting shadow.sm is applied globally to the
      // shared card pattern in index.css.
      boxShadow: {
        sm: "0 1px 3px 0 rgba(15,27,45,0.07), 0 1px 2px -1px rgba(15,27,45,0.05)",
        DEFAULT: "0 1px 3px 0 rgba(15,27,45,0.08), 0 1px 2px -1px rgba(15,27,45,0.06)",
        md: "0 8px 20px -6px rgba(15,27,45,0.12), 0 3px 8px -3px rgba(15,27,45,0.07)",
        lg: "0 16px 36px -10px rgba(15,27,45,0.16), 0 6px 14px -6px rgba(15,27,45,0.09)",
        xl: "0 24px 48px -14px rgba(15,27,45,0.2)",
        "2xl": "0 32px 64px -18px rgba(15,27,45,0.28)",
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
