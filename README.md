# reImagine Translator

<div align="center">

<img src="public/logo.jpg" alt="reImagine Logo" width="80" style="border-radius:12px"/>

### Real-time trilingual translation — English · नेपाली · तामाङ — right inside your browser.

[![Hackathon](https://img.shields.io/badge/Google%20TMT%20Hackathon-2026-4285F4?style=flat-square&logo=google)](https://tmt.ilprl.ku.edu.np/)
[![Track](https://img.shields.io/badge/Track%201-Browser%20Extension-34A853?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange?style=flat-square)](#)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)


**[Features](#-features) · [Install in 60 seconds](#-install-in-60-seconds-pre-built) · [Build from Source](#-build-from-source) · [Architecture](#-architecture) · [Demo](#-demo)**

</div>

---

## What is reImagine?

**reImagine** is a Chrome browser extension that brings high-quality, real-time translation between **English**, **Nepali (नेपाली)**, and **Tamang (तामाङ)** directly into your browser — built on top of the [Google TMT API](https://tmt.ilprl.ku.edu.np/) for the **Google TMT Hackathon 2026 (Track 1: Browser Extension)**.

No copy-pasting. No tab switching. Just open the popup, or highlight text on any page, and translate instantly.

---

## Features

### Translation Modes

| Mode | How it works |
|---|---|
| **Workbench** | Type, paste, or upload a `.txt` file — translate up to 5,000 characters with one click or `Ctrl+Enter` |
| **Full Page Translation** | Translates every text node on the entire webpage in-place — layout and formatting are fully preserved |
| **Selection Overlay** | Highlight any text on any page and a floating tooltip instantly shows the translation |
| **Context Menu** | Right-click selected text → *Translate with reImagine* — works site-wide |

### Input & Output

| Feature | Detail |
|---|---|
| **Auto Language Detect** | Automatically identifies English, Nepali, or Tamang using Unicode range + Tamang morpheme markers |
| **Voice Dictation** | Speak directly into the source box using the Web Speech API |
| **Text-to-Speech** | Listen to source or translated text; chooses the best available voice with Google TTS fallback |
| **Playback Speed** | Cycle between 0.8×, 1.0×, and 1.2× for TTS output |
| **Language Swap** | Swap source ↔ target in one click; translated text becomes the new source |
| **Copy to Clipboard** | Animated one-click copy confirmation |

### UX & Polish

| Feature | Detail |
|---|---|
| **Translation History** | Last 50 translations — browse, copy, delete, export as JSON, import back |
| **Dark / Light Mode** | Full theme support, persisted in `chrome.storage.local` |
| **Master Power Switch** | Instantly disables all extension activity and API calls |
| **Privacy Notice** | First-time consent dialog before any page-level translation |
| **Draggable Overlays** | Inline translation tooltips can be repositioned anywhere on screen |
| **Shimmer Loading** | Skeleton placeholders during translation so the UI never looks broken |
| **Spring Animations** | Framer Motion physics-based transitions throughout the popup |

---

## Supported Language Pairs

All six TMT directions are fully supported:

| # | From | To |
|---|---|---|
| 1 | English | Nepali |
| 2 | Nepali | English |
| 3 | English | Tamang |
| 4 | Tamang | English |
| 5 | Nepali | Tamang |
| 6 | Tamang | Nepali |

---

## Install in 60 Seconds (Pre-built)

> ✅ **A production-ready build is committed directly to this repository in the `dist/` folder.**  
> No Node.js, no build step, no configuration required.

1. **Clone or download** this repository:
   ```bash
   git clone https://github.com/jarusuraj/reImagine.git
   ```

2. Open Chrome and go to **`chrome://extensions`**

3. Enable **Developer mode** (toggle in the top-right corner)

4. Click **Load unpacked**

5. Select the **`dist/`** folder inside the cloned repository

6. The **reImagine** icon appears in your toolbar — you're done ✅

> The pre-built `dist/` already contains API credentials baked in for hackathon evaluation. No `.env` setup is required for testing.

---

## Build from Source

If you want to build with your own API credentials:

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- Google Chrome (or any Chromium-based browser)
- TMT API credentials (shared with registered hackathon participants)

### Steps

```bash
# 1. Clone
git clone https://github.com/jarusuraj/reImagine.git
cd reImagine

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
```

Edit `.env`:
```env
REIMAGINE_API_URL=https://tmt.ilprl.ku.edu.np/api/translate
REIMAGINE_API_KEY=your_team_api_key_here
```

```bash
# 4. Build
npm run build

# 5. Load dist/ in Chrome (same steps as above)
```

### Dev Server (UI only)

```bash
npm run dev
# → http://localhost:3000
```

> Chrome extension APIs (`chrome.tabs`, `chrome.storage`, etc.) are not available in the dev server. Use the production build for full functionality.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `REIMAGINE_API_URL` | ✅ | TMT API endpoint |
| `REIMAGINE_API_KEY` | ✅ | Bearer token for API auth |
| `APP_TITLE` | No | Popup heading (default: `reImagine`) |
| `APP_SUBTITLE` | No | Popup subheading (default: `Translation Engine`) |
| `APP_FOOTER` | No | Footer line (default: `reImagine · 2026`) |

Variables are baked into the bundle at build time via Vite's `define`. The `.env` file is gitignored — the pre-built `dist/` is the only place credentials appear.

---

## Architecture

reImagine follows the Chrome Manifest V3 three-process model with clear separation of concerns across each layer.

```
┌──────────────────────────────────────────────────────────────┐
│                         BROWSER                               │
│                                                               │
│  ┌─────────────────┐   sendMessage    ┌─────────────────────┐ │
│  │   POPUP (React) │ ◄──────────────► │  SERVICE WORKER     │ │
│  │                 │                  │  background.ts       │ │
│  │  App.tsx        │                  │                     │ │
│  │  Workbench      │                  │ • Context menu      │ │
│  │  HistorySidebar │                  │ • Translation queue │ │
│  │  Header         │                  │ • In-memory cache   │ │
│  │  LangSelector   │                  │ • Speech bridging   │ │
│  └────────┬────────┘                  └──────────┬──────────┘ │
│           │ chrome.tabs.sendMessage              │            │
│           ▼                                      │            │
│  ┌─────────────────────────────────────────────┐ │            │
│  │             CONTENT SCRIPT                   │ │            │
│  │             content.ts                       │◄┘            │
│  │                                             │              │
│  │  • Selection → draggable overlay            │              │
│  │  • Full-page translate (batch + lazy)       │              │
│  │  • IntersectionObserver for off-screen nodes│              │
│  │  • Language-detect prompt bar               │              │
│  │  • Web Speech API (dictation)               │              │
│  │  • restorePage() with WeakMap originals     │              │
│  └────────────────────┬────────────────────────┘              │
│                       │ fetch()                                │
│                       ▼                                        │
│             ┌─────────────────┐                               │
│             │   TMT API       │                               │
│             │ (sentence-level)│                               │
│             └─────────────────┘                               │
└──────────────────────────────────────────────────────────────┘
```

### Page Translation Flow

```
User clicks "Translate Page"
        │
        ▼
  App.tsx → chrome.tabs.sendMessage(reImagine_page_translate)
        │
        ▼
  content.ts::translatePage()
        ├── collectTextNodes(document.body)
        │     └── skips: SCRIPT, STYLE, PRE, CODE, INPUT, TEXTAREA
        │
        ├── Split: viewport nodes  vs.  lazy (off-screen) nodes
        │
        ├── Viewport → batch of 5, 150ms delay between batches
        │     └── translateNode() → background → TMT API → mutate DOM
        │
        └── IntersectionObserver (rootMargin = 300px)
              └── Translates lazy nodes as user scrolls
                    └── originalValues WeakMap preserves originals
                          └── restorePage() undoes all mutations
```

### Background Service Worker

The background script maintains:

- **In-memory cache** keyed on `src:tgt:text` — avoids re-translating repeated strings during page translation
- **Concurrency queue** — max 5 simultaneous API calls to respect rate limits
- **Retry logic** — up to 2 retries with exponential backoff on 429 / 5xx errors
- **Keepalive** — content script pings background every 25 s to prevent service worker termination mid-translation

### Inter-Process Message Protocol

All messages are namespaced with `reImagine_` to avoid collisions.

| Action | Direction | Purpose |
|---|---|---|
| `reImagine_translate_quick` | Content / Popup → BG | Translate a single text string |
| `reImagine_page_translate` | Popup → Content | Begin full-page translation |
| `reImagine_page_restore` | Popup → Content | Restore original page text |
| `reImagine_get_page_status` | Popup → Content | Check if page is translated |
| `reImagine_context_translate` | BG → Content | Trigger overlay for context menu selection |
| `reImagine_start_speech` | Popup → Content | Start Web Speech recognition |
| `reImagine_stop_speech` | Popup → Content | Stop recognition |
| `reImagine_speech_result` | Content → BG | Forward transcript chunks |
| `reImagine_keepalive` | Content → BG | Keep service worker alive |

---

## Codebase Structure

```
reImagine/
│
├── dist/                         ← ✅ Pre-built extension — load this in Chrome
│
├── public/
│   ├── manifest.json             ← Chrome MV3 manifest
│   ├── content.css               ← Styles for overlays, tooltips, status pill
│   ├── logo.jpg
│   └── icons/                    ← 16 / 32 / 48 / 128 px icons
│
├── src/
│   ├── App.tsx                   ← Root component — state orchestration
│   ├── main.tsx                  ← ReactDOM entry
│   ├── background.ts             ← Service worker
│   ├── content.ts                ← Content script (IIFE)
│   ├── index.css                 ← Global popup styles
│   │
│   ├── components/
│   │   ├── Header.tsx            ← Logo, power toggle, dark mode, history
│   │   ├── Workbench.tsx         ← Main translation panel (input / output)
│   │   ├── LangSelector.tsx      ← Animated pill language picker
│   │   ├── HistorySidebar.tsx    ← Slide-in history with export / import
│   │   └── Footer.tsx            ← Branding footer
│   │
│   ├── hooks/
│   │   ├── useTranslation.ts     ← Async translate, loading/error state
│   │   ├── useHistory.ts         ← CRUD + chrome.storage persistence
│   │   └── useTheme.ts           ← Light / dark / system theme
│   │
│   ├── services/
│   │   ├── translation.ts        ← API client, sentence splitter, lang detect
│   │   └── translation.test.ts   ← Vitest unit tests
│   │
│   ├── constants/
│   │   └── languages.ts          ← Language list and API code map
│   │
│   └── types/
│       └── index.ts              ← TypeScript interfaces
│
├── vite.config.ts                ← Multi-entry build (popup + BG + content)
├── tsconfig.json
├── package.json
└── .env.example
```

---

## API Integration

### Request

```http
POST {REIMAGINE_API_URL}
Authorization: Bearer {REIMAGINE_API_KEY}
Content-Type: application/json

{ "text": "Hello", "src_lang": "en", "tgt_lang": "ne" }
```

### Response

```json
{
  "message_type": "SUCCESS",
  "input": "Hello",
  "output": "नमस्ते",
  "src_lang": "en",
  "target_lang": "ne"
}
```

### Language Codes

| Language | Code |
|---|---|
| English | `en` |
| Nepali | `ne` |
| Tamang | `tmg` |

### Sentence-Level Strategy

The TMT API is sentence-level only. `splitIntoSentences()` handles both Latin (`. ! ?`) and Devanagari (`।`) delimiters. Multi-sentence inputs are translated in **parallel** via `Promise.all` then joined — giving the best possible throughput within the API's constraint.

### Auto Language Detection

1. No Devanagari characters (`\u0900–\u097F`) → **English**
2. Devanagari present + known Tamang morphemes (`मुबा`, `ताबा`, `लासो`, `ङा`, etc.) → **Tamang**
3. Otherwise → **Nepali**

---

## Testing

```bash
# Run tests once (fetch is fully mocked — no network required)
npx vitest run

# Watch mode
npx vitest
```

Tests are in `src/services/translation.test.ts`:

| Test | Covers |
|---|---|
| Successful single-sentence translation | Happy path |
| Multi-sentence parallel translation | Sentence splitting + result joining |
| Empty input rejection | Input validation |
| API `FAIL` response handling | Error surfacing |

---

## Chrome Permissions

| Permission | Why |
|---|---|
| `activeTab` | Prevent injection on `chrome://` pages |
| `tabs` | Send messages to the active tab |
| `storage` | Persist settings, history, and theme |
| `contextMenus` | Right-click "Translate with reImagine" |
| `scripting` | Dynamically inject content script if not loaded |
| `microphone` | Web Speech API for voice dictation |
| `<all_urls>` | Allow content script on any HTTPS page |

---

## Privacy

- Only the **text you submit** is sent to the TMT server — no URLs, page metadata, or credentials.
- A **first-time consent dialog** appears before any page-wide translation.
- Acknowledgment is saved in `chrome.storage.local` and never shown again.
- Avoid using "Translate Page" on banking or credential-entry pages.

---

## Known Limitations

| Limitation | Notes |
|---|---|
| Brave Browser | Web Speech API is blocked by default — voice dictation unavailable |
| `chrome://` pages | Chrome disallows content script injection on internal pages |
| Tamang TTS | No native Tamang browser voice; falls back to Google Translate TTS |
| Dynamic content | JavaScript-loaded content added after page translation won't auto-translate |
| 5,000 char limit | Workbench enforces a hard cap per translation request |

---

## Demo

> 📹 **[Watch the Demo Video](#)** ← *(insert link before submission)*

### Reproduce the Demo (Step by Step)

1. Load the extension from `dist/` as described in [Install in 60 Seconds](#-install-in-60-seconds-pre-built).
2. Navigate to [ekantipur.com](https://ekantipur.com) (a Nepali news website).
3. Open the popup → set source **Nepali**, target **English** → click **Translate Page**.
4. Watch the page translate in real time — layout is fully preserved.
5. Scroll down — off-screen content translates as it enters the viewport.
6. Highlight a word on the page → observe the draggable inline overlay.
7. Right-click selected text → **Translate with reImagine**.
8. Open popup → click the **History** icon → see the last 50 translations with timestamps.
9. Click the **Power** icon to disable the extension entirely.
10. Click the **Moon** icon to toggle dark mode.

---

## License

[MIT License](./LICENSE) © 2026 reImagine Team

---

<div align="center">

Built for the **Google TMT Hackathon 2026**  
Organized by the Information and Language Processing Research Lab  
Department of Computer Science and Engineering, Kathmandu University

*Empowering Languages Through AI – Be Part of the Change.*

</div>
