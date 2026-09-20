/**
 * TabFuse Settings Controller
 */

import { SOURCES, SOURCE_ORDER } from '../utils/constants.js';
import { getSettings, saveSettings } from '../utils/storage.js';

class SettingsManager {
  constructor() {
    this.settings = null;
    this.sourcesContainer = document.getElementById('sourcesSettingsList');
    this.groupTabsToggle = document.getElementById('groupTabsToggle');
    this.openNewTabToggle = document.getElementById('openNewTabToggle');
    this.saveStatus = document.getElementById('saveStatus');
    this.closeBtn = document.getElementById('closeBtn');

    this.init();
  }

  async init() {
    this.settings = await getSettings();
    this.applyTheme(this.settings.theme);
    this.renderSources();
    this.populateControls();
    this.bindEvents();
  }

  applyTheme(theme) {
    const root = document.documentElement;
    let effective = theme;
    if (theme === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    root.setAttribute('data-theme', effective);
  }

  renderSources() {
    this.sourcesContainer.innerHTML = '';
    const enabledSet = new Set(this.settings.enabledSources || SOURCE_ORDER);

    SOURCE_ORDER.forEach(id => {
      const source = SOURCES[id];
      const isChecked = enabledSet.has(id);

      const row = document.createElement('div');
      row.className = 'source-item-row';
      row.innerHTML = `
        <div class="source-item-left">
          <span class="source-code">${source.badge}</span>
          <span class="source-name">${source.label}</span>
          <span class="source-category">(${source.category})</span>
        </div>
        <label class="switch">
          <input type="checkbox" data-source-id="${id}" ${isChecked ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      `;

      const input = row.querySelector('input');
      input.addEventListener('change', async (e) => {
        const sid = e.target.dataset.sourceId;
        if (e.target.checked) {
          enabledSet.add(sid);
        } else {
          if (enabledSet.size > 1) {
            enabledSet.delete(sid);
          } else {
            e.target.checked = true;
            this.flashStatus('At least 1 source must remain active');
            return;
          }
        }
        await saveSettings({ enabledSources: Array.from(enabledSet) });
        this.flashStatus('Sources saved');
      });

      this.sourcesContainer.appendChild(row);
    });
  }

  populateControls() {
    this.groupTabsToggle.checked = !!this.settings.groupTabs;
    this.openNewTabToggle.checked = !!this.settings.openInNewTab;

    const themeRadio = document.querySelector(`input[name="themeRadio"][value="${this.settings.theme}"]`);
    if (themeRadio) {
      themeRadio.checked = true;
    }
  }

  bindEvents() {
    this.groupTabsToggle.addEventListener('change', async (e) => {
      await saveSettings({ groupTabs: e.target.checked });
      this.flashStatus('Behavior saved');
    });

    this.openNewTabToggle.addEventListener('change', async (e) => {
      await saveSettings({ openInNewTab: e.target.checked });
      this.flashStatus('Behavior saved');
    });

    document.querySelectorAll('input[name="themeRadio"]').forEach(radio => {
      radio.addEventListener('change', async (e) => {
        const theme = e.target.value;
        await saveSettings({ theme });
        this.applyTheme(theme);
        this.flashStatus('Theme updated');
      });
    });

    this.closeBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.getCurrent) {
        chrome.tabs.getCurrent((tab) => {
          if (tab) chrome.tabs.remove(tab.id);
          else window.close();
        });
      } else {
        window.close();
      }
    });
  }

  flashStatus(msg) {
    this.saveStatus.textContent = msg;
    setTimeout(() => {
      this.saveStatus.textContent = 'All settings saved locally';
    }, 2000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SettingsManager();
});
