import { Moon, Sun, History, Power } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { motion } from "motion/react";

interface Props {
  onHistory:     () => void;
  historyOpen:   boolean;
  enabled:       boolean;
  toggleEnabled: () => void;
}

/** Inline SVG wordmark — crisp at every size, no image dependency. */
function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="#1e293b" />
      {/* Bold "R" glyph */}
      <path
        d="M8 7h6.5a4 4 0 0 1 0 8H8V7Zm0 8h4l4 6"
        stroke="#f1f5f9"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Accent dot */}
      <circle cx="20" cy="20" r="2" fill="#3b82f6" />
    </svg>
  );
}

export function Header({ onHistory, historyOpen, enabled, toggleEnabled }: Props) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md shrink-0 transition-colors z-20">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className={`shrink-0 transition-opacity ${!enabled ? "opacity-40" : ""}`}>
          <LogoMark />
        </div>
        <div>
          <h1 className="text-[14px] font-bold text-zinc-900 dark:text-zinc-100 leading-none tracking-tight flex items-center gap-2">
            reImagine
            {!enabled && (
              <span className="text-[9px] bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider leading-none">
                Disabled
              </span>
            )}
          </h1>
          <p className="text-[10.5px] font-medium text-zinc-600 dark:text-zinc-400 mt-0.5 leading-none tracking-wide">
            Trilingual Translator
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-0.5">
        {/* Power toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={toggleEnabled}
          aria-label={enabled ? "Disable extension" : "Enable extension"}
          title={enabled ? "Disable" : "Enable"}
          className={`p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
            enabled
              ? "text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              : "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          }`}
        >
          <Power className="w-4 h-4" />
        </motion.button>

        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
        >
          <motion.div key={isDark ? "sun" : "moon"} initial={{ rotate: -30, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.2 }}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </motion.div>
        </motion.button>

        {/* History toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={onHistory}
          aria-label="Toggle history"
          aria-expanded={historyOpen}
          className={`p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
            historyOpen
              ? "bg-zinc-100 dark:bg-white/[0.1] text-zinc-900 dark:text-zinc-100"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.08]"
          }`}
        >
          <History className="w-4 h-4" />
        </motion.button>
      </div>
    </header>
  );
}
