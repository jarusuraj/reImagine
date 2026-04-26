import { translate } from "./services/translation";
import type { Language } from "./types";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "tmt-translate",
    title: "Translate with reImagine",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "tmt-translate" || !info.selectionText || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, {
    action: "tmt_context_translate",
    text: info.selectionText,
  }).catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  // Only accept messages from this extension's own pages and content scripts
  if (sender.id !== chrome.runtime.id) return;

  if (msg.action === "tmt_translate_quick") {
    handleQuickTranslate(msg.text, msg.sourceLang, msg.targetLang).then(reply);
    return true;
  }

  if (msg.action === "tmt_speech_result") {
    chrome.storage.session.set({
      tmt_speech_pending: {
        status: "result",
        finalTranscript: msg.finalTranscript,
        interimTranscript: msg.interimTranscript,
      },
    });
    return;
  }
  if (msg.action === "tmt_speech_error") {
    chrome.storage.session.set({ tmt_speech_pending: { status: "error", error: msg.error } });
    chrome.storage.session.remove("tmt_speech_active");
    return;
  }
  if (msg.action === "tmt_speech_end") {
    chrome.storage.session.remove("tmt_speech_active");
    chrome.storage.session.get("tmt_speech_pending", (res) => {
      if (!res.tmt_speech_pending) {
        chrome.storage.session.set({ tmt_speech_pending: { status: "end" } });
      }
    });
    return;
  }
});

// In-memory cache to speed up repetitive translations and reduce API load
const translationCache = new Map<string, string>();

// Concurrency control: Browser limits to 6 connections per domain. 
// We manage our own queue of 5 to keep one slot open for the UI/other tasks.
const queue: (() => Promise<void>)[] = [];
let activeRequests = 0;
const MAX_CONCURRENT = 5;

async function processQueue() {
  if (activeRequests >= MAX_CONCURRENT || queue.length === 0) return;
  const task = queue.shift();
  if (task) {
    activeRequests++;
    await task();
    activeRequests--;
    processQueue();
  }
}

async function handleQuickTranslate(
  text: string,
  sourceLang: Language = "English",
  targetLang: Language = "Nepali",
  retries = 2
): Promise<{ translation?: string; error?: string }> {
  const cacheKey = `${sourceLang}:${targetLang}:${text}`;
  if (translationCache.has(cacheKey)) {
    return { translation: translationCache.get(cacheKey) };
  }

  return new Promise((resolve) => {
    const task = async () => {
      try {
        const res = await translate(text, sourceLang, targetLang);
        if (res.translation) {
          translationCache.set(cacheKey, res.translation);
        }
        resolve({ translation: res.translation });
      } catch (error: any) {
        // Retry logic for transient errors (like 503 or 429)
        if (retries > 0 && (error.message.includes("overwhelmed") || error.message.includes("Slow down"))) {
          await new Promise(r => setTimeout(r, 500)); // Wait 500ms before retry
          const retryRes = await handleQuickTranslate(text, sourceLang, targetLang, retries - 1);
          resolve(retryRes);
        } else {
          resolve({ error: error.message || "Translation failed" });
        }
      }
    };
    queue.push(task);
    processQueue();
  });
}
