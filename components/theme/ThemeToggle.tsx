"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

type Props = { className?: string; compact?: boolean };

export function ThemeToggle({ className = "", compact }: Props) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    return (
      <button
        type="button"
        title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
        className={`rounded-md p-1.5 transition-opacity hover:opacity-80 ${className}`}
        style={{ color: "var(--text2)", background: "var(--surface2)" }}
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      >
        {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
      </button>
    );
  }

  return (
    <div className={className}>
      <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[1px]" style={{ color: "var(--text3)" }}>
        Theme
      </p>
      <div
        className="flex rounded-md p-0.5"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        role="group"
        aria-label="Color theme"
      >
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors"
          style={
            theme === "light"
              ? { background: "var(--gold-dim)", color: "var(--gold)" }
              : { color: "var(--text3)" }
          }
          onClick={() => setTheme("light")}
        >
          <Sun size={11} strokeWidth={2.5} />
          Light
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors"
          style={
            theme === "dark"
              ? { background: "var(--gold-dim)", color: "var(--gold)" }
              : { color: "var(--text3)" }
          }
          onClick={() => setTheme("dark")}
        >
          <Moon size={11} strokeWidth={2.5} />
          Dark
        </button>
      </div>
    </div>
  );
}
