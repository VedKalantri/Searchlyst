/**
 * TabFuse Storage Adapter
 * Abstracts chrome.storage.local with automatic fallback to localStorage for dev/testing.
 */

import { DEFAULT_SETTINGS } from './constants.js';

const STORAGE_KEY = 'tabfuse_settings';
const RECENT_SEARCHES_KEY = 'tabfuse_recent_searches';

const isChromeStorageAvailable = () => {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
};

export async function getSettings() {
  if (isChromeStorageAvailable()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (res) => {
        if (chrome.runtime.lastError || !res[STORAGE_KEY]) {
          resolve({ ...DEFAULT_SETTINGS });
        } else {
          resolve({ ...DEFAULT_SETTINGS, ...res[STORAGE_KEY] });
        }
      });
    });
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
      chrome.storage.local.get([RECENT_SEARCHES_KEY], (res) => {
        const list = res[RECENT_SEARCHES_KEY] || [];
        resolve(list.slice(0, limit));
      });
    });
  }

  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
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
