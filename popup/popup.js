/**
 * TabFuse Popup Controller (Phase 1)
 * Swiss Editorial Workstation & Interaction Logic
 */

import { SOURCES, SOURCE_ORDER, SAMPLE_QUERIES } from '../utils/constants.js';
import { getSettings, saveSettings, addRecentSearch } from '../utils/storage.js';
import { escapeHtml } from '../utils/sanitize.js';

class TabFuseWorkstation {
  constructor() {
    this.settings = null;
    this.enabledSources = new Set();
    this.isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    // DOM Elements
    this.searchInput = document.getElementById('searchInput');
    this.clearBtn = document.getElementById('clearSearch');
    this.searchBtn = document.getElementById('searchBtn');
    this.openTabGroupBtn = document.getElementById('openTabGroupBtn');
    this.sourcesGrid = document.getElementById('sourcesGrid');
    this.sourcesCounter = document.getElementById('sourcesCounter');
    this.toggleAllBtn = document.getElementById('toggleAllSources');
    this.suggestionsList = document.getElementById('suggestionsList');
    this.themeToggleBtn = document.getElementById('themeToggle');
    this.settingsBtn = document.getElementById('openSettings');
    this.statusText = document.getElementById('statusText');
    this.shortcutKey = document.getElementById('shortcutKey');

    this.init();
  }

  async init() {
    this.settings = await getSettings();
    this.enabledSources = new Set(this.settings.enabledSources || SOURCE_ORDER);

    this.applyPlatformShortcut();
    this.applyTheme(this.settings.theme);
    this.renderSourcesGrid();
    this.renderSuggestions();
    this.bindEvents();

    this.updateStatus('READY');
  }

  applyPlatformShortcut() {
    if (this.shortcutKey) {
      this.shortcutKey.textContent = this.isMac ? '⌘K' : 'Ctrl+K';
    }
  }

  applyTheme(theme) {
    const root = document.documentElement;
    let effectiveTheme = theme;

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = prefersDark ? 'dark' : 'light';
    }

