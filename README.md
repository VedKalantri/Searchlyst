# Searchlyst — Multi-Source Search Aggregator

> **Search once. Explore everywhere.**
> A Swiss-editorial research workstation built as a Chrome Extension (Manifest V3).

---

## Overview

Searchlyst is an information-dense, developer-grade search workstation. Instead of opening multiple browser tabs and re-typing the same query across search engines, developer docs, code repositories, discussions, and technical conference videos, Searchlyst enables you to execute search queries across:

* **Google** (`[G]` — Technical Documentation & Web Guides)
* **YouTube** (`[YT]` — Architecture Breakdowns & Video Tutorials)
* **GitHub** (`[GH]` — Repositories, Packages & Libraries)
* **Reddit** (`[RD]` — Community Discussions & Real-world Debugging)
* **Stack Overflow** (`[SO]` — Solutions, Edge Cases & Error Fixes)

---

## Design Philosophy

* **Swiss Graphic & Editorial Minimalism**: Strict 1px hairline border architecture, high-contrast typography, and purposeful whitespace.
* **Restrained Palette**: Warm off-white (`#F9F9F8`), deep slate charcoal (`#111113`), and a single electric vermilion accent (`#E64516` / `#F05023`).
* **Zero Decoration Fluff**: No neon glows, no glassmorphism, no animated gradients, no floating cards, and no generic SaaS templates.
* **Keyboard-First Ergonomics**: `Ctrl+K` / `⌘K` command palette focus, `Enter` to search, and quick clear with `Esc`.
* **First-Class Tab Groups**: One-click **"Open in Tab Group"** to launch and automatically organize all active source searches into a labeled Chrome Tab Group (`Searchlyst: {query}`).

---

## Installation & Development

### Loading into Google Chrome

1. Clone or open this repository.
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select this directory.
5. Pin **Searchlyst** to your Chrome toolbar or use shortcut `Ctrl+Shift+F` (`Cmd+Shift+F` on macOS).

---

## Project Structure

```text
searchlyst/
├── manifest.json              # Chrome Extension Manifest V3 configuration
├── README.md                  # Project documentation
│
├── popup/
│   ├── popup.html             # Compact research workstation popup
│   ├── popup.css              # Swiss editorial design system & CSS tokens
│   └── popup.js               # Workstation UI state & interactions
│
├── background/
│   ├── service-worker.js      # Background lifecycle orchestrator
│   └── providers/             # Modular search providers
│       ├── google.js
│       ├── youtube.js
│       ├── github.js
│       ├── reddit.js
│       └── stackoverflow.js
│
├── settings/
│   ├── settings.html          # Preferences page
│   ├── settings.css           # Settings stylesheet
│   └── settings.js            # Settings state management
│
├── utils/
│   ├── constants.js           # Source registry, defaults & queries
│   ├── sanitize.js            # XSS defense & URL utilities
│   └── storage.js             # chrome.storage adapter with fallback
│
└── assets/
    └── icons/                 # Geometric editorial extension icons
```
