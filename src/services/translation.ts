import { LANG_CODE } from "@/constants/languages";
import type { Language, TranslationResult } from "@/types";

const TMT_URL = import.meta.env.TMT_API_URL;
const TMT_KEY = import.meta.env.TMT_API_KEY;
const TIMEOUT_MS = 15000;

export async function translate(
  text:       string,
  sourceLang: Language,
  targetLang: Language,
): Promise<TranslationResult> {
  const sanitizedText = text.trim();
  
  if (!sanitizedText) {
    throw new Error("Please enter text to translate.");
  }
  
  if (!TMT_URL || !TMT_KEY) {
    throw new Error("TMT API is not configured. Check your credentials.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(TMT_URL, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${TMT_KEY}`,
      },
      body: JSON.stringify({
        text: sanitizedText,
        source_lang: LANG_CODE[sourceLang],
        target_lang: LANG_CODE[targetLang],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Unauthorized: Invalid API key.");
      }
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please wait a moment.");
      }
      const body = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(body.message || `Server returned error (${response.status})`);
    }

    const data = await response.json() as { translated_text?: string };
    
    if (!data || typeof data.translated_text !== "string") {
      throw new Error("Received malformed or empty response from the server.");
    }

    return { 
      sourceLang, 
      targetLang, 
      sourceText: sanitizedText, 
      translation: data.translated_text 
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Request timed out. The server is taking too long to respond.");
    }
    
    if (error.message && error.message !== "Failed to fetch") {
      throw error;
    }
    throw new Error("Failed to connect to the translation service.");
  }
}
