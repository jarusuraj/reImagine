import { useState, useEffect, useCallback } from "react";
import type { HistoryEntry, TranslationResult } from "@/types";

const STORAGE_KEY = "tmt_history_v1";
const MAX_ENTRIES = 50;

function chromeStorageAvailable(): boolean {
  return typeof chrome !== "undefined" && !!chrome.storage?.local;
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Load on mount
  useEffect(() => {
    if (chromeStorageAvailable()) {
      chrome.storage.local.get([STORAGE_KEY], (res) => {
        if (Array.isArray(res[STORAGE_KEY])) {
          setHistory(res[STORAGE_KEY]);
        }
      });
    } else {
      // Fallback for local dev (no extension context)
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    }
  }, []);

  // Persist on every change
  useEffect(() => {
    if (chromeStorageAvailable()) {
      chrome.storage.local.set({ [STORAGE_KEY]: history });
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }
  }, [history]);

  const add = useCallback((result: TranslationResult) => {
    const entry: HistoryEntry = {
      ...result,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setHistory((prev) => [entry, ...prev].slice(0, MAX_ENTRIES));
  }, []);

  const remove = useCallback((id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    if (chromeStorageAvailable()) {
      chrome.storage.local.remove(STORAGE_KEY);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return { history, add, remove, clear };
}