# reImagine Translation Engine

A high-performance Chrome/Browser Extension for real-time translation between English, Nepali, and Tamang Languages. Built for the reImagine Engine (TMT Hackathon 2026).

## Architecture
The extension operates on a strictly isolated message-passing architecture to prevent DOM-based XSS attacks.
- **Service Worker (`background.ts`)**: Handles secure API routing, API key management, and 429 rate limit backoff. 
- **Content Script (`content.ts`)**: Responsible for DOM traversal, text node batching (concurrent window of 5 requests/50ms), and injecting shadow-like overlays for UI prompts.
- **Popup UI**: Built on React 18 and Vite. State is synchronized via `chrome.storage.local` to persist across ephemeral popup lifetimes.

## Features
- **Live Page Translation**: Translates all text nodes in the DOM recursively, preserving original structure and inline elements.
- **Context Menu & Selection**: Highlight text and translate instantly via tooltip or context menu.
- **Master Switch**: Global toggle that disables all content script observers and UI listeners instantly.
- **WASM-Ready Architecture**: Built with a modular service layer designed for high-concurrency translation batches.

## 🚀 Usage Guide

### 1. Manual Translation (Workbench)
- Open the extension popup by clicking the icon in your toolbar.
- Select your source and target languages (English, Nepali, or Tamang).
- Type or paste text into the source box. The translation will appear instantly in the target panel.
- Use the **Copy** icon to copy the result to your clipboard.
- Use the **History** icon to view and manage your past translations.

### 2. Live Page Translation
- Navigate to any website (e.g., an English news site).
- Open the extension and click the **"Live Page Translate"** banner.
- The extension will scan the page and translate all content in real-time. A status bar at the bottom will show the progress.
- To revert to the original text, click the **"Restore"** button in the popup or the status bar.

### 3. Context Menu Translation
- Highlight any text on a webpage.
- Right-click and select **"Translate with TMT"**.
- A sleek overlay will appear near your selection with the translation.

### 4. Global Control
- Use the **Power Icon** in the header to enable or disable the extension globally. When off, the extension stops all background processing and DOM observation for maximum privacy.
- Toggle between **Light and Dark mode** using the theme icon for a personalized experience.

###5. Limitations
-The speech to text does not work with brave browser due to internal scripting conflit but it works with all other browsers with ease.

## Setup Instructions
1. Clone the repository.
2. Duplicate `.env.example` to `.env` and insert your `TMT_API_URL` and `TMT_API_KEY`.
3. Install dependencies: `npm install`
4. Build the extension: `npm run build`
5. Load the `dist/` directory as an unpacked extension in Chrome (`chrome://extensions`).

## Security Audit
- Removed `window.postMessage` listeners to prevent malicious page scripts from hijacking the translation API.
- All DOM mutations use `textContent` or `nodeValue` strictly to prevent innerHTML injection vulnerabilities.
- Dependencies locked and audited.
 
---
**Team:** reImagine
**Track:** Browser Plugin/Extension
