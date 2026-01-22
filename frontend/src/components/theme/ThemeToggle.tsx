"use client";

import { useThemeStore } from "@/store/useThemeStore";
import styles from "./ThemeToggle.module.css";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <button
      onClick={toggleTheme}
      className={`${styles.toggle} ${className ?? ""}`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <span aria-hidden>{theme === "light" ? "🌙" : "☀️"}</span>
    </button>
  );
}
