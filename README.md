# reImagine Translator

> **Real-time trilingual translation for English, Nepali, and Tamang — built as a Chrome Extension for the TMT Hackathon 2026.**

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Usage Guide](#-usage-guide)
- [Architecture](#-architecture)
- [Security](#-security)
- [Contributing](#-contributing)

---

## 🌐 Overview

**reImagine Translator** is a browser extension that brings real-time, high-quality translation between **English**, **Nepali (नेपाली)**, and **Tamang (तामाङ)** directly into your browser — no separate app, no copy-pasting, no switching tabs.

Whether you want to translate a single word, an entire webpage, or dictate text with your voice, reImagine handles it seamlessly from a sleek popup interface.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🖊️ **Workbench Translation** | Type or paste text and get an instant translation with one click |
| 🌍 **Live Page Translation** | Translate every text node on an entire webpage, preserving layout |
| 🖱️ **Selection Overlay** | Highlight any text on a page to get an instant inline translation tooltip |
| 🖱️ **Context Menu** | Right-click selected text and translate via the browser context menu |
| 🎤 **Voice Dictation** | Speak directly into the source box — supports English and Nepali |
| 🔊 **Text-to-Speech** | Listen to source or translated text read aloud |
| 🕓 **Translation History** | Browse, copy, and delete your past 50 translations |
| 🌑 **Dark / Light Mode** | Full theme support with system preference detection |
| ⚡ **Master Power Switch** | Instantly disable all extension activity for maximum privacy |
| 🔁 **Language Swap** | Swap source and target languages with one click |

---

## 🛠️ Tech Stack

- **React 19** + **TypeScript** — Popup UI
- **Vite 6** — Build tooling and extension bundling
- **Tailwind CSS v4** — Styling
- **Motion (Framer Motion)** — Animations
- **Chrome Extension Manifest V3** — Extension platform
- **Web Speech API** — Voice dictation and text-to-speech

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- Google Chrome (or any Chromium-based browser does not work with ,Voice Feature doesnot work with brave)
- A running instance of the TMT Translation API

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/jarusuraj/reImagine.git
cd reImagine

# 2. Set up environment variables
cp .env.example .env
```

Open `.env` and fill in your credentials:

```env
TMT_API_URL=https://your-api-url.com/translate
TMT_API_KEY=your-secret-api-key
```

```bash
# 3. Install dependencies
npm install

# 4. Build the extension
npm run build
```

### Loading into Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer Mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `dist/` folder inside your project directory
5. The reImagine icon will appear in your browser toolbar

> **Tip:** After making code changes, run `npm run build` again and click the 🔄 refresh icon on the extension card in `chrome://extensions`.

---

## 📖 Usage Guide

### Workbench Translation

1. Click the **reImagine** icon in your toolbar to open the popup
2. Select your **source** and **target** languages using the pill selectors
3. Type or paste text into the top input box
4. Click **Translate** or press `Ctrl + Enter`
5. Use the **Copy** button to copy the result, or the **🔊** button to hear it read aloud

### Live Page Translation

1. Navigate to any webpage you want to translate
2. Open the extension popup
3. Click the **Translate Page** button at the top
4. Confirm the **privacy notice** (page text is sent to the translation server)
5. A progress bar will appear at the bottom of the page as translation completes
6. To revert, click **Restore** in the popup or in the progress bar

### Selection Tooltip

1. Highlight any text on a webpage
2. After a brief pause (~600ms), a translation overlay will appear near your cursor
3. Click the **Copy** icon inside the overlay to copy the translation
4. Click **✕** or click elsewhere to dismiss it

### Context Menu

1. Highlight text on any webpage
2. Right-click and select **"Translate with reImagine"**
3. The translation overlay appears anchored to your selection

### Voice Dictation

1. Open the popup and make sure the active tab is a regular website (not `chrome://` pages)
2. Click the **🎤 Mic** button in the source panel
3. Speak clearly — your words appear as you talk
4. Click the **⏹ Stop** button when done (the mic auto-stops after 60 seconds)
5. Click **Translate** to translate your dictated text

> **Note:** Voice dictation requires microphone permission on the active webpage. If blocked, click the 🔒 icon in the address bar and allow microphone access.

### History

- Click the **History** icon (📋) in the header to open the sidebar
- Browse your last 50 translations with source text, result, and timestamp
- Hover over any entry to **copy** or **delete** it
- Click **Clear History** to remove all entries

---

## 🏗️ Architecture

reImagine uses a strictly isolated **message-passing architecture** across three layers:

```
┌─────────────────────────────────────────────┐
│              Popup UI (React)               │
│  App.tsx · Workbench · Header · History     │
└────────────────────┬────────────────────────┘
                     │ chrome.runtime.sendMessage
                     ▼
┌─────────────────────────────────────────────┐
│        Service Worker (background.ts)       │
│  API routing · Rate limiting · Key storage  │
└────────────────────┬────────────────────────┘
                     │ chrome.tabs.sendMessage
                     ▼
┌─────────────────────────────────────────────┐
│        Content Script (content.ts)          │
│  DOM traversal · Overlays · Speech API      │
└─────────────────────────────────────────────┘
```

**Key design decisions:**

- **API key is build-time only** — baked into the bundle via `vite.config.ts`, never stored in `chrome.storage` or exposed in the UI
- **State persistence via `chrome.storage.session`** — speech recognition results survive popup close/reopen
- **Batched DOM translation** — page translation processes 5 text nodes concurrently with a 50ms breathing window between batches to avoid UI freezes
- **Popup-safe speech** — the Web Speech API runs in the content script (tab context), not the popup, because Chrome restricts it in popup pages

---

## 🔐 Security

### Implemented Protections

- ✅ **Message sender validation** — all `chrome.runtime.onMessage` listeners verify `sender.id === chrome.runtime.id`, rejecting messages from any other extension
- ✅ **XSS prevention** — all user-derived content injected into the DOM passes through `escapeHtml()` using `textContent` assignment, never raw `innerHTML`
- ✅ **Privacy warning** — a one-time consent modal is shown before page translation, informing the user that page content is sent to the server
- ✅ **Mic auto-timeout** — the microphone automatically stops after **60 seconds** to prevent indefinite recording
- ✅ **No `eval` or dynamic code execution** — the extension uses no `eval()`, `Function()`, or dynamic `import()`

### Known Limitations

- 🟡 **API key in bundle** — the translation API key is embedded in the built extension JS. Anyone who unpacks the `.crx` can read it. Mitigate by routing requests through a backend proxy that holds the real key.
- 🟡 **Page content leaves the browser** — page translation inherently sends text to the TMT server. Do not use on pages with sensitive personal data.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and run `npm run build` to verify the build passes
4. Commit: `git commit -m "feat: describe your change"`
5. Push and open a Pull Request

---

## 👥 Team

Built by **Team reImagine** for the **TMT Hackathon 2026** at Kathmandu University.

---

*© 2026 reImagine. All Rights Reserved.*
