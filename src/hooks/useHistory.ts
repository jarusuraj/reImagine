import { useState, useEffect, useCallback } from "react";
import type { HistoryEntry, TranslationResult } from "@/types";

const STORAGE_KEY = "tmt_history_v1";
const MAX_ENTRIES = 50;

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setHistory(JSON.parse(raw));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const add = useCallback((result: TranslationResult) => {
    const entry: HistoryEntry = { ...result, id: crypto.randomUUID(), timestamp: Date.now() };
    setHistory((prev) => [entry, ...prev].slice(0, MAX_ENTRIES));
  }, []);

  const remove = useCallback((id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, add, remove, clear };
}
