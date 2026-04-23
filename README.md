# reImagine 🌍

**The ultimate trilingual translation companion for your browser.**

reImagine is a high-performance browser extension designed to break language barriers between **English**, **Nepali**, and **Tamang**. Whether you're browsing the web, listening to local content, or need real-time dictation, reImagine is built to provide a seamless, premium experience.

---

## ✨ Key Features

### 🎙️ Real-time Voice Dictation
Speak naturally in any of the supported languages. Our high-fidelity speech-to-text engine captures your words instantly and accurately.

### 🔊 Human-like Text-to-Speech
Listen to translations with our "Neural" voice engine. We prioritize high-quality cloud voices to ensure that even complex languages like Nepali sound natural and clear.

### 📄 Full-Page Translation
Translate entire websites with a single click. Our smart DOM observer swaps text in real-time while preserving the website's original layout.

### 🎯 Quick Context Menu
Highlight any text on any website, right-click, and select **"Translate with reImagine"** to see an instant translation overlay without leaving the page.

### 📜 Persistent History
Never lose a translation. Your recent work is saved in a sleek, searchable sidebar for quick reference later.

---

## 🚀 How to Use

### 1. The Workbench (Main Popup)
*   **Dictate**: Click the 🎤 icon to start speaking. Click ⬛ to stop.
*   **Translate**: Type your text and hit **Translate** (or press `Ctrl+Enter`).
*   **Listen**: Click the 🔊 icon to hear the text read aloud. If it's already playing, the icon turns into a red stop button.
*   **Clear**: Use the **X** button to wipe the workspace and stop all active audio.

### 2. Page Translation
*   When you visit a page in a different language, a smart prompt will appear at the top asking if you'd like to translate it.
*   You can also click the **"Translate Page"** banner in the popup at any time.

### 3. Context Menu Translation
- Highlight any text on a webpage.
- Right-click and select **"Translate with TMT"**.
- A sleek overlay will appear near your selection with the translation.

### 4. Global Control
- Use the **Power Icon** in the header to enable or disable the extension globally. When off, the extension stops all background processing and DOM observation for maximum privacy.
- Toggle between **Light and Dark mode** using the theme icon for a personalized experience.

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
