import { motion } from "motion/react";
import { LANGUAGES } from "@/constants/languages";
import type { Language } from "@/types";

interface Props {
  value:    Language;
  onChange: (val: Language) => void;
  idPrefix: string;
}

export function LangSelector({ value, onChange, idPrefix }: Props) {
  return (
    <div className="flex gap-1 p-0.5 bg-zinc-100 dark:bg-white/[0.06] rounded-[10px] border border-zinc-200/80 dark:border-white/[0.08] relative">
      {LANGUAGES.filter(l => idPrefix === "source" || l.value !== "Auto").map((lang) => {
        const active = lang.value === value;
        return (
          <button
            key={lang.value}
            onClick={() => onChange(lang.value)}
            aria-pressed={active}
            className={`relative flex-1 py-1.5 text-[12px] font-semibold rounded-md transition-colors z-10 cursor-pointer ${
              active
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            {active && (
              <motion.div
                layoutId={`pill-${idPrefix}`}
                className="absolute inset-0 bg-white dark:bg-white/[0.15] rounded-md shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-zinc-200/60 dark:border-white/[0.1] -z-10"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-20">{lang.native}</span>
          </button>
        );
      })}
    </div>
  );
}
