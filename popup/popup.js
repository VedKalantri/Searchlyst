/**
 * Searchlyst Popup Workstation Controller
 * Production Edition: Multi-source search aggregation, real-time checklist,
 * editorial indexing, keyboard navigation, copy shortcuts, and history.
 */

import { SOURCES, SOURCE_ORDER, SAMPLE_QUERIES } from '../utils/constants.js';
import { getSettings, saveSettings, getRecentSearches, addRecentSearch } from '../utils/storage.js';
import { escapeHtml } from '../utils/sanitize.js';

// Direct provider fallbacks for standalone preview testing
import { searchGoogle } from '../background/providers/google.js';
import { searchYouTube } from '../background/providers/youtube.js';
import { searchGitHub } from '../background/providers/github.js';
import { searchReddit } from '../background/providers/reddit.js';
import { searchStackOverflow } from '../background/providers/stackoverflow.js';

const LOCAL_PROVIDERS = {
  google: searchGoogle,
  youtube: searchYouTube,
  github: searchGitHub,
  reddit: searchReddit,
  stackoverflow: searchStackOverflow
};

class SearchlystWorkstation {
  constructor() {
    this.settings = null;
    this.enabledSources = new Set();
    this.isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    this.isExtensionContext = !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);

    // Search & Result State
    this.isSearching = false;
    this.currentQuery = '';
    this.results = [];
    this.sourceSummaries = {};
    this.activeFilter = 'ALL';
    this.selectedIndex = -1;

    // DOM Elements - Navigation & Header
    this.searchInput = document.getElementById('searchInput');
    this.clearBtn = document.getElementById('clearSearch');
    this.searchBtn = document.getElementById('searchBtn');
    this.openTabGroupBtn = document.getElementById('openTabGroupBtn');
    this.sourcesGrid = document.getElementById('sourcesGrid');
    this.sourcesCounter = document.getElementById('sourcesCounter');
    this.toggleAllBtn = document.getElementById('toggleAllSources');
    this.themeToggleBtn = document.getElementById('themeToggle');
    this.settingsBtn = document.getElementById('openSettings');
    this.statusText = document.getElementById('statusText');
    this.statusIndicator = document.getElementById('statusIndicator');
    this.shortcutKey = document.getElementById('shortcutKey');

    // DOM Elements - Workstation Views
    this.emptyState = document.getElementById('emptyState');
    this.recentSearchesBlock = document.getElementById('recentSearchesBlock');
    this.recentSearchesList = document.getElementById('recentSearchesList');
    this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
    this.suggestionsList = document.getElementById('suggestionsList');

    this.resultsContainer = document.getElementById('resultsContainer');
    this.searchProgressCard = document.getElementById('searchProgressCard');
    this.progressTitle = document.getElementById('progressTitle');
    this.progressTiming = document.getElementById('progressTiming');
    this.progressChecklist = document.getElementById('progressChecklist');
    this.filterBarWrapper = document.getElementById('filterBarWrapper');
    this.filterBar = document.getElementById('filterBar');
    this.resultsList = document.getElementById('resultsList');
    this.backToHomeBtn = document.getElementById('backToHomeBtn');
    this.openAllFilteredBtn = document.getElementById('openAllFilteredBtn');

