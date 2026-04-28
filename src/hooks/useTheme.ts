import { useState, useEffect } from "react";

export type Theme = "light" | "dark" | "system";

const THEME_KEY = "reImagine-theme";

function chromeStorageAvailable(): boolean {
  return typeof chrome !== "undefined" && !!chrome.storage?.local;
}

function applyTheme(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    
    if (chromeStorageAvailable()) {
      chrome.storage.local.get([THEME_KEY], (res) => {
        const saved = res[THEME_KEY] as Theme | undefined;
        if (saved) setThemeState(saved);
      });
    } else {
      const saved = localStorage.getItem(THEME_KEY) as Theme | null;
      if (saved) setThemeState(saved);
    }
  }, []);

  useEffect(() => {
    
    if (chromeStorageAvailable()) {
      chrome.storage.local.set({ [THEME_KEY]: theme });
    } else {
      localStorage.setItem(THEME_KEY, theme);
    }

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

  const setTheme = (t: Theme) => setThemeState(t);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  return { theme, setTheme, toggleTheme };
}
// Custom hook for managing light/dark mode themes.
