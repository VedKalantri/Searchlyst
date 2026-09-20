/**
 * Searchlyst Storage Adapter
 * Abstracts chrome.storage.local with automatic fallback to localStorage for dev/testing.
 */

import { DEFAULT_SETTINGS } from './constants.js';

const STORAGE_KEY = 'searchlyst_settings';
const RECENT_SEARCHES_KEY = 'searchlyst_recent_searches';

const isChromeStorageAvailable = () => {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
};

export async function getSettings() {
  if (isChromeStorageAvailable()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY, 'tabfuse_settings'], (res) => {
        const found = res[STORAGE_KEY] || res['tabfuse_settings'];
        if (chrome.runtime.lastError || !found) {
          resolve({ ...DEFAULT_SETTINGS });
        } else {
          resolve({ ...DEFAULT_SETTINGS, ...found });
        }
      });
    });
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('tabfuse_settings');
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(partial) {
  const current = await getSettings();
  const updated = { ...current, ...partial };

  if (isChromeStorageAvailable()) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: updated }, () => {
        resolve(updated);
      });
    });
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
  return updated;
}

export async function getRecentSearches(limit = 6) {
  if (isChromeStorageAvailable()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([RECENT_SEARCHES_KEY, 'tabfuse_recent_searches'], (res) => {
        const list = res[RECENT_SEARCHES_KEY] || res['tabfuse_recent_searches'] || [];
        resolve(list.slice(0, limit));
      });
    });
  }

  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY) || localStorage.getItem('tabfuse_recent_searches');
    const list = raw ? JSON.parse(raw) : [];
    return list.slice(0, limit);
  } catch {
    return [];
  }
}

export async function addRecentSearch(query) {
  const q = query.trim();
  if (!q) return;

  const current = await getRecentSearches(20);
  const filtered = current.filter(item => item.toLowerCase() !== q.toLowerCase());
  const updated = [q, ...filtered].slice(0, 10);

  if (isChromeStorageAvailable()) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [RECENT_SEARCHES_KEY]: updated }, () => {
        resolve(updated);
      });
    });
  }

  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
  return updated;
}
