# reImagine — Developer Documentation

> This document is for developers who want to understand, extend, or maintain the reImagine codebase. If you just want to install and use the extension, see the [README](./README.md).

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Why](#2-tech-stack--why)
3. [Getting Started](#3-getting-started)
4. [Project Structure](#4-project-structure)
5. [Chrome Extension Architecture](#5-chrome-extension-architecture)
6. [Component Breakdown](#6-component-breakdown)
7. [Hooks](#7-hooks)
8. [Services](#8-services)
9. [Types](#9-types)
10. [Content Script Deep Dive](#10-content-script-deep-dive)
11. [Background Service Worker Deep Dive](#11-background-service-worker-deep-dive)
12. [Styling System](#12-styling-system)
13. [Build System](#13-build-system)
14. [Testing](#14-testing)
15. [Adding a New Language](#15-adding-a-new-language)
16. [Adding a New Feature](#16-adding-a-new-feature)
17. [Common Gotchas](#17-common-gotchas)
18. [Debugging Tips](#18-debugging-tips)
19. [Future Improvements](#19-future-improvements)

---

## 1. Project Overview

reImagine is a **Chrome Manifest V3 browser extension** that translates between English, Nepali, and Tamang using the Google TMT API. It has three independent JavaScript contexts that communicate via Chrome's messaging system:

| Context | File | Runs in |
|---|---|---|
| Popup UI | `src/App.tsx` + components | Extension popup window |
| Service Worker | `src/background.ts` | Browser background (persistent) |
| Content Script | `src/content.ts` | Every webpage the user visits |

Understanding this separation is the most important thing for any future developer.

---

## 2. Tech Stack & Why

| Technology | Version | Why it was chosen |
|---|---|---|
| **React** | 19 | Familiar, component model suits the popup UI |
| **TypeScript** | 5.8 | Strict typing prevents runtime bugs, especially important for Chrome API callbacks |
| **Vite** | 6 | Multi-entry build support — can bundle popup, background, and content script separately in one config |
| **Tailwind CSS v4** | 4.x | Utility-first, works well with React; v4's new CSS-first config is cleaner |
| **Motion (Framer Motion)** | 12 | Spring physics animations in the popup; `layoutId` for smooth language selector transitions |
| **Vitest** | 4 | Same config as Vite, zero setup for testing |
| **Lucide React** | 0.546 | Consistent icon set, tree-shakeable |

---

## 3. Getting Started

### Initial Setup

```bash
git clone https://github.com/jarusuraj/reImagine.git
cd reImagine
npm install
cp .env.example .env
# Fill in REIMAGINE_API_URL and REIMAGINE_API_KEY in .env
```

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server at `localhost:3000` (popup UI only — no Chrome APIs) |
| `npm run build` | Type-check + build production bundle to `dist/` |
| `npx vitest run` | Run all tests once |
| `npx vitest` | Run tests in watch mode |

### Loading the Extension

```
chrome://extensions → Developer mode ON → Load unpacked → select dist/
```

After any code change, run `npm run build` again, then click the **refresh icon** on the extension card in `chrome://extensions`.

---

## 4. Project Structure

```
reImagine/
│
├── dist/                     ← Built output (committed to repo for easy install)
│
├── public/
│   ├── manifest.json         ← Extension manifest (MV3)
│   ├── content.css           ← Styles injected into web pages (overlays, pills)
│   ├── logo.jpg              ← Extension logo shown in popup header
│   └── icons/                ← PNG icons at 16/32/48/128px
│
├── scratch/
│   └── rename_tmt.cjs        ← One-off dev script used to rename variables; ignore
│
├── src/
│   ├── App.tsx               ← Root React component
│   ├── main.tsx              ← Entry point — mounts App into index.html
│   ├── background.ts         ← Service worker (no DOM, no React)
│   ├── content.ts            ← Content script (plain TS, IIFE-wrapped)
│   ├── index.css             ← Tailwind base styles for the popup
│   ├── vite-env.d.ts         ← Type declarations for import.meta.env
│   │
│   ├── components/           ← React UI components (popup only)
│   ├── hooks/                ← Custom React hooks (popup only)
│   ├── services/             ← Business logic, API calls, tests
│   ├── constants/            ← Static data (language list)
│   └── types/                ← Shared TypeScript interfaces
│
├── index.html                ← Popup HTML shell
├── vite.config.ts            ← Build configuration
├── tsconfig.json             ← TypeScript config
└── package.json
```

---

## 5. Chrome Extension Architecture

### The Three Contexts

This is the most critical concept. These three contexts **cannot share variables or imports at runtime**. They communicate only through Chrome's message passing APIs.

```
┌──────────────────────────────────────────────────────────────┐
│  POPUP (React)                                               │
│  Runs when the user clicks the extension icon.               │
│  Destroyed when the popup closes.                            │
│  Can use: React, DOM, chrome.storage, chrome.tabs,           │
│           chrome.runtime.sendMessage                         │
└──────────────────────┬───────────────────────────────────────┘
                       │ chrome.tabs.sendMessage(tabId, msg)
                       │ chrome.runtime.sendMessage(msg)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  SERVICE WORKER (background.ts)                              │
│  Always running (Chrome may suspend it after 30s idle).      │
│  No DOM access. No window object.                            │
│  Can use: chrome.*, fetch(), in-memory state                 │
└──────────────────────┬───────────────────────────────────────┘
                       │ chrome.tabs.sendMessage(tabId, msg)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  CONTENT SCRIPT (content.ts)                                 │
│  Injected into every webpage automatically.                  │
│  Has access to the page DOM.                                 │
│  Isolated JS scope (can't access page's own JS variables).  │
│  Can use: DOM APIs, chrome.runtime.sendMessage, fetch()      │
└──────────────────────────────────────────────────────────────┘
```

### Message Flow for a Translation

```
1. User clicks "Translate" in popup
         │
         ▼
2. Workbench.tsx → useTranslation hook → translation.ts::translate()
         │
         ▼ (direct fetch from popup)
3. TMT API ← POST request with text + lang codes
         │
         ▼
4. Response → update React state → display result
```

### Message Flow for Page Translation

```
1. User clicks "Translate Page" in popup
         │
         ▼ chrome.tabs.sendMessage
2. content.ts receives reImagine_page_translate
         │
         ▼ (for each text node)
3. chrome.runtime.sendMessage → reImagine_translate_quick
         │
         ▼
4. background.ts receives it → checks cache → calls translate()
         │
         ▼ fetch()
5. TMT API
         │
         ▼ reply back to content script
6. content.ts mutates the DOM text node
```

### Why does page translation go through the background instead of fetching directly?

The content script **can** fetch directly, but routing through the background gives us:
- A **shared in-memory cache** — if the same word appears 50 times on a page, it only hits the API once
- A **concurrency queue** — prevents flooding the API with hundreds of simultaneous requests
- **Retry logic** centralized in one place

---

## 6. Component Breakdown

All components live in `src/components/` and are **popup-only** — they use React and cannot be used in the content script.

### `App.tsx`

The root component. Responsible for:
- Top-level state: `sourceLang`, `targetLang`, `enabled`, `pageTranslated`, `historyOpen`
- Persisting lang preferences to `chrome.storage.local`
- Sending messages to the content script (`sendToTab`)
- Showing the privacy warning modal before first page translation
- Wiring everything together

**Key functions:**
```typescript
sendToTab(payload)        // Sends a message to the active tab's content script
handlePageTranslate()     // Checks privacy ack, then triggers page translation
handlePageRestore()       // Sends restore message to content script
toggleEnabled()           // Persists enabled/disabled state
```

### `Workbench.tsx`

The main translation panel. The most complex component (~400 lines). Handles:
- Text input, file upload (`.txt`), character count
- Language selector integration
- Voice dictation (delegated to the content script via message passing)
- Text-to-speech for source and translated text
- Playback speed toggle (0.8×, 1.0×, 1.2×)
- Copy to clipboard
- Language swap
- `Ctrl+Enter` keyboard shortcut

**Key state:**
```typescript
sourceText        // Text in the input box
listening         // Whether mic is active
interimText       // Partial speech recognition result (shown in grey)
isSpeakingSource  // TTS active for source text
isSpeakingTarget  // TTS active for translated text
playbackSpeed     // 0.8 | 1.0 | 1.2
```

**TTS logic:** First tries to find a matching voice via `window.speechSynthesis.getVoices()`. If none is found (common for Tamang), falls back to `translate.google.com/translate_tts`.

### `Header.tsx`

Simple header bar. Contains:
- Logo + title
- Power toggle (enabled/disabled)
- Dark/light mode toggle
- History sidebar toggle

Uses `useTheme()` hook internally.

### `LangSelector.tsx`

Animated pill-style language picker. Uses Framer Motion's `layoutId` for the sliding active indicator. Filters out "Auto" from the target language list (you can't translate *to* Auto).

### `HistorySidebar.tsx`

Slide-in panel from the right side. Notable sub-component: `HistoryCard` — handles individual entry display with copy and delete. Export saves a JSON file. Import reads a JSON file and merges with existing history (deduplicates by `id`).

### `Footer.tsx`

Static branding footer. Three items: language pairs, "Real-time", "Secure".

---

## 7. Hooks

### `useTranslation.ts`

Wraps the async `translate()` service call with React state.

```typescript
const { result, translating, error, run, reset } = useTranslation();

// result: TranslationResult | null
// translating: boolean
// error: string | null
// run(text, sourceLang, targetLang): Promise<TranslationResult | null>
// reset(): void — clears result and error
```

Uses a `translatingRef` (alongside the state) to prevent double-submits in React's strict mode.

### `useHistory.ts`

CRUD operations for translation history with automatic persistence.

```typescript
const { history, add, remove, clear, importHistory } = useHistory();
```

Storage strategy: uses `chrome.storage.local` if available (extension context), falls back to `localStorage` (dev server). Capped at 50 entries. Key: `reImagine_history_v1`.

### `useTheme.ts`

```typescript
const { theme, setTheme, toggleTheme } = useTheme();
// theme: "light" | "dark" | "system"
```

Applies the theme by adding/removing the `dark` class on `document.documentElement`. Persisted in `chrome.storage.local` (key: `reImagine-theme`). System mode listens to `prefers-color-scheme` media query.

---

## 8. Services

### `translation.ts`

The core API client. All three contexts (popup, background, content) use this.

**Key exports:**

```typescript
// Detect language from text
export function detectLanguage(text: string): Language

// Translate text (handles multi-sentence splitting internally)
export async function translate(
  text: string,
  sourceLang: Language,
  targetLang: Language,
): Promise<TranslationResult>
```

**`splitIntoSentences(text)`** — internal function. Splits on `. ! ? ।`. Filters out fragments with no alphabetic or Devanagari characters (prevents empty API calls for stray punctuation).

**`translateSingleSentence()`** — internal. Makes one API call with a 15-second per-sentence timeout via `AbortController`.

**Error handling** — errors from the fetch are caught and re-thrown with user-friendly messages. The background worker catches these and passes them back to the content script.

**Environment variables** — `REIMAGINE_API_URL` and `REIMAGINE_API_KEY` are read from `import.meta.env` which Vite replaces at build time. In tests, these are stubbed via `vi.stubGlobal`.

---

## 9. Types

All shared types live in `src/types/index.ts`:

```typescript
type Language = "Auto" | "English" | "Nepali" | "Tamang";

interface TranslationResult {
  sourceLang:  Language;
  targetLang:  Language;
  sourceText:  string;
  translation: string;
}

interface HistoryEntry extends TranslationResult {
  id:        string;   // crypto.randomUUID()
  timestamp: number;   // Date.now()
}

interface Settings {
  reImagineApiUrl: string;
  reImagineApiKey: string;
}
```

`Language` is the single source of truth for every language reference in the codebase. If you add a language, update this type first.

---

## 10. Content Script Deep Dive

`src/content.ts` is wrapped in an IIFE (`(() => { ... })()`) to avoid polluting the page's global scope. It re-initializes on every injection by first cleaning up any leftover DOM nodes from a previous run.

### Key variables

```typescript
const originalValues = new WeakMap<Text, string>(); // original text before translation
let translatedNodes  = new WeakSet<Text>();          // nodes already translated
let pageActive       = false;                        // is page translation running?
let statusPill: HTMLDivElement | null = null;        // the "Page translated ✓" bar
```

`WeakMap` and `WeakSet` are used intentionally — they don't prevent garbage collection of detached DOM nodes, avoiding memory leaks on SPAs that replace DOM subtrees.

### Page Translation Algorithm

```
translatePage()
  │
  ├── collectTextNodes(document.body)
  │     Walk the entire DOM tree recursively.
  │     Skip: SCRIPT, STYLE, NOSCRIPT, TEXTAREA, INPUT, SELECT, CODE, PRE
  │     Skip: contenteditable elements (don't break user input)
  │     Include: Text nodes with more than 1 non-whitespace character
  │
  ├── Split nodes into:
  │     viewportNodes  — visible within current viewport + 300px margin
  │     lazyNodes      — everything else
  │
  ├── Translate viewportNodes in batches of 5 with 150ms between batches
  │     This prevents CPU spikes and keeps the page responsive
  │
  └── Set up IntersectionObserver on lazyNodes
        When an element scrolls into view (rootMargin=300px),
        debounce 100ms then translate its text nodes
```

### Restoring the Page

`restorePage()` iterates all text nodes, checks the `originalValues` WeakMap, and restores the original `nodeValue`. It also disconnects the IntersectionObserver and clears `translatedNodes`.

### Language Detection Prompt

When the extension loads on a page, `checkLanguagePrompt()` runs after 1.5 seconds. It samples the first 3,000 characters of `document.body.innerText`, detects the language, and if the page appears to be in Nepali or Tamang (and the user has previously done a manual translation), shows a subtle prompt bar: "This page is in Nepali. Translate to English?"

The prompt is suppressed per-domain once dismissed (stored in `chrome.storage.local` as `reImagine_dismissed_{hostname}`) and per-session via `sessionStorage`.

### Voice Dictation in the Content Script

Voice dictation is architecturally interesting. The Web Speech API is only available in a page context (not in the service worker or the popup). So the popup sends `reImagine_start_speech` to the content script, which starts the recognition, then relays results back via `reImagine_speech_result` messages. The background script bridges these to the popup via `chrome.storage.session`.

---

## 11. Background Service Worker Deep Dive

`src/background.ts` handles three concerns:

### 1. Context Menu

```typescript
chrome.runtime.onInstalled → chrome.contextMenus.create("reImagine-translate")
chrome.contextMenus.onClicked → sendMessage to content script
```

The context menu is registered once on install. Clicks forward the selected text to the content script which mounts the overlay.

### 2. Translation Queue

```typescript
const queue: Array<() => Promise<void>> = [];
let activeRequests = 0;
const MAX_CONCURRENT = 5;

function processQueue(): void { ... }
```

Every `reImagine_translate_quick` message creates a task and pushes it to the queue. `processQueue` drains the queue while active requests stays under 5. When a task completes, it calls `processQueue` again. This is a simple but effective concurrency limiter.

### 3. In-Memory Cache

```typescript
const translationCache = new Map<string, string>();
// key: `${sourceLang}:${targetLang}:${text}`
// value: translated string
```

Scoped to the service worker's lifetime. Clears if Chrome terminates the service worker. This is acceptable for a hackathon; for production you'd persist this to `chrome.storage.session`.

### Service Worker Keepalive

Chrome terminates idle service workers after ~30 seconds. During page translation, the content script sends `reImagine_keepalive` every 25 seconds, which the background responds to with `{ alive: true }`. This keeps the worker alive for the duration of the translation.

---

## 12. Styling System

### Popup Styles (`src/index.css`)

Uses **Tailwind CSS v4**. The `dark:` variant is applied via the `dark` class on `<html>` (not `prefers-color-scheme`), managed by `useTheme.ts`.

Color conventions used in the codebase:
- `zinc-*` — neutral grays for backgrounds and text
- `white/[0.08]` — dark mode borders (opacity-based)
- `[#0a0a0a]` — near-black dark mode background
- `[#1a73e8]` — Google blue for the primary Translate button
- `emerald-*` — success states (page translated)
- `red-*` / `amber-*` — errors and warnings

### Content Script Styles (`public/content.css`)

This is a **plain CSS file** injected into every webpage. It cannot use Tailwind because Tailwind requires a build step. It uses:
- `@media (prefers-color-scheme: dark)` for dark mode (system preference, not user toggle)
- High `z-index: 2147483647` (max possible) to ensure overlays appear above everything
- A custom `reImagine-pop` keyframe animation for the overlay entrance
- `Inter` and `JetBrains Mono` loaded from Google Fonts

**Important:** Any new UI you add to the content script (overlays, pills, prompts) must be styled here, not in Tailwind.

---

## 13. Build System

`vite.config.ts` is the heart of the build. The key part is the **multi-entry rollup config**:

```typescript
rollupOptions: {
  input: {
    main:       path.resolve(__dirname, "index.html"),      // popup
    background: path.resolve(__dirname, "src/background.ts"),
    content:    path.resolve(__dirname, "src/content.ts"),
  },
  output: {
    // background.js and content.js must have predictable names
    // because manifest.json references them by name
    entryFileNames: (chunk) =>
      ["background", "content"].includes(chunk.name)
        ? "[name].js"
        : "assets/[name]-[hash].js",
  },
}
```

The popup output gets a hash in the filename (for cache busting). Background and content scripts **must not** have hashes because `manifest.json` references `"background.js"` and `"content.js"` by exact name.

### Environment Variable Injection

```typescript
define: {
  "import.meta.env.REIMAGINE_API_URL": JSON.stringify(env.REIMAGINE_API_URL ?? ""),
  "import.meta.env.REIMAGINE_API_KEY": JSON.stringify(env.REIMAGINE_API_KEY ?? ""),
}
```

Vite replaces these string literals at build time. The background script and content script don't support `import.meta.env` natively in a browser context, so this `define` approach bakes the values directly into the JS bundle.

---

## 14. Testing

Tests use **Vitest** with a `jsdom` environment. The test file is `src/services/translation.test.ts`.

### Running Tests

```bash
npx vitest run       # once
npx vitest           # watch mode
```

### How Tests Work

`fetch` is replaced globally with a `vi.fn()` mock:
```typescript
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
```

Each test configures `mockFetch.mockResolvedValueOnce(...)` to simulate a specific API response, then asserts on the return value of `translate()`.

### Writing a New Test

```typescript
it("should handle 401 unauthorized", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 401,
    json: async () => ({})
  });

  await expect(translate("Hello", "English", "Nepali"))
    .rejects
    .toThrow("Unauthorized");
});
```

---

## 15. Adding a New Language

Say you want to add **Maithili**. Here's every file you need to touch:

### 1. `src/types/index.ts`
```typescript
// Before
type Language = "Auto" | "English" | "Nepali" | "Tamang";

// After
type Language = "Auto" | "English" | "Nepali" | "Tamang" | "Maithili";
```

### 2. `src/constants/languages.ts`
```typescript
// Add to LANGUAGES array
{ value: "Maithili", label: "Maithili", native: "मैथिली", code: "mai" },

// Add to LANG_CODE map
Maithili: "mai",
```

### 3. `src/services/translation.ts`

Update `detectLanguage()` if you want auto-detection for the new language. Add distinctive morphemes or Unicode ranges for Maithili.

### 4. `src/components/Workbench.tsx`

Update the `LANG_MAP` for voice dictation BCP 47 codes:
```typescript
const LANG_MAP: Record<string, string> = {
  "Maithili": "mai-IN",  // add this
  ...
};
```

### 5. `src/content.ts`

Update the `tamangMarkers` / detection logic in both `detectLanguage` usage sites within the content script (there are two: `checkLanguagePrompt` and `collectTextNodes`).

That's it. TypeScript's strict mode will catch any place you missed.

---

## 16. Adding a New Feature

### Example: Adding a "Favorite" button to history entries

**Step 1** — Update the type in `src/types/index.ts`:
```typescript
interface HistoryEntry extends TranslationResult {
  id:        string;
  timestamp: number;
  favorite?: boolean;   // add this
}
```

**Step 2** — Add a `toggleFavorite` function in `src/hooks/useHistory.ts`:
```typescript
const toggleFavorite = useCallback((id: string) => {
  setHistory(prev => prev.map(e =>
    e.id === id ? { ...e, favorite: !e.favorite } : e
  ));
}, []);

return { history, add, remove, clear, importHistory, toggleFavorite };
```

**Step 3** — Add the button in `HistoryCard` inside `src/components/HistorySidebar.tsx`.

**Step 4** — Pass `toggleFavorite` down from `App.tsx` → `HistorySidebar` → `HistoryCard`.

### Example: Adding a new translation mode (e.g. image OCR)

This would require:
1. A new component in `src/components/`
2. A new message type in the message protocol (add to `reImagine_*` namespace)
3. A new handler in `background.ts` if it needs API access
4. Possibly a new content script action if it needs DOM access
5. New permissions in `public/manifest.json` if needed

---

## 17. Common Gotchas

### 1. Chrome APIs are not available in the dev server

`chrome.storage`, `chrome.tabs`, `chrome.runtime` — none of these exist at `localhost:3000`. The codebase guards against this with:
```typescript
if (typeof chrome === "undefined" || !chrome.storage) return;
```
If you add new Chrome API calls, always add this guard.

### 2. The service worker can be terminated at any time

Never store important state only in memory in `background.ts`. Use `chrome.storage.session` for short-lived state that must survive across messages.

### 3. Content script runs before the page finishes loading

`"run_at": "document_idle"` in the manifest means the content script runs after the DOM is interactive but before all resources load. Be careful with `document.body` — it should be available, but check anyway.

### 4. Vite's `define` replaces strings literally

```typescript
define: {
  "import.meta.env.REIMAGINE_API_KEY": JSON.stringify(env.REIMAGINE_API_KEY ?? "")
}
```
This does a string-replace, not a proper module replacement. Don't try to use `import.meta.env.REIMAGINE_API_KEY` as a dynamic key name — it won't work.

### 5. `content.css` is injected on every page

Keep it lean. Namespace every class name with `reImagine-` to avoid colliding with the host page's own CSS. Never use generic class names like `.card` or `.button`.

### 6. TrustedTypes policy

Some pages (e.g. Google products) enforce [TrustedTypes](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API). The content script handles this with:
```typescript
ttPolicy = window.trustedTypes.createPolicy("reImagine-policy", {
  createHTML: (s: string) => s
});
```
If you add any `innerHTML` assignments in the content script, always wrap them with `safeHTML()`.

### 7. Extension popup size is fixed

The popup is hardcoded to `h-[540px] w-[420px]` in `App.tsx`. Chrome restricts popup dimensions. If you add new UI, work within this space or consider making certain elements scrollable.

---

## 18. Debugging Tips

### Debugging the Popup

Open the popup, right-click anywhere inside it → **Inspect**. This opens DevTools for the popup window. `console.log` from React components shows up here.

### Debugging the Service Worker

Go to `chrome://extensions`, find reImagine, click **"Service Worker"** link. This opens a dedicated DevTools window for the background script.

### Debugging the Content Script

Open DevTools on any webpage (`F12`). The content script's `console.log` output appears in the regular **Console** tab. Filter by `content.js` in the source filter.

### Inspecting Chrome Storage

In any DevTools window → **Application** tab → **Storage** → **Extension storage**. You can view and edit `chrome.storage.local` and `chrome.storage.session` values live.

### Reloading After Changes

After `npm run build`:
1. Go to `chrome://extensions`
2. Click the **refresh icon** on the reImagine card
3. Close and reopen any tabs where you want the new content script to apply
4. Close and reopen the popup

---

## 19. Future Improvements

These are known gaps and ideas for the next version:

| Area | Idea |
|---|---|
| **Cache** | Persist the translation cache to `chrome.storage.session` so it survives service worker restarts |
| **Dynamic content** | Use a `MutationObserver` to catch DOM nodes added after page translation completes (e.g. infinite scroll, live feeds) |
| **TTS for Tamang** | The Google TTS fallback may not be reliable. A dedicated Tamang TTS API would improve this significantly |
| **Offline mode** | Cache recent translations to `chrome.storage.local` for offline access |
| **Settings page** | A proper options page (`chrome_url_overrides`) where users can update their API key without rebuilding |
| **Per-site translation memory** | Remember preferred translation direction per domain |
| **Firefox support** | The codebase is mostly compatible — the main blockers are MV3 service worker differences and WebExtension API shims |
| **Testing** | Add tests for `detectLanguage`, `splitIntoSentences`, and the background queue logic |
| **CI/CD** | GitHub Actions workflow: run `vitest` on every push, auto-build and attach `dist/` to releases |

---

© 2026 reImagine Team
