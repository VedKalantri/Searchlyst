# Searchlyst — Multi-Source Developer Search Aggregator

<div align="center">
  <img src="assets/icons/icon-128.png" width="96" height="96" alt="Searchlyst Logo" />
  <h3>Search once. Explore everywhere.</h3>
  <p>A Swiss-editorial research workstation built as a Google Chrome Extension (Manifest V3).</p>
  <p>
    <img src="https://img.shields.io/badge/Manifest-V3-orange?style=flat-square" alt="Manifest V3" />
    <img src="https://img.shields.io/badge/Chrome_Extension-v1.0.9-blue?style=flat-square" alt="Version 1.0.9" />
    <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
    <img src="https://img.shields.io/badge/Zero_Keys_Required-100%25_Out_of_the_Box-brightgreen?style=flat-square" alt="Zero Keys Required" />
  </p>
</div>

---

## ⚡ Overview

**Searchlyst** is an information-dense, developer-grade search workstation. Instead of opening 5 different browser tabs and re-typing the exact same technical query across search engines, documentation, repositories, discussions, and video breakdown tutorials, Searchlyst queries all essential developer platforms simultaneously:

| Source | Badge | Purpose | Default Strategy |
| :--- | :--- | :--- | :--- |
| **Google** | `[G]` | Official documentation, specs & web guides | Clean site-search index (DuckDuckGo HTML parser) |
| **YouTube** | `[YT]` | Architecture breakdowns & conference talks | Direct public client endpoint |
| **GitHub** | `[GH]` | Open-source repos, packages & library code | Public GitHub REST API v3 |
| **Reddit** | `[RD]` | Community discussions & real-world debugging | Site-specific discussion index |
| **Stack Overflow** | `[SO]` | Code snippets, edge cases & verified fixes | StackExchange REST API v2.3 |

---

## 🔑 API Keys & Rate Limits Architecture

### Zero Keys Required for Regular Users
Searchlyst is engineered to work **100% out of the box with zero setup or API keys required**. 
* Regular users do not need to register for developer accounts or provide API tokens.
* All search providers utilize public endpoints, lightweight REST services, and resilient client-side index parsers.

### Optional Developer Configuration (High-Volume Use)
If you are developing locally, contributing to Searchlyst, or executing high-frequency queries from a shared corporate network IP, you may optionally configure API tokens to increase public rate limits:

| Service | Default (No Key) | With Optional Key | How to Configure |
| :--- | :--- | :--- | :--- |
| **GitHub API** | 60 requests / hr per IP | 5,000 requests / hr | Provide a Personal Access Token (`GITHUB_TOKEN`) in `.env` |
| **StackExchange** | 300 requests / day per IP | 10,000 requests / day | Provide an app key (`STACKEXCHANGE_KEY`) in `.env` |
| **Google / Reddit** | Unlimited web requests | Unlimited | Handled automatically via public index |
| **YouTube** | Unlimited video searches | Unlimited | Handled automatically via public endpoints |

To configure optional keys for local development, copy the template:
```bash
cp .env.example .env
```
Add your optional tokens to `.env`:
```env
GITHUB_TOKEN=ghp_your_github_token_here
STACKEXCHANGE_KEY=your_stackapps_key_here
PORT=3888
```

---

## 🚀 Installation Guide

### Loading into Google Chrome / Brave / Edge

1. **Clone or Download the Repository**:
   ```bash
   git clone https://github.com/VedKalantri/Searchlyst.git
   cd Searchlyst
   ```

2. **Open Extensions Manager**:
   * In Chrome: open `chrome://extensions`
   * In Brave: open `brave://extensions`
   * In Edge: open `edge://extensions`

3. **Enable Developer Mode**:
   * Toggle the **Developer mode** switch in the top-right corner of the page.

4. **Load Unpacked Extension**:
   * Click the **Load unpacked** button in the top-left corner.
   * Select the root `Searchlyst/` folder (the directory containing `manifest.json`).

