import { LANG_CODE } from "@/constants/languages";
import type { Language, TranslationResult } from "@/types";

const TMT_URL = import.meta.env.TMT_API_URL as string;
const TMT_KEY = import.meta.env.TMT_API_KEY as string;
const SENTENCE_TIMEOUT_MS = 15_000;

interface TMTResponse {
  message_type: "SUCCESS" | "FAIL";
  message?: string;
  src_lang?: string;
  target_lang?: string;
  input?: string;
  output: string;
  timestamp?: string;
}

function splitIntoSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (!/[.!?।]/.test(trimmed)) {
    return [trimmed];
  }

  const raw = trimmed.match(/[^.!?।]+[.!?।]?/g) ?? [trimmed];
  return raw
    .map(s => s.trim())
    .filter(s => s.length > 0 && /[a-zA-Z\u0900-\u097F]/.test(s));
}

export function detectLanguage(text: string): Language {
  const isDevanagari = /[\u0900-\u097F]/.test(text);
  if (!isDevanagari) return "English";

  const tamangMarkers = [
    "मुबा", "ताबा", "लासो", "नबा", "ह्या", "खिम", "गिबा", "ब्रोबा", "क्यु", "सुङ्बा",
    "च्यु", "मेवा", "खई", "ह्याम्बो", "निसा", "सेबा", "पापा", "आमा", "अाङा",
    "ङा", "छ्यो", "ख्याप", "ङारो", "ग्याम", "सेम", "खे",
  ];
  return tamangMarkers.some(m => text.includes(m)) ? "Tamang" : "Nepali";
}

async function translateSingleSentence(
  text: string,
  sourceLang: Language,
  targetLang: Language,
  signal: AbortSignal,
): Promise<string> {
  if (!text.trim()) return "";

  const srcCode = LANG_CODE[sourceLang]; // "English" → "en", "Tamang" → "tmg"
  const tgtCode = LANG_CODE[targetLang];

  if (srcCode === tgtCode) return text;

  const response = await fetch(TMT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TMT_KEY}`,
    },
    body: JSON.stringify({ text, src_lang: srcCode, tgt_lang: tgtCode }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized: Invalid API key.");
    }
    const body = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message || `Server returned HTTP ${response.status}`);
  }

  const data = await response.json() as TMTResponse;

  // TMT API check garna message_type hera
  if (data.message_type === "FAIL") {
    throw new Error(data.message || "Translation failed");
  }

  return data.output ?? "";
}

export async function translate(
  text: string,
  sourceLang: Language,
  targetLang: Language,
): Promise<TranslationResult> {
  const sanitizedText = text.trim();

  if (!sanitizedText) throw new Error("Please enter text to translate.");
  if (!TMT_URL || !TMT_KEY) throw new Error("TMT API is not configured. Check your credentials.");

  // Auto vane paila language detect gara
  const actualSourceLang: Language =
    sourceLang === "Auto" ? detectLanguage(sanitizedText) : sourceLang;

  if (actualSourceLang === targetLang) {
    return { sourceLang: actualSourceLang, targetLang, sourceText: sanitizedText, translation: sanitizedText };
  }

  const sentences = splitIntoSentences(sanitizedText);
  if (sentences.length === 0) throw new Error("Please enter text to translate.");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SENTENCE_TIMEOUT_MS * sentences.length);

  try {
    const translatedSentences = await Promise.all(
      sentences.map(s => translateSingleSentence(s, actualSourceLang, targetLang, controller.signal)),
    );
    clearTimeout(timeoutId);

    return {
      sourceLang: actualSourceLang,
      targetLang,
      sourceText: sanitizedText,
      translation: translatedSentences.filter(Boolean).join(" "),
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") throw new Error("The server is taking too long to respond. Please try again.");

    const msg: string = error.message || "";
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("fetch"))
      throw new Error("Connection failed. Please check your internet or try again later.");
    if (msg.includes("Unauthorized") || msg.includes("401") || msg.includes("403"))
      throw new Error("There's an issue with the translation key. Please double-check your .env file.");
    if (msg.includes("429") || msg.includes("Too Many Requests"))
      throw new Error("Slow down! You've sent too many requests. Wait a moment and try again.");
    if (msg.includes("500") || msg.includes("502") || msg.includes("503"))
      throw new Error("The translation server is currently overwhelmed. Let's try again in a few seconds.");
    if (msg) throw error;

    throw new Error("Oops! Something went wrong while translating. Please try again.");
  }
}