    root.setAttribute('data-theme', effectiveTheme);
    this.updateThemeIcon(effectiveTheme);
  }

  updateThemeIcon(theme) {
    if (!this.themeToggleBtn) return;
    if (theme === 'dark') {
      // Moon Icon
      this.themeToggleBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `;
    } else {
      // Sun Icon
      this.themeToggleBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      `;
    }
  }

  async cycleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    await saveSettings({ theme: next });
    this.settings.theme = next;
    this.applyTheme(next);
  }

  renderSourcesGrid() {
    this.sourcesGrid.innerHTML = '';

    SOURCE_ORDER.forEach((id) => {
      const source = SOURCES[id];
      const isActive = this.enabledSources.has(id);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `source-btn ${isActive ? 'active' : ''}`;
      btn.dataset.sourceId = id;
      btn.setAttribute('aria-pressed', isActive.toString());
      btn.title = `${source.label} (${source.category})`;

      btn.innerHTML = `
        <span class="source-code">${escapeHtml(source.badge)}</span>
        <span class="source-label">${escapeHtml(source.label)}</span>
        <span class="source-dot"></span>
      `;

      btn.addEventListener('click', () => this.toggleSource(id));
      this.sourcesGrid.appendChild(btn);
    });

    this.updateSourcesCounter();
  }

  updateSourcesCounter() {
    const total = SOURCE_ORDER.length;
    const active = this.enabledSources.size;
    this.sourcesCounter.textContent = `${active}/${total} SELECTED`;

    // Update button styling if none selected
    if (this.searchBtn) {
      this.searchBtn.disabled = active === 0;
    }
    if (this.openTabGroupBtn) {
      this.openTabGroupBtn.disabled = active === 0;
    }
  }

  async toggleSource(id) {
    if (this.enabledSources.has(id)) {
      // Prevent disabling all sources; at least one must remain
      if (this.enabledSources.size > 1) {
        this.enabledSources.delete(id);
      } else {
        this.flashStatus('AT LEAST 1 SOURCE REQUIRED');
        return;
      }
    } else {
      this.enabledSources.add(id);
    }

    await saveSettings({ enabledSources: Array.from(this.enabledSources) });
    this.renderSourcesGrid();
  }

  async toggleAllSources() {
    if (this.enabledSources.size === SOURCE_ORDER.length) {
      // Leave only the first source enabled
      this.enabledSources = new Set([SOURCE_ORDER[0]]);
    } else {
      // Enable all
      this.enabledSources = new Set(SOURCE_ORDER);
    }

    await saveSettings({ enabledSources: Array.from(this.enabledSources) });
    this.renderSourcesGrid();
  }

  renderSuggestions() {
    this.suggestionsList.innerHTML = '';
    SAMPLE_QUERIES.forEach((query) => {
      const li = document.createElement('li');
      li.className = 'suggestion-item';
      li.tabIndex = 0;
      li.innerHTML = `
        <span>"${escapeHtml(query)}"</span>
        <span class="suggestion-arrow">→</span>
      `;

      const selectQuery = () => {
        this.searchInput.value = query;
        this.clearBtn.classList.remove('hidden');
        this.searchInput.focus();
      };

      li.addEventListener('click', selectQuery);
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectQuery();
        }
      });

      this.suggestionsList.appendChild(li);
    });
  }

  bindEvents() {
    // Search input input handling
    this.searchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val) {
        this.clearBtn.classList.remove('hidden');
      } else {
        this.clearBtn.classList.add('hidden');
      }
    });

    // Clear button
    this.clearBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.clearBtn.classList.add('hidden');
      this.searchInput.focus();
    });

    // Enter key to search
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.executeSearch();
      } else if (e.key === 'Escape') {
        this.searchInput.value = '';
        this.clearBtn.classList.add('hidden');
      }
    });

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      // Cmd+K or Ctrl+K or '/' when not in input
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.searchInput.focus();
        this.searchInput.select();
      } else if (e.key === '/' && document.activeElement !== this.searchInput) {
        e.preventDefault();
        this.searchInput.focus();
      }
    });

    // Search button click
    this.searchBtn.addEventListener('click', () => this.executeSearch());

    // Toggle All sources button
    this.toggleAllBtn.addEventListener('click', () => this.toggleAllSources());

    // Theme toggle button
    this.themeToggleBtn.addEventListener('click', () => this.cycleTheme());

    // Settings button
    this.settingsBtn.addEventListener('click', () => this.openSettingsPage());

    // Open Tab Group Button (First-class feature)
    this.openTabGroupBtn.addEventListener('click', () => this.openInTabGroup());
  }

  async executeSearch() {
    const query = this.searchInput.value.trim();
    if (!query) {
      this.searchInput.focus();
      this.flashStatus('ENTER A SEARCH QUERY');
      return;
    }

    if (this.enabledSources.size === 0) {
      this.flashStatus('SELECT AT LEAST ONE SOURCE');
      return;
    }

    await addRecentSearch(query);
    this.updateStatus(`SEARCHING ${this.enabledSources.size} SOURCES...`);

    // In Phase 1, we execute the first-class Tab Group search or show readiness for Phase 2
    console.log(`[TabFuse] Executing search for: "${query}" across`, Array.from(this.enabledSources));
    
    // For Phase 1 validation, if running inside Chrome, launch tabs / tab group
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      this.openInTabGroup();
    } else {
      this.flashStatus(`SEARCH DISPATCHED: "${query}"`);
    }
  }

  /**
   * First-Class Feature: Open all active sources in a native Chrome Tab Group
   */
  async openInTabGroup() {
    const query = this.searchInput.value.trim();
    if (!query) {
      this.searchInput.focus();
      this.flashStatus('ENTER A QUERY TO OPEN TABS');
      return;
    }

    const activeList = SOURCE_ORDER.filter(id => this.enabledSources.has(id));
    if (activeList.length === 0) return;

    this.updateStatus(`OPENING ${activeList.length} TABS...`);

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      try {
        const createdTabIds = [];

        for (const id of activeList) {
          const url = SOURCES[id].searchUrl(query);
          const tab = await chrome.tabs.create({ url, active: false });
          createdTabIds.push(tab.id);
        }

        // Check if Chrome Tab Groups API is supported
        if (chrome.tabGroups && createdTabIds.length > 0) {
          const groupId = await chrome.tabs.group({ tabIds: createdTabIds });
          await chrome.tabGroups.update(groupId, {
            title: `TabFuse: ${query.slice(0, 20)}`,
            color: 'orange'
          });
        }

        this.updateStatus(`${activeList.length} TABS GROUPED`);
        setTimeout(() => window.close(), 700);
      } catch (err) {
        console.error('[TabFuse] Failed to create tabs:', err);
        this.flashStatus('TAB CREATION FAILED');
      }
    } else {
      // Browser preview / standalone testing fallback
      activeList.forEach(id => {
        window.open(SOURCES[id].searchUrl(query), '_blank');
      });
      this.updateStatus(`${activeList.length} TABS OPENED`);
    }
  }

  openSettingsPage() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('../settings/settings.html', '_blank');
    }
  }

  updateStatus(text) {
    if (this.statusText) {
      this.statusText.textContent = text;
    }
  }

  flashStatus(msg, duration = 2200) {
    this.updateStatus(msg);
    setTimeout(() => {
      this.updateStatus('READY');
    }, duration);
  }
}

// Instantiate on DOM load
document.addEventListener('DOMContentLoaded', () => {
  new TabFuseWorkstation();
});
