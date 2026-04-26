import { LANG_CODE } from "@/constants/languages";
import type { Language, TranslationResult } from "@/types";

const TMT_URL = import.meta.env.TMT_API_URL;
const TMT_KEY = import.meta.env.TMT_API_KEY;
const TIMEOUT_MS = 30000; // Increased timeout for multiple sentences

interface TMTResponse {
  message_type: "SUCCESS" | "FAIL";
  message: string;
  src_lang: string;
  input: string;
  target_lang: string;
  output: string;
  timestamp: string;
}

function splitIntoSentences(text: string): string[] {
  const sentences = text.match(/[^.!?।]+[.!?।]?/g);
  return sentences 
    ? sentences
        .map(s => s.trim())
        .filter(s => s.length > 1 || /[a-zA-Z\u0900-\u097F]/.test(s))
    : [text.trim()];
}

function detectLanguage(text: string): Language {
  const isDevanagari = /[\u0900-\u097F]/.test(text);
  if (!isDevanagari) return "English";

  // Common Tamang markers in Devanagari script
  const tamangMarkers = [
    "मुबा", "ताबा", "लासो", "नबा", "ह्या", "खिम", "गिबा", "ब्रोबा", "क्यु", "सुङ्बा",
    "च्यु", "मेवा", "खई", "ह्याम्बो", "निसा", "सेबा", "पापा", "आमा", "अाङा",
    "ङा", "छ्यो", "ख्याप", "ङारो", "ग्याम", "सेम", "खे"
  ];
  const isTamang = tamangMarkers.some(marker => text.includes(marker));
  return isTamang ? "Tamang" : "Nepali";
}

async function translateSingleSentence(
  text: string,
  sourceLang: Language,
  targetLang: Language,
  signal: AbortSignal
): Promise<string> {
  const response = await fetch(TMT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TMT_KEY}`,
    },
    body: JSON.stringify({
      text: text,
      src_lang: LANG_CODE[sourceLang],
      tgt_lang: LANG_CODE[targetLang],
    }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized: Invalid API key.");
    }
    const body = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message || `Server returned error (${response.status})`);
  }

  const data = await response.json() as TMTResponse;

  if (data.message_type === "FAIL") {
    throw new Error(data.message || "Translation failed");
  }

  return data.output;
}

export async function translate(
  text: string,
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

  const actualSourceLang = sourceLang === "Auto" ? detectLanguage(sanitizedText) : sourceLang;
  const sentences = splitIntoSentences(sanitizedText);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Translate all sentences in parallel for speed
    const translatedSentences = await Promise.all(
      sentences.map(sentence => 
        translateSingleSentence(
          sentence,
          actualSourceLang,
          targetLang,
          controller.signal
        )
      )
    );

    clearTimeout(timeoutId);

    return {
      sourceLang: actualSourceLang,
      targetLang,
      sourceText: sanitizedText,
      translation: translatedSentences.join(" ")
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === "AbortError") {
      throw new Error("The server is taking a bit too long to respond. Please try again.");
    }

    const msg = error.message || "";
    
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      throw new Error("Connection failed. Please check your internet or try again later.");
    }
    
    if (msg.includes("Unauthorized") || msg.includes("401") || msg.includes("403")) {
      throw new Error("There's an issue with the translation key. Please double-check your .env file.");
    }

    if (msg.includes("429") || msg.includes("Too Many Requests")) {
      throw new Error("Slow down! You've sent too many requests. Wait a moment and try again.");
    }

    if (msg.includes("500") || msg.includes("502") || msg.includes("503")) {
      throw new Error("The translation server is currently overwhelmed. Let's try again in a few seconds.");
    }

    throw new Error("Oops! Something went wrong while translating. Please try again.");
  }
}