5. **Pin to Toolbar**:
   * Click the puzzle icon (Extensions) in your browser toolbar and pin **Searchlyst**.
   * Shortcut to open: click the pinned icon or press `Ctrl+Shift+F` (`Cmd+Shift+F` on macOS).

---

## 🛠️ Local Development & Testing

Searchlyst includes a standalone Node.js development server that lets you test and debug search providers and the UI workstation directly in your standard browser without having to reload the extension popup.

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or newer recommended)

### Running the Standalone Preview Server
1. Start the preview server:
   ```bash
   node preview-server.mjs
   ```
2. Open your browser to:
   ```text
   http://localhost:3888/popup/popup.html
   ```
3. Test API proxy directly:
   ```text
   http://localhost:3888/api/search?q=nextjs+server+actions&sources=google,github,youtube
   ```

### Regenerating Extension Icons
Icons are generated from pure SVG geometry:
```bash
node assets/icons/generate-icons.mjs
```

---

## ⌨️ Keyboard Shortcuts & Power Features

Searchlyst is designed for keyboard-first developer productivity:

* **Open / Focus Search**: Press <kbd>Ctrl</kbd> + <kbd>K</kbd> (or <kbd>⌘</kbd> + <kbd>K</kbd>) to instantly focus the input bar.
* **Execute Search**: Press <kbd>Enter</kbd> to query all active sources in parallel.
* **Open in Background Tab**: Hold <kbd>Ctrl</kbd> (or <kbd>⌘</kbd>) + **Click** any result (or middle-click) to open the link in a new background tab **without closing the popup**.
* **Navigate Results**: Use <kbd>↑</kbd> and <kbd>↓</kbd> arrow keys to navigate result cards.
* **Copy URL**: Press <kbd>C</kbd> on any highlighted result to copy its link to your clipboard.
* **Clear Search**: Press <kbd>Esc</kbd> to clear the current search and return to the recent searches overview.
* **Filter Carousel**: Click any source tab or use the **`‹`** and **`›`** controls to smoothly glide across sources.
* **Open All in Tab Group**: Click **"OPEN IN TAB GROUP"** to automatically group all query results into a dedicated labeled Chrome Tab Group.

---

## 📂 Project Architecture

```text
Searchlyst/
├── manifest.json              # Chrome Extension Manifest V3 configuration
├── README.md                  # Documentation & developer guide
├── .env.example               # Template for optional developer API tokens
├── preview-server.mjs         # Standalone Node.js preview server & API proxy
│
├── popup/
│   ├── popup.html             # Workstation popup DOM structure
│   ├── popup.css              # Swiss editorial design system & styling
│   └── popup.js               # Multi-source coordinator, rAF carousel & state
│
├── background/
│   ├── service-worker.js      # Background service worker (message handling)
│   └── providers/             # Isolated, modular search providers
│       ├── google.js          # Web documentation & guides
│       ├── youtube.js         # Technical videos & tutorials
│       ├── github.js          # Open-source repositories & packages
│       ├── reddit.js          # Developer community discussions
│       └── stackoverflow.js   # Q&A, error fixes & solutions
│
├── settings/
│   ├── settings.html          # Preferences page
│   ├── settings.css           # Settings stylesheet
│   └── settings.js            # Settings storage & state management
│
├── utils/
│   ├── constants.js           # Source registries & suggested queries
│   ├── sanitize.js            # XSS defense, text truncation & entity decoding
│   └── storage.js             # Session persistence & chrome.storage adapter
│
└── assets/
    └── icons/                 # Geometric editorial icon assets (16, 32, 48, 128)
```

---

## 🔒 Privacy & Security

* **No Tracking**: Searchlyst does not collect, log, or transmit telemetry, user analytics, or personal search history to any external server.
* **Local Storage**: Search history and preference settings reside entirely on your local machine using `chrome.storage.local`.
* **Direct Connections**: All network requests connect directly to the respective search provider endpoints.

---

## 📄 License

MIT © [Ved Kalantri](https://github.com/VedKalantri)
