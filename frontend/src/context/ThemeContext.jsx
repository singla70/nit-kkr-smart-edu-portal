import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext(null);

/**
 * Theme applies app-wide - a "dark" class is toggled on <html>, and every
 * CSS-variable-based color token (parchment/parchment2/surface/ink/slate)
 * flips with it, everywhere: dashboards, auth pages, guest result lookup.
 * Persisted to localStorage.
 */
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