    this.init();
  }

  async init() {
    this.settings = await getSettings();
    this.enabledSources = new Set(this.settings.enabledSources || SOURCE_ORDER);

    this.applyPlatformShortcut();
    this.applyTheme(this.settings.theme);
    this.renderSourcesGrid();
    this.renderSuggestions();
    await this.renderRecentSearches();
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
      this.themeToggleBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `;
    } else {
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

    if (this.searchBtn) this.searchBtn.disabled = active === 0;
    if (this.openTabGroupBtn) this.openTabGroupBtn.disabled = active === 0;
  }

  async toggleSource(id) {
    if (this.enabledSources.has(id)) {
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
      this.enabledSources = new Set([SOURCE_ORDER[0]]);
    } else {
      this.enabledSources = new Set(SOURCE_ORDER);
    }

    await saveSettings({ enabledSources: Array.from(this.enabledSources) });
    this.renderSourcesGrid();
  }

  async renderRecentSearches() {
    const recents = await getRecentSearches(4);
    if (!recents || recents.length === 0) {
      this.recentSearchesBlock.classList.add('hidden');
      return;
    }

    this.recentSearchesBlock.classList.remove('hidden');
    this.recentSearchesList.innerHTML = '';

    recents.forEach(query => {
      const li = document.createElement('li');
      li.className = 'suggestion-item';
      li.tabIndex = 0;
      li.innerHTML = `
        <span>"${escapeHtml(query)}"</span>
        <span class="suggestion-arrow">→</span>
      `;

      const selectAndSearch = () => {
        this.searchInput.value = query;
        this.clearBtn.classList.remove('hidden');
        this.executeSearch();
      };

      li.addEventListener('click', selectAndSearch);
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectAndSearch();
        }
      });

      this.recentSearchesList.appendChild(li);
    });
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

      const selectAndSearch = () => {
        this.searchInput.value = query;
        this.clearBtn.classList.remove('hidden');
        this.executeSearch();
      };

      li.addEventListener('click', selectAndSearch);
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectAndSearch();
        }
      });

      this.suggestionsList.appendChild(li);
    });
  }

  bindEvents() {
    this.searchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val) {
        this.clearBtn.classList.remove('hidden');
      } else {
        this.clearBtn.classList.add('hidden');
      }
    });

    this.clearBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.clearBtn.classList.add('hidden');
      this.searchInput.focus();
      this.showEmptyState();
    });

    this.clearHistoryBtn?.addEventListener('click', async () => {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.remove(['searchlyst_recent_searches', 'tabfuse_recent_searches']);
      }
      localStorage.removeItem('searchlyst_recent_searches');
      localStorage.removeItem('tabfuse_recent_searches');
      this.recentSearchesBlock.classList.add('hidden');
      this.flashStatus('HISTORY CLEARED');
    });

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.executeSearch();
      } else if (e.key === 'Escape') {
        if (this.searchInput.value) {
          this.searchInput.value = '';
          this.clearBtn.classList.add('hidden');
          this.showEmptyState();
        }
      }
    });

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.searchInput.focus();
        this.searchInput.select();
      } else if (e.key === '/' && document.activeElement !== this.searchInput) {
        e.preventDefault();
        this.searchInput.focus();
      } else if (e.key === 'ArrowDown') {
        if (!this.resultsContainer.classList.contains('hidden')) {
          e.preventDefault();
          this.navigateResults(1);
        }
      } else if (e.key === 'ArrowUp') {
        if (!this.resultsContainer.classList.contains('hidden')) {
          e.preventDefault();
          this.navigateResults(-1);
        }
      } else if (e.key === 'Enter' && this.selectedIndex >= 0 && document.activeElement !== this.searchInput) {
        e.preventDefault();
        this.openSelectedResult();
      } else if ((e.key === 'c' || e.key === 'C') && this.selectedIndex >= 0 && document.activeElement !== this.searchInput) {
        e.preventDefault();
        this.copySelectedResult();
      }
    });

    this.searchBtn.addEventListener('click', () => this.executeSearch());
    this.toggleAllBtn.addEventListener('click', () => this.toggleAllSources());
    this.themeToggleBtn.addEventListener('click', () => this.cycleTheme());
    this.settingsBtn.addEventListener('click', () => this.openSettingsPage());
    this.openTabGroupBtn.addEventListener('click', () => this.openInTabGroup());

    this.backToHomeBtn.addEventListener('click', () => this.showEmptyState());
    this.openAllFilteredBtn.addEventListener('click', () => this.openFilteredInTabs());
  }

  showEmptyState() {
    this.resultsContainer.classList.add('hidden');
    this.emptyState.classList.remove('hidden');
    this.selectedIndex = -1;
    this.renderRecentSearches();
    this.updateStatus('READY');
  }

  showResultsContainer() {
    this.emptyState.classList.add('hidden');
    this.resultsContainer.classList.remove('hidden');
  }

  /**
   * Search Execution
   */
  async executeSearch(targetSourceId = null) {
    const query = this.searchInput.value.trim();
    if (!query) {
      this.searchInput.focus();
      this.flashStatus('ENTER A QUERY TO SEARCH');
      return;
    }

    const sourcesToQuery = targetSourceId 
      ? [targetSourceId] 
      : SOURCE_ORDER.filter(id => this.enabledSources.has(id));

    if (sourcesToQuery.length === 0) {
      this.flashStatus('SELECT AT LEAST 1 SOURCE');
      return;
    }

    this.isSearching = true;
    this.currentQuery = query;
    this.selectedIndex = -1;
    this.showResultsContainer();
    this.updateStatus('SEARCHING...', true);
    await addRecentSearch(query);

    // Render Initial Progress Checklist
    this.renderLoadingChecklist(sourcesToQuery);

    const startTime = Date.now();

    try {
      let searchResponse = null;

      // 1. Try Chrome Extension Background Service Worker (if running as installed extension)
      if (this.isExtensionContext) {
        searchResponse = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { type: 'EXECUTE_SEARCH', query, sources: sourcesToQuery, maxResults: 5 },
            (response) => {
              if (chrome.runtime.lastError || !response) {
                resolve(null);
              } else {
                resolve(response);
              }
            }
          );
        });
      }

      // 2. If previewing on localhost development server, use the server-side API proxy to avoid browser CORS restrictions
      if (!searchResponse) {
        try {
          const apiRes = await fetch(`/api/search?q=${encodeURIComponent(query)}&sources=${sourcesToQuery.join(',')}&limit=5`);
          if (apiRes.ok) {
            searchResponse = await apiRes.json();
          }
        } catch {
          // Server API unreachable, proceed to local provider fallback
        }
      }

      // 3. Fallback to direct client-side provider invocation
      if (!searchResponse) {
        searchResponse = await this.executeLocalSearch(query, sourcesToQuery);
      }

      const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

      this.results = searchResponse.results || [];
      this.sourceSummaries = searchResponse.sourceSummaries || {};

      this.isSearching = false;
      this.renderCompletedChecklist(sourcesToQuery, durationSec);
      this.renderFilterTabs(sourcesToQuery);
      this.renderResultsList();

      this.updateStatus(`${this.results.length} RESULTS FOUND (${durationSec}s)`);
    } catch (err) {
      console.error('[Searchlyst] Search error:', err);
      this.isSearching = false;
      this.updateStatus('SEARCH FAILED', false);
    }
  }

  async executeLocalSearch(query, sources) {
    const promises = sources.map(async (id) => {
      const provider = LOCAL_PROVIDERS[id];
      if (!provider) return { source: id, results: [], error: 'Provider not found' };
      try {
        return await provider(query, 5);
      } catch (err) {
        return { source: id, results: [], error: err.message };
      }
    });

    const settled = await Promise.allSettled(promises);
    const aggregated = [];
    const sourceSummaries = {};

    settled.forEach((outcome, idx) => {
      const sid = sources[idx];
      if (outcome.status === 'fulfilled') {
        const val = outcome.value;
        sourceSummaries[sid] = { count: val.results?.length || 0, error: val.error || null };
        if (val.results) aggregated.push(...val.results);
      } else {
        sourceSummaries[sid] = { count: 0, error: outcome.reason?.message || 'Network error' };
      }
    });

    return { results: aggregated, sourceSummaries };
  }

  renderLoadingChecklist(sources) {
    this.progressTitle.textContent = `SEARCHING ${sources.length} SOURCES`;
    this.progressTiming.textContent = 'CONNECTING...';
    this.filterBarWrapper.classList.add('hidden');
    this.resultsList.innerHTML = '';

    this.progressChecklist.innerHTML = '';
    sources.forEach(id => {
      const s = SOURCES[id];
      const row = document.createElement('div');
      row.className = 'checklist-row';
      row.id = `checklist-${id}`;
      row.innerHTML = `
        <div class="checklist-left">
          <span class="checklist-badge">${s.badge}</span>
          <span>${s.label}</span>
        </div>
        <span class="checklist-status loading">●</span>
      `;
      this.progressChecklist.appendChild(row);
    });
  }

  renderCompletedChecklist(sources, durationSec) {
    this.progressTitle.textContent = `${this.results.length} RESULTS AGGREGATED`;
    this.progressTiming.textContent = `${durationSec}s`;

    sources.forEach(id => {
      const s = SOURCES[id];
      const row = document.getElementById(`checklist-${id}`);
      if (!row) return;

      const summary = this.sourceSummaries[id] || { count: 0, error: null };
      const statusEl = row.querySelector('.checklist-status');

      if (summary.error && summary.count === 0) {
        statusEl.className = 'checklist-status error';
        statusEl.textContent = '! ERROR';
      } else {
        statusEl.className = 'checklist-status done';
        statusEl.textContent = `✓ ${summary.count}`;
      }
    });
  }

  renderFilterTabs(sources) {
    this.filterBarWrapper.classList.remove('hidden');
    this.filterBar.innerHTML = '';

    // "ALL" tab
    const allBtn = document.createElement('button');
    allBtn.className = `filter-btn ${this.activeFilter === 'ALL' ? 'active' : ''}`;
    allBtn.innerHTML = `<span>ALL</span> <span class="filter-count">[${this.results.length}]</span>`;
    allBtn.addEventListener('click', () => {
      this.activeFilter = 'ALL';
      this.renderFilterTabs(sources);
      this.renderResultsList();
    });
    this.filterBar.appendChild(allBtn);

    // Per-source tabs
    sources.forEach(id => {
      const s = SOURCES[id];
      const count = this.results.filter(r => r.source === id).length;
      if (count === 0 && !this.sourceSummaries[id]?.error) return;

      const btn = document.createElement('button');
      btn.className = `filter-btn ${this.activeFilter === id ? 'active' : ''}`;
      btn.innerHTML = `<span>${s.badge} ${s.label.toUpperCase()}</span> <span class="filter-count">[${count}]</span>`;
      btn.addEventListener('click', () => {
        this.activeFilter = id;
        this.renderFilterTabs(sources);
        this.renderResultsList();
      });
      this.filterBar.appendChild(btn);
    });
  }

  renderResultsList() {
    this.resultsList.innerHTML = '';
    const filtered = this.activeFilter === 'ALL' 
      ? this.results 
      : this.results.filter(r => r.source === this.activeFilter);

    // If selected source had an error and 0 results, render error card
    if (this.activeFilter !== 'ALL' && this.sourceSummaries[this.activeFilter]?.error && filtered.length === 0) {
      const errCard = this.createErrorCard(this.activeFilter, this.sourceSummaries[this.activeFilter].error);
      this.resultsList.appendChild(errCard);
      return;
    }

    if (filtered.length === 0) {
      const emptyItem = document.createElement('div');
      emptyItem.className = 'result-row';
      emptyItem.innerHTML = `
        <div class="result-snippet">No results found for "${escapeHtml(this.currentQuery)}" under ${this.activeFilter}.</div>
      `;
      this.resultsList.appendChild(emptyItem);
      return;
    }

    filtered.forEach((item, index) => {
      const row = document.createElement('article');
      row.className = `result-row ${this.selectedIndex === index ? 'selected' : ''}`;
      row.tabIndex = 0;
      row.dataset.index = index;
      row.dataset.url = item.url;

      const sourceMeta = SOURCES[item.source] || { badge: '[WEB]', label: item.source };

      row.innerHTML = `
        <div class="result-header">
          <span class="result-source-tag">${sourceMeta.badge} ${sourceMeta.label.toUpperCase()}</span>
          <span class="result-domain">${escapeHtml(item.domain)}</span>
        </div>
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="result-title">
          ${escapeHtml(item.title)}
        </a>
        <p class="result-snippet">${escapeHtml(item.snippet)}</p>
        <div class="result-footer">
          <span class="result-meta-stats">${escapeHtml(item.metadata?.stats || '')}</span>
          <div class="result-actions">
            <button class="btn-copy" title="Copy URL (Key C)">COPY</button>
            <span class="result-open-link">OPEN ↗</span>
          </div>
        </div>
      `;

      const copyBtn = row.querySelector('.btn-copy');
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.copyUrlToClipboard(item.url, copyBtn);
      });

      row.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-copy')) {
          this.openUrl(item.url);
        }
      });

      this.resultsList.appendChild(row);
    });
  }

  createErrorCard(sourceId, errorMessage) {
    const s = SOURCES[sourceId] || { badge: '[!]', label: sourceId };
    const card = document.createElement('div');
    card.className = 'result-error-card';
    card.innerHTML = `
      <div class="error-info">
        <span class="error-source">${s.badge} ${s.label.toUpperCase()} FAILED</span>
        <span class="error-msg">${escapeHtml(errorMessage)}</span>
      </div>
      <div class="error-actions">
        <button class="btn-retry" title="Retry this source">RETRY</button>
        <button class="btn-retry" title="Open in native search tab">OPEN TAB ↗</button>
      </div>
    `;

    const [retryBtn, openTabBtn] = card.querySelectorAll('button');
    retryBtn.addEventListener('click', () => this.executeSearch(sourceId));
    openTabBtn.addEventListener('click', () => {
      this.openUrl(s.searchUrl(this.currentQuery));
    });

    return card;
  }

  navigateResults(direction) {
    const rows = this.resultsList.querySelectorAll('.result-row');
    if (rows.length === 0) return;

    this.selectedIndex = Math.max(0, Math.min(rows.length - 1, this.selectedIndex + direction));
    rows.forEach((r, idx) => {
      if (idx === this.selectedIndex) {
        r.classList.add('selected');
        r.scrollIntoView({ block: 'nearest' });
      } else {
        r.classList.remove('selected');
      }
    });
  }

  openSelectedResult() {
    const rows = this.resultsList.querySelectorAll('.result-row');
    if (this.selectedIndex >= 0 && this.selectedIndex < rows.length) {
      const url = rows[this.selectedIndex].dataset.url;
      if (url) this.openUrl(url);
    }
  }

  copySelectedResult() {
    const rows = this.resultsList.querySelectorAll('.result-row');
    if (this.selectedIndex >= 0 && this.selectedIndex < rows.length) {
      const url = rows[this.selectedIndex].dataset.url;
      const copyBtn = rows[this.selectedIndex].querySelector('.btn-copy');
      if (url) this.copyUrlToClipboard(url, copyBtn);
    }
  }

  copyUrlToClipboard(url, btnEl = null) {
    navigator.clipboard.writeText(url).then(() => {
      if (btnEl) {
        const oldText = btnEl.textContent;
        btnEl.textContent = 'COPIED!';
        btnEl.style.color = 'var(--accent)';
        setTimeout(() => {
          btnEl.textContent = oldText;
          btnEl.style.color = '';
        }, 1200);
      }
      this.flashStatus('LINK COPIED TO CLIPBOARD', 1500);
    });
  }

  openFilteredInTabs() {
    const filtered = this.activeFilter === 'ALL' 
      ? this.results 
      : this.results.filter(r => r.source === this.activeFilter);

    filtered.forEach(item => {
      this.openUrl(item.url, true);
    });
  }

  openUrl(url, inBackground = false) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url, active: !inBackground });
    } else {
      window.open(url, '_blank');
    }
  }

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

    // 1. Inside Chrome Extension Context
    if (this.isExtensionContext) {
      chrome.runtime.sendMessage({
        type: 'OPEN_TAB_GROUP',
        query,
        sources: activeList
      }, (res) => {
        if (res?.success) {
          this.updateStatus(`${activeList.length} TABS GROUPED`);
          setTimeout(() => window.close(), 700);
        } else {
          this.flashStatus('TAB GROUP FAILED');
        }
      });
      return;
    }

    // 2. Browser Preview Mode (http://localhost:3888)
    activeList.forEach((id, idx) => {
      setTimeout(() => {
        window.open(SOURCES[id].searchUrl(query), '_blank');
      }, idx * 100);
    });

    this.flashStatus('TABS LAUNCHED (NATIVE GROUPING REQUIRES EXTENSION TOOLBAR)');
  }

  openSettingsPage() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('../settings/settings.html', '_blank');
    }
  }

  updateStatus(text, isBusy = false) {
    if (this.statusText) this.statusText.textContent = text;
    if (this.statusIndicator) {
      if (isBusy) this.statusIndicator.classList.add('busy');
      else this.statusIndicator.classList.remove('busy');
    }
  }

  flashStatus(msg, duration = 3000) {
    this.updateStatus(msg);
    setTimeout(() => {
      this.updateStatus('READY');
    }, duration);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SearchlystWorkstation();
});
