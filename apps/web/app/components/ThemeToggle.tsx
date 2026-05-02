"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const t =
      (document.documentElement.dataset.theme as Theme | undefined) ?? "light";
    setTheme(t);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  };

  if (!theme) {
    return <button className="theme-toggle" aria-label="テーマ切替" />;
  }

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={theme === "dark" ? "Light モードへ" : "Dark モードへ"}
      title={theme === "dark" ? "Light モードへ" : "Dark モードへ"}
    >
      {theme === "dark" ? "☼" : "☾"}
    </button>
  );
}
