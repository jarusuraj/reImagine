import { translate } from "./services/translation";
import type { Language } from "./types";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "reImagine-translate",
    title: "Translate with reImagine",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "reImagine-translate" || !info.selectionText || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, {
    action: "reImagine_context_translate",
    text: info.selectionText,
  }).catch(() => {});
});


chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return;

  
  
  if (msg.action === "reImagine_keepalive") {
    reply({ alive: true });
    return true;
  }

  if (msg.action === "reImagine_translate_quick") {
    handleQuickTranslate(msg.text, msg.sourceLang, msg.targetLang).then(reply);
    return true;
  }

  if (msg.action === "reImagine_speech_result") {
    chrome.storage.session.set({
      reImagine_speech_pending: {
        status: "result",
        finalTranscript: msg.finalTranscript,
        interimTranscript: msg.interimTranscript,
      },
    });
    return;
  }
  if (msg.action === "reImagine_speech_error") {
    chrome.storage.session.set({ reImagine_speech_pending: { status: "error", error: msg.error } });
    chrome.storage.session.remove("reImagine_speech_active");
    return;
  }
  if (msg.action === "reImagine_speech_end") {
    chrome.storage.session.remove("reImagine_speech_active");
    chrome.storage.session.get("reImagine_speech_pending", (res) => {
      if (!res.reImagine_speech_pending) {
        chrome.storage.session.set({ reImagine_speech_pending: { status: "end" } });
      }
    });
    return;
  }
});

const translationCache = new Map<string, string>();

const queue: Array<() => Promise<void>> = [];
let activeRequests = 0;
const MAX_CONCURRENT = 5;

function processQueue(): void {
  while (activeRequests < MAX_CONCURRENT && queue.length > 0) {
    const task = queue.shift();
    if (!task) break;
    activeRequests++;
    task().finally(() => {
      activeRequests--;
      processQueue();
    });
  }
}

async function handleQuickTranslate(
  text: string,
  sourceLang: Language = "English",
  targetLang: Language = "Nepali",
): Promise<{ translation?: string; error?: string }> {
  if (!text?.trim()) return { translation: "" };

  const cacheKey = `${sourceLang}:${targetLang}:${text}`;
  if (translationCache.has(cacheKey)) {
    return { translation: translationCache.get(cacheKey) };
  }

  return new Promise((resolve) => {
    const task = async () => {
      let retries = 2;
      while (true) {
        try {
          const res = await translate(text, sourceLang, targetLang);
          if (res.translation) translationCache.set(cacheKey, res.translation);
          resolve({ translation: res.translation });
          return;
        } catch (error: any) {
          const msg: string = error.message || "";
          const isTransient =
            msg.includes("overwhelmed") ||
            msg.includes("Slow down") ||
            msg.includes("Too Many Requests");

          if (retries > 0 && isTransient) {
            const delay = 500 * (3 - retries);
            await new Promise(r => setTimeout(r, delay));
            retries--;
          } else {
            resolve({ error: msg || "Translation failed" });
            return;
          }
        }
      }
    };
    queue.push(task);
    processQueue();
  });
}
// Service worker handling context menus, message routing, translation queuing, and speech result storage.
