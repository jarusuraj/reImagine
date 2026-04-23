(() => {
  "use strict";
  if ((window as any).tmt_injected) return;
  (window as any).tmt_injected = true;

  let overlay: HTMLDivElement | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let activeRecognition: any = null;
  
  let pageSourceLang = "English";
  let pageTargetLang = "Nepali";
  let extensionEnabled = true;

  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(["extensionEnabled"], (res) => {
      if (res.extensionEnabled !== undefined) extensionEnabled = Boolean(res.extensionEnabled);
      
      if (document.readyState === "complete" || document.readyState === "interactive") {
        checkLanguagePrompt();
      } else {
        document.addEventListener("DOMContentLoaded", checkLanguagePrompt);
      }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.extensionEnabled) {
        extensionEnabled = Boolean(changes.extensionEnabled.newValue);
        if (!extensionEnabled) {
          removeOverlay();
          removeStatusPill();
          const pagePrompt = document.getElementById("tmt-page-prompt");
          if (pagePrompt) pagePrompt.remove();
        }
      }
    });
  }

  function mountOverlay(x: number, y: number, text: string) {
    removeOverlay();

    overlay = document.createElement("div");
    overlay.id = "tmt-overlay";

    showShimmer();

    overlay.style.left = `${x + window.scrollX + 8}px`;
    overlay.style.top  = `${y + window.scrollY + 8}px`;
    document.body.appendChild(overlay);

    requestTranslation(text);
  }

  function showShimmer() {
    if (!overlay) return;
    overlay.innerHTML = `
      <div class="tmt-shimmer-card">
        <div class="tmt-shimmer-header">
          <span class="tmt-badge">TMT</span>
          <button class="tmt-close">✕</button>
        </div>
        <div class="tmt-shimmer-body">
          <div class="tmt-shimmer" style="width:85%"></div>
          <div class="tmt-shimmer" style="width:60%"></div>
          <div class="tmt-shimmer" style="width:72%"></div>
        </div>
      </div>
    `;
    overlay.querySelector(".tmt-close")?.addEventListener("click", removeOverlay);
  }

  function showResult(translation: string, detectedLang?: string) {
    if (!overlay) return;
    const langLabel = detectedLang ?? "Auto";
    overlay.innerHTML = `
      <div class="tmt-result">
        <div class="tmt-result-header">
          <div style="display:flex;align-items:center">
            <span class="tmt-badge">reImagine</span>
            <span class="tmt-source-label">${escapeHtml(langLabel)}</span>
          </div>
          <button class="tmt-close">✕</button>
        </div>
        <p class="tmt-text">${escapeHtml(translation)}</p>
        <div class="tmt-result-footer">
          <button class="tmt-copy-btn" title="Copy translation">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    overlay.querySelector(".tmt-close")?.addEventListener("click", removeOverlay);
    overlay.querySelector(".tmt-copy-btn")?.addEventListener("click", () => {
      navigator.clipboard.writeText(translation).catch(() => {});
      const btn = overlay?.querySelector(".tmt-copy-btn");
      if (btn) {
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        setTimeout(() => {
          if (btn) btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;
        }, 1500);
      }
    });
  }

  function showError(msg: string) {
    if (!overlay) return;
    overlay.innerHTML = `<div class="tmt-error-msg">⚠ ${escapeHtml(msg)}</div>`;
    setTimeout(removeOverlay, 3000);
  }

  function removeOverlay() {
    overlay?.remove();
    overlay = null;
  }

  function escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function requestTranslation(text: string) {
    chrome.runtime.sendMessage({ 
      action: "tmt_translate_quick", 
      text,
      sourceLang: pageSourceLang,
      targetLang: pageTargetLang 
    }, (res) => {
      if (chrome.runtime.lastError) return showError("Extension error");
      if (res?.translation) showResult(res.translation);
      else showError(res?.error ?? "Failed");
    });
  }

  const ORIG_ATTR = "data-tmt-original";
  let pageActive  = false;
  let statusPill: HTMLDivElement | null = null;

  function collectTextNodes(root: Element): Text[] {
    const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "CODE", "PRE"]);
    const nodes: Text[] = [];

    const walk = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE && skip.has((node as Element).tagName)) return;
      
      if (node.nodeType === Node.TEXT_NODE) {
        const val = node.nodeValue || "";
        if (val.trim().length > 1) {
          nodes.push(node as Text);
        }
        return;
      }
      
      node.childNodes.forEach(walk);
    };

    walk(root);
    return nodes;
  }

  function mountStatusPill() {
    removeStatusPill();
    statusPill = document.createElement("div");
    statusPill.className = "tmt-status-pill";
    statusPill.innerHTML = `
      <div class="tmt-progress-bg" style="width: 0%"></div>
      <div class="tmt-status-icon"></div>
      <div class="tmt-status-text">Translating… <span>0%</span></div>
      <button class="tmt-restore-btn" style="display:none">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 105.64-11.36L1 10"/></svg>
        Restore
      </button>
    `;
    document.body.appendChild(statusPill);
  }

  function updateStatusPill(done: number, total: number) {
    if (!statusPill) return;
    const percentage = total === 0 ? 100 : Math.min(100, Math.round((done / total) * 100));
    const textEl = statusPill.querySelector(".tmt-status-text span");
    const bgEl = statusPill.querySelector(".tmt-progress-bg") as HTMLElement;
    
    if (textEl) textEl.textContent = `${percentage}%`;
    if (bgEl) bgEl.style.width = `${percentage}%`;
  }

  function completeStatusPill() {
    if (!statusPill) return;
    
    const bgEl = statusPill.querySelector(".tmt-progress-bg") as HTMLElement;
    if (bgEl) {
      bgEl.style.width = "100%";
      bgEl.style.background = "rgba(16, 185, 129, 0.1)";
    }

    const icon = statusPill.querySelector(".tmt-status-icon");
    if (icon) {
      icon.classList.add("tmt-done");
      icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    }
    const textEl = statusPill.querySelector(".tmt-status-text");
    if (textEl) textEl.innerHTML = `Page translated ✓`;

    const restoreBtn = statusPill.querySelector(".tmt-restore-btn") as HTMLElement | null;
    if (restoreBtn) {
      restoreBtn.style.display = "inline-flex";
      restoreBtn.addEventListener("click", () => {
        restorePage();
        removeStatusPill();
      });
    }

    setTimeout(() => {
      if (statusPill && !statusPill.matches(":hover")) {
        dismissStatusPill();
      }
    }, 8000);
  }

  function dismissStatusPill() {
    if (!statusPill) return;
    statusPill.classList.add("tmt-pill-out");
    setTimeout(removeStatusPill, 250);
  }

  function removeStatusPill() {
    statusPill?.remove();
    statusPill = null;
  }

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  async function translatePage() {
    if (pageActive) return;
    pageActive = true;
    
    const pagePrompt = document.getElementById("tmt-page-prompt");
    if (pagePrompt) {
      pagePrompt.classList.add("tmt-prompt-out");
      setTimeout(() => pagePrompt.remove(), 300);
    }

    const nodes = collectTextNodes(document.body);
    const total = nodes.length;
    const BATCH = 5; 
    let done = 0;

    mountStatusPill();
    updateStatusPill(0, total);

    for (let i = 0; i < nodes.length; i += BATCH) {
      if (!pageActive) break;

      await Promise.all(
        nodes.slice(i, i + BATCH).map(
          (node) =>
            new Promise<void>((resolve) => {
              const orig = node.nodeValue?.trim();
              if (!orig) { done++; resolve(); return; }
              if (!node.parentElement?.hasAttribute(ORIG_ATTR)) {
                node.parentElement?.setAttribute(ORIG_ATTR, node.nodeValue ?? "");
              }
              chrome.runtime.sendMessage({ 
                action: "tmt_translate_quick", 
                text: orig,
                sourceLang: pageSourceLang,
                targetLang: pageTargetLang
              }, (res) => {
                if (chrome.runtime.lastError) { 
                  done++; 
                  updateStatusPill(done, total); 
                  resolve(); 
                  return; 
                }
                if (res?.translation) node.nodeValue = res.translation;
                done++;
                updateStatusPill(done, total);
                resolve();
              });
            }),
        ),
      );

      await delay(50);
    }

    if (pageActive) {
      completeStatusPill();
    }
  }

  function restorePage() {
    document.querySelectorAll(`[${ORIG_ATTR}]`).forEach((el) => {
      const orig = el.getAttribute(ORIG_ATTR);
      for (const child of el.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          child.nodeValue = orig ?? "";
          break;
        }
      }
      el.removeAttribute(ORIG_ATTR);
    });
    pageActive = false;
  }

  function checkLanguagePrompt() {
    if (!extensionEnabled) return;

    // Give dynamic pages a moment to finish rendering before we check the script
    setTimeout(() => {
      const sampleText = document.body?.innerText?.substring(0, 3000) || "";
      if (sampleText.trim().length < 50) return;

      // Look for Devanagari characters to see if this is likely Nepali or Tamang content
      const devanagariChars = (sampleText.match(/[\u0900-\u097F]/g) || []).length;
      
      let detectedLangCode = "en";
      if (devanagariChars > 20) {
        detectedLangCode = "ne";
      }

      const domainKey = `tmt_dismissed_${window.location.hostname}`;
      chrome.storage.local.get([domainKey], (res) => {
        if (!res[domainKey] && !sessionStorage.getItem("tmt_prompt_session_dismissed")) {
          showPagePrompt(detectedLangCode);
        }
      });
    }, 1500);
  }

  function showPagePrompt(langCode: string) {
    if (document.getElementById("tmt-page-prompt") || pageActive) return;
    
    let displayLang = "English";
    let autoSource = "English";
    let autoTarget = "Nepali";

    if (langCode.startsWith("ne")) {
       displayLang = "Nepali";
       autoSource = "Nepali";
       autoTarget = "English";
    }
    if (langCode.startsWith("ta")) {
       displayLang = "Tamang";
       autoSource = "Tamang";
       autoTarget = "English";
    }

    const prompt = document.createElement("div");
    prompt.id = "tmt-page-prompt";
    prompt.innerHTML = `
      <div class="tmt-prompt-content">
        <div class="tmt-prompt-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </div>
        <div class="tmt-prompt-text">
          <span class="tmt-prompt-title">reImagine: Translate Page?</span>
          <span class="tmt-prompt-desc">This page is in ${displayLang}. Translate to ${autoTarget}?</span>
        </div>
        <div class="tmt-prompt-actions">
           <button class="tmt-prompt-btn tmt-prompt-btn-primary" id="tmt-prompt-yes">Translate</button>
           <button class="tmt-prompt-btn" id="tmt-prompt-no">✕</button>
        </div>
      </div>
    `;
    document.body.appendChild(prompt);

    prompt.querySelector("#tmt-prompt-yes")?.addEventListener("click", () => {
      pageSourceLang = autoSource;
      pageTargetLang = autoTarget;
      translatePage();
    });

    prompt.querySelector("#tmt-prompt-no")?.addEventListener("click", () => {
      const domainKey = `tmt_dismissed_${window.location.hostname}`;
      chrome.storage.local.set({ [domainKey]: true });
      sessionStorage.setItem("tmt_prompt_session_dismissed", "true");
      prompt.classList.add("tmt-prompt-out");
      setTimeout(() => prompt.remove(), 300);
    });
  }

  document.addEventListener("mouseup", (e) => {
    if (!extensionEnabled) return;
    const sel = window.getSelection()?.toString().trim();
    if (!sel || sel.length < 2) { removeOverlay(); return; }
    if (overlay?.contains(e.target as Node)) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    const mx = e.clientX;
    const my = e.clientY;
    debounceTimer = setTimeout(() => {
      const currentSel = window.getSelection()?.toString().trim();
      if (currentSel && currentSel.length >= 2) {
        mountOverlay(mx, my, currentSel);
      }
    }, 600);
  });

  document.addEventListener("mousedown", (e) => {
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
    if (overlay && !overlay.contains(e.target as Node)) removeOverlay();
  });

  window.addEventListener("scroll", () => {
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
    removeOverlay();
  }, { passive: true });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!extensionEnabled && msg.action !== "tmt_get_page_status") return;
    if (msg.action === "tmt_page_translate") {
      pageSourceLang = msg.sourceLang || "English";
      pageTargetLang = msg.targetLang || "Nepali";
      translatePage();
    } else if (msg.action === "tmt_page_restore") {
      restorePage();
      removeStatusPill();
    } else if (msg.action === "tmt_get_page_status") {
      sendResponse({ pageActive });
    } else if (msg.action === "tmt_context_translate") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        mountOverlay(rect.left, rect.bottom, msg.text);
      }
    } else if (msg.action === "tmt_start_speech") {
      const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!SR) { sendResponse({ error: "comming soon" }); return; }
      
      if (activeRecognition) {
        try { activeRecognition.stop(); } catch (e) {}
      }

      activeRecognition = new SR();
      activeRecognition.lang = msg.lang || "en-US";
      activeRecognition.interimResults = true;
      activeRecognition.continuous = true;
      activeRecognition.maxAlternatives = 1;
      
      activeRecognition.onresult = (e: any) => {
        let finalTranscript = "";
        let interimTranscript = "";
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalTranscript += e.results[i][0].transcript;
          } else {
            interimTranscript += e.results[i][0].transcript;
          }
        }
        chrome.runtime.sendMessage({ action: "tmt_speech_result", finalTranscript, interimTranscript }).catch(() => {});
      };
      
      activeRecognition.onerror = (e: any) => {
        chrome.runtime.sendMessage({ action: "tmt_speech_error", error: e.error }).catch(() => {});
      };
      
      activeRecognition.onend = () => {
        chrome.runtime.sendMessage({ action: "tmt_speech_end" }).catch(() => {});
        activeRecognition = null;
      };
      
      try {
        activeRecognition.start();
        sendResponse({ started: true });
      } catch (err: any) {
        sendResponse({ error: err.message });
        activeRecognition = null;
      }
      return true;
    } else if (msg.action === "tmt_stop_speech") {
      if (activeRecognition) {
        try {
          activeRecognition.stop();
        } catch (e) {}
        activeRecognition = null;
      }
      sendResponse({ stopped: true });
      return true;
    }
  });
})();
