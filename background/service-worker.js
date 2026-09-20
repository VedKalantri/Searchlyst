/**
 * Searchlyst Background Service Worker
 * Central Search Orchestrator & Tab Manager (Manifest V3)
 */

import { DEFAULT_SETTINGS, SOURCES } from '../utils/constants.js';
import { getSettings, saveSettings } from '../utils/storage.js';

import { searchGoogle } from './providers/google.js';
import { searchYouTube } from './providers/youtube.js';
import { searchGitHub } from './providers/github.js';
import { searchReddit } from './providers/reddit.js';
import { searchStackOverflow } from './providers/stackoverflow.js';

const PROVIDERS = {
  google: searchGoogle,
  youtube: searchYouTube,
  github: searchGitHub,
  reddit: searchReddit,
  stackoverflow: searchStackOverflow
};

// Lifecycle: Install & Update
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const current = await getSettings();
    await saveSettings({ ...DEFAULT_SETTINGS, ...current });
    console.log('[Searchlyst] Extension installed with default settings.');
  }
});

/**
 * Handle Search Dispatch
 */
async function handleSearch(query, sources = [], maxResults = 5) {
  const startTime = Date.now();
  const targetSources = sources.filter(s => !!PROVIDERS[s]);

  console.log(`[Searchlyst] Dispatching search: "${query}" across [${targetSources.join(', ')}]`);

  // Run all providers concurrently with Promise.allSettled for strict error isolation
  const promises = targetSources.map(async (sourceId) => {
    try {
      const providerFn = PROVIDERS[sourceId];
      const res = await providerFn(query, maxResults);
      return res;
    } catch (err) {
      return {
        source: sourceId,
        results: [],
        error: err.message || 'Provider failed'
      };
    }
  });

  const settled = await Promise.allSettled(promises);

  const aggregated = [];
  const sourceSummaries = {};

  settled.forEach((outcome, idx) => {
    const sourceId = targetSources[idx];
    if (outcome.status === 'fulfilled') {
      const data = outcome.value;
      sourceSummaries[sourceId] = {
        count: data.results?.length || 0,
        error: data.error || null
      };
      if (data.results && data.results.length > 0) {
        aggregated.push(...data.results);
      }
    } else {
      sourceSummaries[sourceId] = {
        count: 0,
        error: outcome.reason?.message || 'Network error'
      };
    }
  });

  const durationMs = Date.now() - startTime;

  return {
    query,
    totalResults: aggregated.length,
    results: aggregated,
    sourceSummaries,
    durationMs
  };
}

/**
 * Create Tabs and organize into a labeled Tab Group
 */
async function handleOpenTabGroup(query, sources = []) {
  if (!chrome.tabs) return { success: false, error: 'Tabs API unavailable' };

  try {
    const createdTabIds = [];

    for (const sourceId of sources) {
      const source = SOURCES[sourceId];
      if (!source) continue;

      const url = source.searchUrl(query);
      const tab = await chrome.tabs.create({ url, active: false });
      createdTabIds.push(tab.id);
    }

    if (chrome.tabGroups && createdTabIds.length > 0) {
      const groupId = await chrome.tabs.group({ tabIds: createdTabIds });
      await chrome.tabGroups.update(groupId, {
        title: `Searchlyst: ${query.slice(0, 18)}`,
        color: 'orange'
      });
    }

    return { success: true, tabCount: createdTabIds.length };
  } catch (err) {
    console.error('[Searchlyst] Tab group creation failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Message Handler
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXECUTE_SEARCH') {
    handleSearch(message.query, message.sources, message.maxResults)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ error: err.message, results: [] }));
    return true; // async response
  }

  if (message.type === 'OPEN_TAB_GROUP') {
    handleOpenTabGroup(message.query, message.sources)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'OPEN_TAB') {
    chrome.tabs.create({ url: message.url, active: !message.inBackground });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'PING') {
    sendResponse({ status: 'PONG', time: Date.now() });
    return false;
  }
});
