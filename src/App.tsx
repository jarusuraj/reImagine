import { useState, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "motion/react";
import { Globe, RotateCcw, ArrowRight, Sparkles } from "lucide-react";
import { Header }         from "@/components/Header";
import { Workbench }      from "@/components/Workbench";
import { HistorySidebar } from "@/components/HistorySidebar";
import { Footer }         from "@/components/Footer";
import { useHistory }     from "@/hooks/useHistory";
import type { Language }  from "@/types";

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 350, damping: 28 } },
};



export default function App() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pageTranslated, setPageTranslated] = useState(false);
  const { history, add, remove, clear } = useHistory();

  const [sourceLang, setSourceLang] = useState<Language>("English");
  const [targetLang, setTargetLang] = useState<Language>("Nepali");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage) return;

    chrome.storage.local.get(["extensionEnabled"], (res) => {
      if (res.extensionEnabled !== undefined) setEnabled(Boolean(res.extensionEnabled));
    });

    if (!chrome.tabs || !chrome.scripting) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const id = tabs[0]?.id;
      if (!id) return;

      chrome.tabs.sendMessage(id, { action: "tmt_get_page_status" }, (res) => {
        if (!chrome.runtime.lastError && res?.pageActive) {
          setPageTranslated(true);
          return;
        }
        chrome.scripting.executeScript({
          target: { tabId: id },
          func: () => document.querySelectorAll("[data-tmt-original]").length > 0,
        }).then((results) => {
          if (results?.[0]?.result) setPageTranslated(true);
        }).catch(() => {});
      });
    });
  }, []);

  const sendToTab = (payload: Record<string, unknown>) => {
    if (typeof chrome === "undefined" || !chrome.tabs) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const id = tabs[0]?.id;
      if (id) chrome.tabs.sendMessage(id, payload);
    });
  };

  const handlePageTranslate = () => {
    sendToTab({ action: "tmt_page_translate", sourceLang, targetLang });
    setPageTranslated(true);
  };

  const handlePageRestore = () => {
    sendToTab({ action: "tmt_page_restore" });
    setPageTranslated(false);
  };

  const toggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.set({ extensionEnabled: next });
    }
  };

  return (
    <div className="h-[540px] w-[420px] bg-[#fafafa] dark:bg-[#000000] text-zinc-900 dark:text-zinc-100 flex flex-col relative overflow-hidden transition-colors duration-500">
      <Header
        onHistory={() => setHistoryOpen(!historyOpen)}
        historyOpen={historyOpen}
        enabled={enabled}
        toggleEnabled={toggleEnabled}
      />

      <motion.main
        variants={stagger}
        initial="hidden"
        animate="show"
        className="px-3 py-3 space-y-3 flex-1 flex flex-col relative z-10 min-h-0"
      >
        {/* Hero: Live Page Translate */}
        <motion.div variants={fadeUp} className="relative group shrink-0">
          <AnimatePresence mode="wait">
            {!pageTranslated ? (
              <motion.button
                key="translate-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                onClick={handlePageTranslate}
                disabled={!enabled}
                whileHover={enabled ? { scale: 1.01 } : {}}
                whileTap={enabled ? { scale: 0.98 } : {}}
                className={`w-full flex items-center justify-between p-2.5 bg-white dark:bg-[#0a0a0a] border border-zinc-200/80 dark:border-white/[0.08] rounded-xl shadow-sm transition-all overflow-hidden relative ${
                  !enabled ? "opacity-50 cursor-not-allowed grayscale" : "hover:shadow-md hover:border-zinc-300 dark:hover:border-white/[0.15]"
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-purple-50/50 dark:from-indigo-500/[0.03] dark:to-purple-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="flex items-center gap-2.5 relative z-10">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-white/[0.05] border border-zinc-200/50 dark:border-white/[0.05] flex items-center justify-center text-zinc-900 dark:text-white group-hover:scale-105 transition-transform duration-300 shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block text-[13px] font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                      Translate Page
                      <span className="flex items-center text-[10px] bg-zinc-100 dark:bg-white/[0.08] px-1.5 py-0.5 rounded-md text-zinc-600 dark:text-zinc-400 font-bold tracking-wide">
                        {sourceLang.slice(0, 2).toUpperCase()}
                        <ArrowRight className="w-2.5 h-2.5 mx-0.5" />
                        {targetLang.slice(0, 2).toUpperCase()}
                      </span>
                    </span>
                    <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                      Translate this entire webpage
                    </span>
                  </div>
                </div>
              </motion.button>
            ) : (
              <motion.div
                key="translated-bar"
                initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0 }}
                className="w-full flex items-center justify-between p-2.5 bg-[#f0fdf4] dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 rounded-xl shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block text-[13px] font-semibold text-emerald-900 dark:text-emerald-400">Page Translated</span>
                    <span className="block text-[11px] text-emerald-600 dark:text-emerald-500/70 font-medium">Viewing translated version</span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handlePageRestore}
                  aria-label="Restore original page"
                  className="px-3 py-1.5 bg-white dark:bg-[#111] border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div variants={fadeUp} className="flex-1 min-h-0 flex flex-col">
          <Workbench
            enabled={enabled}
            onResult={add}
            sourceLang={sourceLang}
            targetLang={targetLang}
            onSourceLangChange={setSourceLang}
            onTargetLangChange={setTargetLang}
          />
        </motion.div>

        <motion.div variants={fadeUp} className="shrink-0">
          <Footer />
        </motion.div>
      </motion.main>

      <HistorySidebar
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entries={history}
        onDelete={remove}
        onClear={clear}
      />
    </div>
  );
}
