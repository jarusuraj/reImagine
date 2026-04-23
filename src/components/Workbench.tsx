import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Copy, Check, ArrowDownUp, X, Keyboard, Mic, Square, Volume2 } from "lucide-react";
import { LangSelector } from "./LangSelector";
import { useTranslation } from "@/hooks/useTranslation";
import type { Language, TranslationResult } from "@/types";

interface Props {
  enabled: boolean;
  onResult: (result: TranslationResult) => void;
  sourceLang: Language;
  targetLang: Language;
  onSourceLangChange: (lang: Language) => void;
  onTargetLangChange: (lang: Language) => void;
}

const MAX_CHARS = 5000;

export function Workbench({ enabled, onResult, sourceLang, targetLang, onSourceLangChange, onTargetLangChange }: Props) {
  const [sourceText, setSourceText] = useState("");
  const [copied, setCopied] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [dictateError, setDictateError] = useState("");
  const [isSpeakingSource, setIsSpeakingSource] = useState(false);
  const [isSpeakingTarget, setIsSpeakingTarget] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const localRecognitionRef = useRef<any>(null);
  const existingTextRef = useRef("");

  const { result, translating, error, run, reset } = useTranslation();

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage) return;

    // Check if speech recognition is in progress (popup was closed and reopened)
    chrome.storage.session.get(["tmt_speech_pending", "tmt_speech_active"], (res) => {
      if (res.tmt_speech_active) {
        setListening(true);
      }
      processSpeechPayload(res.tmt_speech_pending);
    });

    // Listen for live updates (when popup stays open) via direct messaging to avoid storage throttling
    const msgListener = (msg: any) => {
      if (msg.action === "tmt_speech_result") {
        processSpeechPayload({ status: "result", finalTranscript: msg.finalTranscript, interimTranscript: msg.interimTranscript });
      } else if (msg.action === "tmt_speech_error") {
        processSpeechPayload({ status: "error", error: msg.error });
      } else if (msg.action === "tmt_speech_end") {
        processSpeechPayload({ status: "end" });
      }
    };
    chrome.runtime.onMessage.addListener(msgListener);

    // Also listen to storage for state persistence if popup was closed
    const storageListener = (changes: any, area: string) => {
      if (area !== "session") return;
      if (changes.tmt_speech_active && !changes.tmt_speech_active.newValue) {
        setListening(false);
      }
    };
    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(msgListener);
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
      }
    };
    
    loadVoices();
    
    // Voices are loaded asynchronously in many browsers
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    // Polling fallback for browsers where onvoiceschanged is unreliable
    const interval = setInterval(() => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
        clearInterval(interval);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      if (window.speechSynthesis.onvoiceschanged) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  function processSpeechPayload(payload: any) {
    if (!payload) return;
    chrome.storage.session.remove(["tmt_speech_pending"]);
    if (payload.status === "result") {
      if (payload.finalTranscript) {
        existingTextRef.current = existingTextRef.current ? existingTextRef.current + " " + payload.finalTranscript : payload.finalTranscript;
        setSourceText(existingTextRef.current);
      }
      setInterimText(payload.interimTranscript || "");
      // Removed setListening(false) so it keeps listening continuously
    } else if (payload.status === "error") {
      if (payload.error === "not-allowed") {
        setDictateError("Microphone blocked. Allow mic access in your browser settings for this site.");
      } else if (payload.error === "network") {
        setDictateError("no Internet");
      } else if (payload.error === "no-speech") {
        setDictateError("No speech detected. Please try again and speak clearly.");
      } else if (payload.error === "aborted") {
        // User or system aborted, no error message needed
      } else {
        setDictateError("Speech error: " + payload.error);
      }
      setListening(false);
      chrome.storage.session.remove("tmt_speech_active");
    } else if (payload.status === "end") {
      setListening(false);
      chrome.storage.session.remove("tmt_speech_active");
    }
  }

  const handleTranslate = async () => {
    if (!sourceText.trim() || sourceText.length > MAX_CHARS || translating) return;
    
    // Auto-detect language purely based on character set + heuristics
    let detectedSourceLang = sourceLang;
    if (sourceLang === "Auto") {
      const isDevanagari = /[\u0900-\u097F]/.test(sourceText);
      if (isDevanagari) {
        // Common Tamang markers (Devanagari)
        const tamangMarkers = [
          "मुबा", "ताबा", "लासो", "नबा", "ह्या", "खिम", "गिबा", "ब्रोबा", "क्यु", "सुङ्बा",
          "च्यु", "मेवा", "खई", "ह्याम्बो", "निसा", "सेबा", "पापा", "आमा", "अाङा",
          "ङा", "छ्यो", "ख्याप", "ङारो", "ग्याम", "सेम", "खे"
        ];
        const isTamang = tamangMarkers.some(marker => sourceText.includes(marker));
        detectedSourceLang = isTamang ? "Tamang" : "Nepali";
      } else {
        detectedSourceLang = "English";
      }
      onSourceLangChange(detectedSourceLang); // Update UI to detected language
    }

    const res = await run(sourceText, detectedSourceLang, targetLang);
    if (res) onResult(res);
  };

  const handleSwap = () => {
    if (sourceLang === "Auto") {
      onSourceLangChange(targetLang);
      onTargetLangChange("English");
    } else {
      onSourceLangChange(targetLang);
      onTargetLangChange(sourceLang);
    }
    if (result?.translation) {
      setSourceText(result.translation);
    }
    reset();
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.translation);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = () => {
    setSourceText("");
    existingTextRef.current = "";
    reset();
    textareaRef.current?.focus();
  };

  const LANG_MAP: Record<string, string> = {
    "Auto":    "en-US",
    "English": "en-US",
    "Nepali":  "ne-NP",
    "Tamang":  "ne-NP"
  };

  const handleTTS = () => {
    if (!result?.translation) return;
    if (window.speechSynthesis.speaking && isSpeakingTarget) {
      window.speechSynthesis.cancel();
      setIsSpeakingTarget(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(result.translation);
    const langCode = LANG_MAP[targetLang] || "ne-NP";
    utterance.lang = langCode;
    
    // Maximized voice selection: Prioritize Neural, Natural, Enhanced, and Online voices
    const preferredVoice = 
      availableVoices.find(v => v.lang === langCode && !v.localService && (v.name.includes("Natural") || v.name.includes("Neural") || v.name.includes("Enhanced") || v.name.includes("Premium"))) ||
      availableVoices.find(v => v.lang === langCode && (v.name.includes("Google") || v.name.includes("Online"))) ||
      availableVoices.find(v => v.lang === langCode && !v.localService) ||
      availableVoices.find(v => v.lang.startsWith(langCode.split("-")[0]) && (v.name.includes("Natural") || v.name.includes("Neural"))) ||
      availableVoices.find(v => v.lang === langCode) || 
      availableVoices.find(v => v.lang.startsWith(langCode.split("-")[0])) ||
      // Fallback for Nepali
      availableVoices.find(v => (v.lang.includes("ne") || v.name.toLowerCase().includes("nepali")) && targetLang === "Nepali") ||
      availableVoices.find(v => v.lang.startsWith("hi") && targetLang === "Nepali");
    
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 0.9; 
    utterance.pitch = 1.0; 
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeakingTarget(true);
    utterance.onend = () => setIsSpeakingTarget(false);
    utterance.onerror = (e) => {
      console.error("TTS Error:", e);
      setIsSpeakingTarget(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleSourceTTS = () => {
    if (!sourceText) return;
    if (window.speechSynthesis.speaking && isSpeakingSource) {
      window.speechSynthesis.cancel();
      setIsSpeakingSource(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sourceText);
    const langCode = LANG_MAP[sourceLang] || "en-US";
    utterance.lang = langCode;

    const preferredVoice = 
      availableVoices.find(v => v.lang === langCode && !v.localService && (v.name.includes("Natural") || v.name.includes("Neural") || v.name.includes("Enhanced") || v.name.includes("Premium"))) ||
      availableVoices.find(v => v.lang === langCode && (v.name.includes("Google") || v.name.includes("Online"))) ||
      availableVoices.find(v => v.lang === langCode && !v.localService) ||
      availableVoices.find(v => v.lang.startsWith(langCode.split("-")[0]) && (v.name.includes("Natural") || v.name.includes("Neural"))) ||
      availableVoices.find(v => v.lang === langCode) || 
      availableVoices.find(v => v.lang.startsWith(langCode.split("-")[0])) ||
      // Fallback for Nepali
      availableVoices.find(v => (v.lang.includes("ne") || v.name.toLowerCase().includes("nepali")) && sourceLang === "Nepali") ||
      availableVoices.find(v => v.lang.startsWith("hi") && sourceLang === "Nepali");
    
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeakingSource(true);
    utterance.onend = () => setIsSpeakingSource(false);
    utterance.onerror = (e) => {
      console.error("Source TTS Error:", e);
      setIsSpeakingSource(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleDictate = async () => {
    if (listening) {
      if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "tmt_stop_speech" });
          }
        });
      }
      if (localRecognitionRef.current) {
        try { localRecognitionRef.current.stop(); } catch (e) {}
        localRecognitionRef.current = null;
      }
      setListening(false);
      setInterimText("");
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.session.remove("tmt_speech_active");
      }
      return;
    }

    if (typeof chrome !== "undefined" && chrome.tabs) {
      setListening(true);
      setDictateError("");
      existingTextRef.current = sourceText;
      
      // Persist the listening state so it survives popup close/reopen
      chrome.storage.session.set({ tmt_speech_active: true });
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        const id = tab?.id;
        const url = tab?.url || "";

        if (url.startsWith("chrome://") || url.startsWith("edge://") || url.startsWith("about:") || !url.startsWith("http")) {
          setDictateError("Voice dictation only works on regular websites (HTTPS). Please try on a real webpage.");
          setListening(false);
          chrome.storage.session.remove("tmt_speech_active");
          return;
        }

        if (id) {
          const sendSpeechMsg = () => {
            chrome.tabs.sendMessage(id, { 
              action: "tmt_start_speech", 
              lang: LANG_MAP[sourceLang] || "en-US" 
            }, (response) => {
              if (chrome.runtime.lastError) {
                // Content script not loaded, inject it
                chrome.scripting.executeScript({
                  target: { tabId: id },
                  files: ["content.js"]
                }, () => {
                  if (chrome.runtime.lastError) {
                    setDictateError("Cannot start voice on this page. Please refresh the page manually.");
                    setListening(false);
                    chrome.storage.session.remove("tmt_speech_active");
                    return;
                  }
                  // Retry sending after injection
                  chrome.tabs.sendMessage(id, { 
                    action: "tmt_start_speech", 
                    lang: LANG_MAP[sourceLang] || "en-US" 
                  }, (retryRes) => {
                    if (chrome.runtime.lastError || (!retryRes || retryRes.error)) {
                      setDictateError(chrome.runtime.lastError ? "Failed to start. Refresh page." : (retryRes?.error || "Error"));
                      setListening(false);
                      chrome.storage.session.remove("tmt_speech_active");
                    }
                  });
                });
              } else if (!response || response.error) {
                const msg = response?.error || "comming soon";
                setDictateError(msg);
                setListening(false);
                chrome.storage.session.remove("tmt_speech_active");
              }
            });
          };
          sendSpeechMsg();
        } else {
          setDictateError("No active tab found to process speech.");
          setListening(false);
          chrome.storage.session.remove("tmt_speech_active");
        }
      });
      return;
    }

    // Fallback for localhost / local testing without extension context
    try {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser.");
        return;
      }
      
      const recognition = new SpeechRecognition();
      localRecognitionRef.current = recognition;
      recognition.lang = LANG_MAP[sourceLang] || "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onstart = () => {
        setListening(true);
        setDictateError("");
        existingTextRef.current = sourceText;
      };

      recognition.onresult = (event: any) => {
        let finalT = "";
        let interimT = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalT += event.results[i][0].transcript;
          } else {
            interimT += event.results[i][0].transcript;
          }
        }
        if (finalT) {
          existingTextRef.current = existingTextRef.current ? existingTextRef.current + " " + finalT : finalT;
          setSourceText(existingTextRef.current);
        }
        setInterimText(interimT);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === "not-allowed") {
          setDictateError("Microphone blocked. Allow mic access in your browser settings.");
        } else if (event.error === "network") {
          setDictateError("comming soon");
        } else if (event.error === "no-speech") {
          setDictateError("No speech detected. Please try again and speak clearly.");
        } else {
          setDictateError(`Speech error: ${event.error}`);
        }
        setListening(false);
      };
      
      recognition.onend = () => {
        setListening(false);
        setInterimText("");
        localRecognitionRef.current = null;
      };

      recognition.start();
    } catch (err: any) {
      console.error("Speech Start Error:", err);
      setDictateError("Could not start voice recognition.");
      setListening(false);
    }
  };

  const charsRemaining = MAX_CHARS - sourceText.length;
  const isOverLimit = charsRemaining < 0;
  const canTranslate = enabled && !translating && !!sourceText.trim() && !isOverLimit && !listening;

  return (
    <div
      className="flex flex-col flex-1 min-h-0 border border-zinc-200/80 dark:border-white/[0.08] rounded-xl bg-white dark:bg-[#0a0a0a] overflow-hidden shadow-sm relative z-10"
    >
      {/* Source section */}
      <div className="p-3 pb-2 border-b border-zinc-100 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-transparent shrink-0">
        <LangSelector
          value={sourceLang}
          onChange={(l) => { if (l === targetLang) onTargetLangChange(sourceLang); onSourceLangChange(l); }}
          idPrefix="source"
        />
        <textarea
          ref={textareaRef}
          disabled={!enabled}
          value={listening && interimText ? (sourceText ? sourceText + " " + interimText : interimText) : sourceText}
          onChange={(e) => {
            setSourceText(e.target.value);
            existingTextRef.current = e.target.value;
          }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              handleTranslate();
            }
          }}
          placeholder="Type or paste text…"
          rows={3}
          aria-label="Source text"
          className="w-full mt-2 bg-transparent text-[14px] font-medium text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none resize-none leading-relaxed"
          style={{ maxHeight: "80px" }}
        />
        <div className="flex justify-between items-center mt-1 h-5">
          <div className="flex items-center gap-1.5">
            <AnimatePresence>
              {sourceText ? (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleClear}
                  aria-label="Clear"
                  className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200 p-0.5 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              ) : <div />}
            </AnimatePresence>
            <AnimatePresence>
              {listening && (
                <motion.div
                  key="waves"
                  initial={{ opacity: 0, width: 0, scale: 0.8 }}
                  animate={{ opacity: 1, width: "auto", scale: 1 }}
                  exit={{ opacity: 0, width: 0, scale: 0.8 }}
                  className="flex items-center justify-center gap-[3px] h-3.5 px-2 overflow-hidden"
                >
                  <motion.div animate={{ height: ["40%", "100%", "40%"] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.0 }} className="w-0.5 bg-red-500 rounded-full" />
                  <motion.div animate={{ height: ["60%", "100%", "30%", "60%"] }} transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} className="w-0.5 bg-red-500 rounded-full" />
                  <motion.div animate={{ height: ["30%", "80%", "40%"] }} transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} className="w-0.5 bg-red-500 rounded-full" />
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="relative flex items-center justify-center">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleDictate}
                disabled={!enabled}
                aria-label={listening ? "Stop Dictation" : "Dictate"}
                className={`relative z-10 p-1 rounded-full transition-colors ${
                  listening 
                    ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" 
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200"
                }`}
              >
                {listening ? <Square className="w-3.5 h-3.5" fill="currentColor" /> : <Mic className="w-3.5 h-3.5" />}
              </motion.button>
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSourceTTS}
              disabled={!sourceText}
              aria-label={isSpeakingSource ? "Stop listening" : "Listen to source text"}
              className={`p-1 rounded-full transition-colors disabled:opacity-30 ${
                isSpeakingSource 
                  ? "text-red-500 bg-red-50 dark:bg-red-500/10" 
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200"
              }`}
            >
              {isSpeakingSource ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
            </motion.button>
          </div>
          <span className={`text-[11px] font-mono ml-auto transition-colors font-semibold tracking-wide ${isOverLimit ? "text-red-600 dark:text-red-500" : "text-zinc-500 dark:text-zinc-500"}`}>
            {sourceText.length.toLocaleString()}/{MAX_CHARS.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Swap button */}
      <div className="relative z-20 -my-3.5 flex justify-center items-center h-7 pointer-events-none shrink-0">
        <motion.button
          onClick={handleSwap}
          whileHover={{ scale: 1.12, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          aria-label="Swap languages"
          className="w-8 h-8 pointer-events-auto bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-white/[0.1] rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-sm transition-colors z-20"
        >
          <ArrowDownUp className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      {/* Target section */}
      <div className="p-3 pt-2 bg-white dark:bg-[#0a0a0a] flex-1 min-h-0 flex flex-col">
        <LangSelector
          value={targetLang}
          onChange={(l) => { if (l === sourceLang) onSourceLangChange(targetLang); onTargetLangChange(l); }}
          idPrefix="target"
        />

        <div className="min-h-[64px] flex-1 mt-2 relative overflow-y-auto">
          <AnimatePresence mode="wait">
            {translating ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2.5 pt-1">
                <div className="h-3 shimmer rounded-full w-4/5" />
                <div className="h-3 shimmer rounded-full w-3/5" />
              </motion.div>
            ) : result ? (
              <motion.p
                key="result"
                initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap selection:bg-indigo-100 dark:selection:bg-indigo-900/30"
              >
                {result.translation}
              </motion.p>
            ) : (
              <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[13px] text-zinc-500 dark:text-zinc-500 select-none font-medium">
                Translation appears here
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {(error || dictateError) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-[12px] font-medium text-red-600 dark:text-red-400">
            {error || dictateError}
          </motion.div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex justify-between items-center px-3 py-2 border-t border-zinc-100 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-transparent shrink-0">
        <div className="flex items-center gap-1.5">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleCopy}
            disabled={!result}
            aria-label="Copy translation"
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed p-1.5 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-white/[0.08] transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleTTS}
            disabled={!result}
            aria-label={isSpeakingTarget ? "Stop reading" : "Read translation aloud"}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
              isSpeakingTarget 
                ? "text-red-500 bg-red-50 dark:bg-red-500/10" 
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-white/[0.08]"
            }`}
          >
            {isSpeakingTarget ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
          </motion.button>
          {/* Keyboard shortcut hint */}
          {!result && !translating && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-500 ml-1.5 select-none tracking-wide">
              <Keyboard className="w-3.5 h-3.5" /> Ctrl+Enter
            </span>
          )}
        </div>

        <motion.button
          onClick={handleTranslate}
          disabled={!canTranslate}
          whileHover={canTranslate ? { scale: 1.02 } : {}}
          whileTap={canTranslate ? { scale: 0.98 } : {}}
          className="bg-[#1a73e8] text-white dark:bg-[#8ab4f8] dark:text-[#202124] px-5 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-[#1765cc] dark:hover:bg-[#aecbfa] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {translating ? "Translating…" : "Translate"}
        </motion.button>
      </div>
    </div>
  );
}
