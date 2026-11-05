"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
type Theme = "dark" | "light";
type ThemeContextValue = { theme: Theme; toggleTheme: () => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);
function applyTheme(theme: Theme) { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => { const saved = localStorage.getItem("mivo-theme"); const initial: Theme = saved === "light" || saved === "dark" ? saved : "dark"; setTheme(initial); applyTheme(initial); }, []);
  function toggleTheme() { const next: Theme = theme === "dark" ? "light" : "dark"; setTheme(next); localStorage.setItem("mivo-theme", next); applyTheme(next); }
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
export function ThemeToggle() {
  const context = useContext(ThemeContext);
  if (!context) return null;
  const { theme, toggleTheme } = context;
  return <button type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-sm text-foreground transition hover:bg-surface-raised">{theme === "dark" ? "\u263C" : "\u25D0"}</button>;
}