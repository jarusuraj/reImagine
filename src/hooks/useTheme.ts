import { useState, useEffect } from "react";

export type Theme = "light" | "dark" | "system";

/**
 * Hook to manage application color theme (light/dark/system).
 * Persists user preference to localStorage and updates document root class.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("tmt-theme") as Theme) || "dark";
  });

  useEffect(() => {
    localStorage.setItem("tmt-theme", theme);
    const root = document.documentElement;

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mediaQuery.matches);

      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    } else {
      applyTheme(theme === "dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    if (theme === "system" || theme === "light") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  };

  return { theme, setTheme, toggleTheme };
}
