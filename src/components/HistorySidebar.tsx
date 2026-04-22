import { X, Trash2, History, Copy, Check } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { HistoryEntry } from "@/types";

interface Props {
  open:     boolean;
  onClose:  () => void;
  entries:  HistoryEntry[];
  onDelete: (id: string) => void;
  onClear:  () => void;
}

function relativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 10)    return "just now";
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function HistorySidebar({ open, onClose, entries, onDelete, onClear }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/15 dark:bg-black/40 z-40 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 w-[300px] bg-white dark:bg-[#0a0a0a] border-l border-zinc-200/80 dark:border-white/[0.08] z-50 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100 dark:border-white/[0.06] shrink-0">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-[14px]">History</h2>
              <button
                onClick={onClose}
                aria-label="Close history"
                className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {entries.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 dark:text-zinc-600">
                  <History className="w-5 h-5 mx-auto mb-2 opacity-40" />
                  <p className="text-[12px] font-medium">No translations yet</p>
                </div>
              ) : (
                <AnimatePresence>
                  {entries.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      layout
                    >
                      <HistoryCard entry={entry} onDelete={onDelete} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {entries.length > 0 && (
              <div className="p-3 border-t border-zinc-100 dark:border-white/[0.06] shrink-0">
                <button
                  onClick={onClear}
                  className="w-full py-2 text-[12px] font-semibold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function HistoryCard({ entry, onDelete }: { entry: HistoryEntry; onDelete: (id: string) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(entry.translation);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="p-2.5 bg-zinc-50/50 dark:bg-white/[0.02] rounded-xl border border-zinc-200/80 dark:border-white/[0.06] group transition-colors hover:border-zinc-300 dark:hover:border-white/[0.1]">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold tracking-wide text-zinc-600 dark:text-zinc-400 bg-white dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.08] px-1.5 py-0.5 rounded-md">
            {entry.sourceLang.slice(0, 2).toUpperCase()} → {entry.targetLang.slice(0, 2).toUpperCase()}
          </span>
          <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500">{relativeTime(entry.timestamp)}</span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleCopy} aria-label="Copy" className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-200/50 dark:hover:bg-white/[0.05] transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onDelete(entry.id)} aria-label="Delete" className="p-1 text-zinc-500 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 rounded-md hover:bg-zinc-200/50 dark:hover:bg-white/[0.05] transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p className="text-[12px] font-medium text-zinc-600 dark:text-zinc-400 line-clamp-1 mb-0.5">{entry.sourceText}</p>
      <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">{entry.translation}</p>
    </div>
  );
}
