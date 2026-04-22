import { useState, useCallback, useRef } from "react";
import { translate } from "@/services/translation";
import type { Language, TranslationResult } from "@/types";

export function useTranslation() {
  const [result,      setResult]      = useState<TranslationResult | null>(null);
  const [translating, setTranslating] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const translatingRef = useRef(false);

  const run = useCallback(async (
    text: string,
    sourceLang: Language,
    targetLang: Language,
  ): Promise<TranslationResult | null> => {
    if (!text.trim() || translatingRef.current) return null;
    
    translatingRef.current = true;
    setTranslating(true);
    setError(null);
    
    try {
      const res = await translate(text, sourceLang, targetLang);
      setResult(res);
      return res;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
      return null;
    } finally {
      translatingRef.current = false;
      setTranslating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, translating, error, run, reset };
}
