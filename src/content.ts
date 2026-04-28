(() => {
  "use strict";

  // Reload huda purano UI hata
  document.getElementById("tmt-overlay")?.remove();
  document.getElementById("tmt-page-prompt")?.remove();
  document.querySelector(".tmt-status-pill")?.remove();
  
  const oldObs = document.body ? (document.body as any)._tmtObserver as IntersectionObserver | undefined : undefined;
  if (oldObs) {
    oldObs.disconnect();
    delete (document.body as any)._tmtObserver;
  }

  let overlay: HTMLDivElement | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let activeRecognition: any = null;
  let micTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let currentAudio: HTMLAudioElement | null = null;
  let isDraggingGlobal = false;
  const MIC_TIMEOUT_MS = 60_000;

  // Security ko lagi policy bana
  let ttPolicy: any;
  if (typeof (window as any).trustedTypes !== "undefined" && (window as any).trustedTypes.createPolicy) {
    try {
      ttPolicy = (window as any).trustedTypes.createPolicy("tmt-policy", {
        createHTML: (s: string) => s
      });
    } catch (e) {
      console.warn("TMT: Failed to create TrustedTypes policy", e);
    }
  }

  function safeHTML(html: string): string {
    return ttPolicy ? ttPolicy.createHTML(html) : html;
  }

  let pageSourceLang = "English";
  let pageTargetLang = "Nepali";
  let extensionEnabled = true;

  if (typeof chrome !== "undefined" && chrome.storage) {
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
          document.getElementById("tmt-page-prompt")?.remove();
        }
      }
    });
  }

  
  function makeDraggable(el: HTMLElement, handleSelector: string) {
    const handle = el.querySelector(handleSelector) as HTMLElement;
    if (!handle) return;
    handle.style.cursor = "grab";
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      handle.style.cursor = "grabbing";
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = el.offsetLeft;
      initialTop = el.offsetTop;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };
    const onMouseMove = (e: MouseEvent) => {
      isDraggingGlobal = true;
      el.style.left = `${initialLeft + (e.clientX - startX)}px`;
      el.style.top = `${initialTop + (e.clientY - startY)}px`;
    };
    const onMouseUp = () => {
      handle.style.cursor = "grab";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      // Briefly keep the flag true to prevent the global mouseup listener from firing a new overlay
      setTimeout(() => { isDraggingGlobal = false; }, 50);
    };
    handle.addEventListener("mousedown", onMouseDown);
  }

  function mountOverlay(x: number, y: number, text: string) {
    if (!document.body) return;
    // Set manual translation flag to enable page prompts later
    chrome.storage.local.set({ hasManuallyTranslated: true });
    
    removeOverlay();
    overlay = document.createElement("div");
    overlay.id = "tmt-overlay";
    showShimmer();
    overlay.style.left = `${x + window.scrollX + 8}px`;
    overlay.style.top  = `${y + window.scrollY + 8}px`;
    document.body.appendChild(overlay);
    requestTranslation(text);
    makeDraggable(overlay, ".tmt-shimmer-header");
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
    // Security ko lagi HTML escape gara
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
        <div class="tmt-result-footer" style="gap: 8px;">
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

    makeDraggable(overlay, ".tmt-result-header");
  }

  function showError(msg: string) {
    if (!overlay) return;
    overlay.innerHTML = safeHTML(`
      <div class="tmt-error-card">
        <div class="tmt-error-icon">⚠</div>
        <div class="tmt-error-text">${escapeHtml(msg)}</div>
      </div>
    `) as any;
    setTimeout(removeOverlay, 4000);
  }

  function removeOverlay() {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    window.speechSynthesis.cancel();
    document.getElementById("tmt-overlay")?.remove();
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
      targetLang: pageTargetLang,
    }, (res) => {
      if (chrome.runtime.lastError) return showError("Extension error");
      if (res?.translation) showResult(res.translation);
      else showError(res?.error ?? "Failed");
    });
  }


  const originalValues = new WeakMap<Text, string>();
  let translatedNodes = new WeakSet<Text>();
  let pageActive = false;
  let statusPill: HTMLDivElement | null = null;
  let nodesDone = 0;
  let totalNodes = 0;

  function collectTextNodes(root: Element): Text[] {
    const skipTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "CODE", "PRE"]);
    const nodes: Text[] = [];

    const walk = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (skipTags.has(el.tagName)) return;
        // Edit garna milne thau xoda
        if (el.getAttribute("contenteditable") !== null) return;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const val = node.nodeValue || "";
        // Khali thau translate nagarne
        if (val.trim().length > 1) nodes.push(node as Text);
        return;
      }

      node.childNodes.forEach(walk);
    };

    walk(root);
    return nodes;
  }


  function mountStatusPill() {
    // Loading bar luka
  }

  function updateStatusPill(_done: number, _total: number) {
    // Progress update nagarne
  }

  function completeStatusPill() {
    removeStatusPill();
    statusPill = document.createElement("div");
    statusPill.className = "tmt-status-pill";
    statusPill.innerHTML = safeHTML(`
      <div class="tmt-progress-bg" style="width: 100%; background: rgba(16, 185, 129, 0.1)"></div>
      <div class="tmt-status-icon tmt-done">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="tmt-status-text">Page translated ✓</div>
      <button class="tmt-restore-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 105.64-11.36L1 10"/></svg>
        Restore
      </button>
    `) as any;
    document.body.appendChild(statusPill);

    const restoreBtn = statusPill.querySelector(".tmt-restore-btn") as HTMLElement | null;
    if (restoreBtn) {
      restoreBtn.addEventListener("click", () => {
        restorePage();
        removeStatusPill();
      });
    }

    setTimeout(() => {
      if (statusPill && !statusPill.matches(":hover")) dismissStatusPill();
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
    nodesDone = 0;
    totalNodes = 0;
  }


  async function translateNode(node: Text, retries = 2): Promise<void> {
    if (translatedNodes.has(node) || !pageActive) return;

    const val = node.nodeValue || "";
    const orig = val.trim();

    if (!orig) {
      translatedNodes.add(node);
      nodesDone++;
      updateStatusPill(nodesDone, totalNodes);
      return;
    }

    if (!originalValues.has(node)) originalValues.set(node, val);

    return new Promise<void>((resolve) => {
      const attempt = () => {
        try {
          chrome.runtime.sendMessage({
            action: "tmt_translate_quick",
            text: orig,
            sourceLang: pageSourceLang,
            targetLang: pageTargetLang,
          }, (res) => {
            if (chrome.runtime.lastError) {
              // Service worker restart bhako bhaye feri try garne
              if (retries > 0 && pageActive) {
                setTimeout(() => translateNode(node, retries - 1).then(resolve), 700);
              } else {
                nodesDone++;
                updateStatusPill(nodesDone, totalNodes);
                if (nodesDone >= totalNodes) completeStatusPill();
                resolve();
              }
              return;
            }

            if (res?.translation && pageActive) {
              const prefix = val.match(/^\s*/)?.[0] || "";
              const suffix = val.match(/\s*$/)?.[0] || "";
              node.nodeValue = prefix + res.translation + suffix;
              translatedNodes.add(node);
            }
            nodesDone++;
            updateStatusPill(nodesDone, totalNodes);
            if (nodesDone >= totalNodes) completeStatusPill();
            resolve();
          });
        } catch (e) {
          // Reload bhako vane stop garne
          // The old script should just quietly die.
          pageActive = false;
          resolve();
        }
      };
      attempt();
    });
  }

  async function translatePage() {
    if (pageActive || !document.body) return;
    pageActive = true;
    let keepAlive: number | undefined;
    let observer: IntersectionObserver | undefined;

    try {
      const pagePrompt = document.getElementById("tmt-page-prompt");
      if (pagePrompt) {
        pagePrompt.classList.add("tmt-prompt-out");
        setTimeout(() => pagePrompt.remove(), 300);
      }

      document.body.setAttribute("data-tmt-active", "true");
      const allNodes = collectTextNodes(document.body);
      totalNodes = allNodes.length;
      nodesDone = 0;
      mountStatusPill();
      updateStatusPill(0, totalNodes);

      if (allNodes.length === 0) {
        completeStatusPill();
        return;
      }

      // Service worker active rakhna
      keepAlive = setInterval(() => {
        try {
          chrome.runtime.sendMessage({ action: "tmt_keepalive" }).catch(() => {});
        } catch (e) {
          clearInterval(keepAlive);
        }
      }, 25_000) as unknown as number;

      // Dekhine ra nadekhine thau xutyau
      const viewportNodes: Text[] = [];
      const lazyNodes: Text[] = [];

      for (const node of allNodes) {
        const rect = node.parentElement?.getBoundingClientRect();
        if (rect && rect.top < window.innerHeight + 300 && rect.bottom > -300) {
          viewportNodes.push(node);
        } else {
          lazyNodes.push(node);
        }
      }

      // Dekhine thau paila translate garne
      const BATCH_SIZE = 5;
      const BATCH_DELAY_MS = 150;

      for (let i = 0; i < viewportNodes.length; i += BATCH_SIZE) {
        if (!pageActive) { clearInterval(keepAlive); return; }
        const batch = viewportNodes.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(n => translateNode(n)));
        if (i + BATCH_SIZE < viewportNodes.length) {
          await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
        }
      }

      // Nadekhine thau scroll garda translate garne
      if (lazyNodes.length === 0) {
        clearInterval(keepAlive);
        if (pageActive) completeStatusPill();
        return;
      }

      // Parent anusar group banau
      const parentMap = new Map<HTMLElement, Text[]>();
      for (const node of lazyNodes) {
        if (!node.parentElement) continue;
        const existing = parentMap.get(node.parentElement) ?? [];
        existing.push(node);
        parentMap.set(node.parentElement, existing);
      }

      // Rate limit ko lagi buffer gara
      let pendingElements: HTMLElement[] = [];
      let lazyTimer: ReturnType<typeof setTimeout> | null = null;

      const flushPending = async () => {
        if (!pageActive) return;
        const toProcess = pendingElements.splice(0);
        const batchNodes = toProcess.flatMap(el => parentMap.get(el) ?? []);
        for (let i = 0; i < batchNodes.length; i += BATCH_SIZE) {
          if (!pageActive) { clearInterval(keepAlive); return; }
          await Promise.all(batchNodes.slice(i, i + BATCH_SIZE).map(n => translateNode(n)));
          if (i + BATCH_SIZE < batchNodes.length) {
            await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
          }
        }
      };

      observer = new IntersectionObserver((entries) => {
        let hasNew = false;
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            observer?.unobserve(entry.target);
            pendingElements.push(entry.target as HTMLElement);
            hasNew = true;
          }
        });
        if (hasNew) {
          if (lazyTimer) clearTimeout(lazyTimer);
          // Msg pathuna wait gara
          lazyTimer = setTimeout(() => { flushPending(); }, 100);
        }
      }, { rootMargin: "300px 0px", threshold: 0.01 });

      parentMap.forEach((_, el) => observer?.observe(el));

      (document.body as any)._tmtObserver = observer;

    } catch (err) {
      console.error("translatePage error:", err);
      pageActive = false;
      document.body.removeAttribute("data-tmt-active");
      if (keepAlive) clearInterval(keepAlive);
      if (observer) observer.disconnect();
      
      // Error pill dekha
      if (!statusPill) mountStatusPill();
      const statusText = document.querySelector('.tmt-status-text');
      if (statusText) statusText.textContent = `Translation stopped: ${err instanceof Error ? err.message : 'Unknown error'}`;
    }
  }

  function restorePage() {
    pageActive = false;
    document.body.removeAttribute("data-tmt-active");

    // Lazy observer clean gara
    const obs = (document.body as any)._tmtObserver as IntersectionObserver | undefined;
    if (obs) {
      obs.disconnect();
      delete (document.body as any)._tmtObserver;
    }

    const allTextNodes = collectTextNodes(document.body);
    allTextNodes.forEach((node) => {
      if (originalValues.has(node)) {
        node.nodeValue = originalValues.get(node) || "";
      }
    });

    // Feri translate garna milne gari reset gara
    translatedNodes = new WeakSet<Text>();
  }


  function checkLanguagePrompt() {
    if (!extensionEnabled) return;

    setTimeout(() => {
      const sampleText = document.body?.innerText?.substring(0, 3000) || "";
      if (sampleText.trim().length < 50) return;

      const devanagariChars = (sampleText.match(/[\u0900-\u097F]/g) || []).length;

      let detectedLangCode = "en";
      if (devanagariChars > 20) {
        const tamangMarkers = [
          "मुबा", "ताबा", "लासो", "नबा", "ह्या", "खिम", "गिबा", "ब्रोबा", "क्यु", "सुङ्बा",
          "च्यु", "मेवा", "खई", "ह्याम्बो", "निसा", "सेबा", "पापा", "आमा", "अाङा",
          "ङा", "छ्यो", "ख्याप", "ङारो", "ग्याम", "सेम", "खे",
        ];
        const isTamang = tamangMarkers.some(m => sampleText.includes(m));
        detectedLangCode = isTamang ? "tmg" : "ne";
      }

      const domainKey = `tmt_dismissed_${window.location.hostname}`;
      chrome.storage.local.get([domainKey, "hasManuallyTranslated"], (res) => {
        // Only show prompt if user has manually translated something before
        if (res.hasManuallyTranslated && !res[domainKey] && !sessionStorage.getItem("tmt_prompt_session_dismissed")) {
          showPagePrompt(detectedLangCode);
        }
      });
    }, 1500);
  }

  function showPagePrompt(langCode: string) {
    if (!document.body || document.getElementById("tmt-page-prompt") || pageActive) return;

    let displayLang = "English";
    let autoSource = "English";
    let autoTarget = "Nepali";

    if (langCode === "ne") {
      displayLang = "Nepali";
      autoSource = "Nepali";
      autoTarget = "English";
    } else if (langCode === "tmg") {
      displayLang = "Tamang";
      autoSource = "Tamang";
      autoTarget = "English";
    }

    const prompt = document.createElement("div");
    prompt.id = "tmt-page-prompt";
    // Prompt mount gara
    prompt.innerHTML = safeHTML(`
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
    `) as any;
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
    if (!extensionEnabled || isDraggingGlobal) return;
    // Don't show new overlay if one is already open until it is manually closed
    if (document.getElementById("tmt-overlay")) return;

    const sel = window.getSelection()?.toString().trim();
    if (!sel || sel.length < 2) return;
    
    if (debounceTimer) clearTimeout(debounceTimer);
    const mx = e.clientX;
    const my = e.clientY;
    debounceTimer = setTimeout(() => {
      const currentSel = window.getSelection()?.toString().trim();
      if (currentSel && currentSel.length >= 2) mountOverlay(mx, my, currentSel);
    }, 600);
  });

  document.addEventListener("mousedown", () => {
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
    // Overlay is no longer removed on mousedown to ensure only one persists until manually closed
  });

  window.addEventListener("scroll", () => {
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
    // Overlay persists during scroll as per manual closure requirement
  }, { passive: true });


  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // Afnai extension ko msg ho ki haina check gara
    if (sender.id !== chrome.runtime.id) return;

    if (!extensionEnabled && msg.action !== "tmt_get_page_status") return;

    if (msg.action === "tmt_page_translate") {
      chrome.storage.local.set({ hasManuallyTranslated: true });
      pageSourceLang = msg.sourceLang || "English";
      pageTargetLang = msg.targetLang || "Nepali";
      sendResponse({ ok: true });
      translatePage();
    } else if (msg.action === "tmt_page_restore") {
      restorePage();
      removeStatusPill();
      sendResponse({ ok: true });
    } else if (msg.action === "tmt_get_page_status") {
      sendResponse({ pageActive });
    } else if (msg.action === "tmt_context_translate") {
      if (document.getElementById("tmt-overlay")) return;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        mountOverlay(rect.left, rect.bottom, msg.text);
      }
    } else if (msg.action === "tmt_start_speech") {
      const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!SR) { sendResponse({ error: "Speech recognition is not supported in this browser." }); return; }

      if (activeRecognition) { try { activeRecognition.stop(); } catch (_) {} }
      if (micTimeoutTimer) { clearTimeout(micTimeoutTimer); micTimeoutTimer = null; }

      activeRecognition = new SR();
      activeRecognition.lang = msg.lang || "en-US";
      activeRecognition.interimResults = true;
      activeRecognition.continuous = true;
      activeRecognition.maxAlternatives = 1;

      micTimeoutTimer = setTimeout(() => {
        if (activeRecognition) { try { activeRecognition.stop(); } catch (_) {} }
        chrome.runtime.sendMessage({ action: "tmt_speech_error", error: "mic-timeout" }).catch(() => {});
      }, MIC_TIMEOUT_MS);

      activeRecognition.onresult = (e: any) => {
        let finalTranscript = "";
        let interimTranscript = "";
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;
          else interimTranscript += e.results[i][0].transcript;
        }
        chrome.runtime.sendMessage({ action: "tmt_speech_result", finalTranscript, interimTranscript }).catch(() => {});
      };

      activeRecognition.onerror = (e: any) => {
        if (micTimeoutTimer) { clearTimeout(micTimeoutTimer); micTimeoutTimer = null; }
        chrome.runtime.sendMessage({ action: "tmt_speech_error", error: e.error }).catch(() => {});
      };

      activeRecognition.onend = () => {
        if (micTimeoutTimer) { clearTimeout(micTimeoutTimer); micTimeoutTimer = null; }
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
      if (micTimeoutTimer) { clearTimeout(micTimeoutTimer); micTimeoutTimer = null; }
      if (activeRecognition) {
        try { activeRecognition.stop(); } catch (_) {}
        activeRecognition = null;
      }
      sendResponse({ stopped: true });
      return true;
    }
  });
})();