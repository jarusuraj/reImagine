import { LANG_CODE } from "./constants/languages";
import type { Language } from "./types";

const TMT_URL = import.meta.env.TMT_API_URL;
const TMT_KEY = import.meta.env.TMT_API_KEY;
const TIMEOUT_MS = 15000;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id:       "tmt-translate",
    title:    "Translate with reImagine",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "tmt-translate" || !info.selectionText || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, {
    action: "tmt_context_translate",
    text:   info.selectionText,
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.action === "tmt_translate_quick") {
    handleQuickTranslate(msg.text, msg.sourceLang, msg.targetLang).then(reply);
    return true;
  }

  if (msg.action === "tmt_speech_result") {
    chrome.storage.session.set({ tmt_speech_pending: { status: "result", transcript: msg.transcript } });
    return;
  }
  if (msg.action === "tmt_speech_error") {
    chrome.storage.session.set({ tmt_speech_pending: { status: "error", error: msg.error } });
    return;
  }
  if (msg.action === "tmt_speech_end") {
    chrome.storage.session.get("tmt_speech_pending", (res) => {
      if (!res.tmt_speech_pending) {
        chrome.storage.session.set({ tmt_speech_pending: { status: "end" } });
      }
    });
    return;
  }
});

async function handleQuickTranslate(
  text: string,
  sourceLang: Language = "English",
  targetLang: Language = "Nepali"
): Promise<{ translation?: string; error?: string }> {
  try {
    const sanitizedText = text.trim();
    if (!sanitizedText) {
      throw new Error("No text selected.");
    }

    if (!TMT_URL || !TMT_KEY) {
      throw new Error("TMT API is not configured.");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const res = await fetch(TMT_URL, {
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

    if (!res.ok) {
      if (res.status === 401) throw new Error("API Key Invalid");
      if (res.status === 429) throw new Error("Rate Limit Exceeded");
      throw new Error(`API Error ${res.status}`);
    }
    
    const data = await res.json() as { translated_text?: string };
    
    if (!data || typeof data.translated_text !== "string") {
      throw new Error("Invalid API response.");
    }

    return { translation: data.translated_text };
  } catch (error: any) {
    if (error.name === "AbortError") {
      return { error: "Request timed out." };
    }
    return { error: error.message || "Translation failed" };
  }
}
