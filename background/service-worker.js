/**
 * TabFuse Service Worker
 * Background lifecycle orchestrator for TabFuse (Manifest V3)
 */

import { DEFAULT_SETTINGS } from '../utils/constants.js';
import { getSettings, saveSettings } from '../utils/storage.js';

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const current = await getSettings();
    await saveSettings({ ...DEFAULT_SETTINGS, ...current });
    console.log('[TabFuse] Initialized defaults on install.');
  }
});

// Listener for future Phase 2 messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ status: 'PONG', timestamp: Date.now() });
  }
  return true;
});
