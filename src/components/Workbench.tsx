import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Copy, Check, ArrowDownUp, X, Keyboard, Mic, Square, Volume2 } from "lucide-react";
import { LangSelector } from "./LangSelector";
import { FileUpload } from "./FileUpload";
import { useTranslation } from "@/hooks/useTranslation";
import { useSpeech } from "@/hooks/useSpeech";
import type { Language, TranslationResult } from "@/types";

interface Props {
  enabled: boolean;
  onResult: (result: TranslationResult) => void;
  sourceLang: Language;
  targetLang: Language;
  onSourceLangChange: (lang: Language) => void;
  onTargetLangChange: (lang: Language) => void;
  initialText?: string;
}

const MAX_CHARS = 5000;

export function Workbench({ enabled, onResult, sourceLang, targetLang, onSourceLangChange, onTargetLangChange, initialText }: Props) {
  const [sourceText, setSourceText] = useState("");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { result, translating, error, run, reset } = useTranslation();
  
  const { 
    listening, interimText, dictateError, isSpeakingSource, isSpeakingTarget, playbackSpeed,
    setPlaybackSpeed, speak, stopAll, toggleDictate 
  } = useSpeech(sourceLang, targetLang);

  useEffect(() => {
    if (initialText) setSourceText(initialText);
  }, [initialText]);

  const handleTranslate = async () => {
    if (!sourceText.trim() || sourceText.length > MAX_CHARS || translating) return;
    const res = await run(sourceText, sourceLang, targetLang);
    if (res) onResult(res);
  };

  const handleSwap = () => {
    onSourceLangChange(targetLang);
    onTargetLangChange(sourceLang === "Auto" ? "English" : sourceLang);
    if (result?.translation) setSourceText(result.translation);
    reset();
  };

  const handleClear = () => {
    setSourceText("");
    stopAll();
    reset();
    textareaRef.current?.focus();
  };

  const isOverLimit = sourceText.length > MAX_CHARS;
  const canTranslate = enabled && !translating && !!sourceText.trim() && !isOverLimit && !listening;

  return (
    <div className="flex flex-col flex-1 min-h-0 border border-zinc-200/80 dark:border-white/[0.08] rounded-xl bg-white dark:bg-[#0a0a0a] overflow-hidden shadow-sm relative z-10">
      <div className="p-3 pb-2 border-b border-zinc-100 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-transparent shrink-0">
        <LangSelector value={sourceLang} onChange={onSourceLangChange} idPrefix="source" />
        <textarea
          ref={textareaRef}
          disabled={!enabled}
          value={listening && interimText ? (sourceText ? sourceText + " " + interimText : interimText) : sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && handleTranslate()}
          placeholder="Type or paste text…"
          rows={3}
          className="w-full mt-2 bg-transparent text-[14px] font-medium text-zinc-900 dark:text-[#f8fafc] placeholder-zinc-500 outline-none resize-none leading-relaxed"
        />
        <div className="flex justify-between items-center mt-1 h-5">
          <div className="flex items-center gap-1.5">
            {sourceText && (
              <button onClick={handleClear} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 p-0.5"><X className="w-3.5 h-3.5" /></button>
            )}
            <FileUpload onUpload={setSourceText} disabled={!enabled} />
            <button
              onClick={() => toggleDictate(t => setSourceText(prev => prev ? prev + " " + t : t))}
              disabled={!enabled}
              className={`p-1 rounded-full ${listening ? "text-red-500" : "text-zinc-500 hover:text-zinc-900"}`}
            >
              {listening ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => speak(sourceText, sourceLang, () => {})} disabled={!sourceText} className={`p-1 rounded-full ${isSpeakingSource ? "text-blue-500" : "text-zinc-500 hover:text-zinc-900"}`}>
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPlaybackSpeed(s => s === 1.2 ? 0.8 : s + 0.2)} className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-zinc-200 dark:border-white/10 text-zinc-500">
              {playbackSpeed.toFixed(1)}x
            </button>
            <span className={`text-[11px] font-mono ${isOverLimit ? "text-red-600" : "text-zinc-500"}`}>
              {sourceText.length}/{MAX_CHARS}
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-20 -my-3.5 flex justify-center items-center h-7 pointer-events-none">
        <motion.button
          onClick={handleSwap}
          whileHover={{ scale: 1.12, rotate: 180 }}
          className="w-8 h-8 pointer-events-auto bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-white/[0.1] rounded-full flex items-center justify-center text-zinc-600 shadow-sm transition-colors"
        >
          <ArrowDownUp className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      <div className="p-3 pt-2 bg-white dark:bg-[#0a0a0a] flex-1 min-h-0 flex flex-col">
        <LangSelector value={targetLang} onChange={onTargetLangChange} idPrefix="target" />
        <div className="min-h-[64px] flex-1 mt-2 relative overflow-y-auto">
          <AnimatePresence mode="wait">
            {translating ? (
              <motion.div key="shimmer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2 pt-1">
                <div className="h-3 shimmer rounded-full w-4/5" /><div className="h-3 shimmer rounded-full w-3/5" />
              </motion.div>
            ) : result ? (
              <motion.p key="res" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[14px] font-medium text-zinc-900 dark:text-[#f8fafc] leading-relaxed whitespace-pre-wrap">
                {result.translation}
              </motion.p>
            ) : (
              <p className="text-[13px] text-zinc-500">Translation appears here</p>
            )}
          </AnimatePresence>
        </div>
        {(error || dictateError) && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-500/10 border border-red-100 text-[12px] text-red-600 flex items-center gap-2">
            <span>⚠ {error || dictateError}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center px-3 py-2 border-t border-zinc-100 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-transparent shrink-0">
        <div className="flex items-center gap-1.5">
          <button onClick={() => { navigator.clipboard.writeText(result?.translation || ""); setCopied(true); setTimeout(() => setCopied(false), 1500); }} disabled={!result} className="p-1.5 text-zinc-600 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-white/[0.08] rounded-lg">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => result && speak(result.translation, targetLang, () => {})} disabled={!result} className={`p-1.5 rounded-lg ${isSpeakingTarget ? "text-indigo-500 bg-indigo-50" : "text-zinc-600 hover:bg-zinc-200/50"}`}>
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          {!result && <span className="text-[11px] text-zinc-500 flex items-center gap-1"><Keyboard className="w-3.5 h-3.5" /> Ctrl+Enter</span>}
        </div>
        <button onClick={handleTranslate} disabled={!canTranslate} className="bg-[#1a73e8] text-white dark:bg-[#8ab4f8] dark:text-[#202124] px-5 py-1.5 rounded-lg text-[13px] font-semibold disabled:opacity-40 shadow-sm">
          {translating ? "Translating…" : "Translate"}
        </button>
      </div>
    </div>
  );
}