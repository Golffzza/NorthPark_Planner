"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("northpark_theme") as "light" | "dark" | null;
    if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("northpark_theme", nextTheme);

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-full bg-white/50 backdrop-blur-sm" />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-base backdrop-blur-md transition-all active:scale-90 ${
        isDark
          ? "border border-emerald-500/40 bg-emerald-950/80 text-emerald-300 shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:bg-emerald-900"
          : "border border-white/90 bg-white/85 text-[var(--forest-deep)] shadow-sm hover:bg-white"
      }`}
      aria-label={isDark ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"}
      title={isDark ? "เปลี่ยนเป็นธีมสว่าง (Light Mode)" : "เปลี่ยนเป็นธีมมืด (Dark Mode)"}
    >
      <span>{isDark ? "🌙" : "☀️"}</span>
    </button>
  );
}
