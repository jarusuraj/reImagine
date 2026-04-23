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

### 3. Settings & Privacy
*   **Master Switch**: Use the power icon in the header to disable all background observers.
*   **Privacy First**: Before translating a full page, reImagine will ask for your confirmation to ensure you aren't sending sensitive data (like bank info) to the cloud.

---

## 🛠️ Developer Setup

1.  **Clone**: `git clone https://github.com/jarusuraj/reImagine.git`
2.  **Config**: Rename `.env.example` to `.env` and add your `TMT_API_URL` and `TMT_API_KEY`.
3.  **Install**: `npm install`
4.  **Build**: `npm run build`
5.  **Load**: Open Chrome, go to `chrome://extensions`, enable **Developer Mode**, and click **Load Unpacked**. Select the `dist/` folder.

---

**Team:** reImagine  
**Track:** TMT Hackathon - Browser Plugin/Extension  
**Vision:** Bringing Devanagari scripts and Himalayan languages to the forefront of the digital world.
