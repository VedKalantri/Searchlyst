/**
 * Searchlyst Constants & Source Registry
 */

export const SOURCES = {
  google: {
    id: 'google',
    label: 'Google',
    code: 'G',
    color: '#4285F4',
    badge: '[G]',
    category: 'Web & Docs',
    searchUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
  youtube: {
    id: 'youtube',
    label: 'YouTube',
    code: 'YT',
    badge: '[YT]',
    category: 'Video & Tutorials',
    searchUrl: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  },
  github: {
    id: 'github',
    label: 'GitHub',
    code: 'GH',
    badge: '[GH]',
    category: 'Code & Repos',
    searchUrl: (q) => `https://github.com/search?q=${encodeURIComponent(q)}&type=repositories`,
  },
  reddit: {
    id: 'reddit',
    label: 'Reddit',
    code: 'RD',
    badge: '[RD]',
    category: 'Discussions',
    searchUrl: (q) => `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`,
  },
  stackoverflow: {
    id: 'stackoverflow',
    label: 'Stack Overflow',
    code: 'SO',
    badge: '[SO]',
    category: 'Solutions & Q&A',
    searchUrl: (q) => `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`,
  }
};

export const SOURCE_ORDER = ['google', 'youtube', 'github', 'reddit', 'stackoverflow'];

export const DEFAULT_SETTINGS = {
  theme: 'system', // 'system' | 'light' | 'dark'
  enabledSources: ['google', 'youtube', 'github', 'reddit', 'stackoverflow'],
  openInNewTab: true,
  groupTabs: true,
  tabGroupName: 'Searchlyst Search',
  tabGroupColor: 'orange',
  maxResultsPerSource: 5,
  focusFirstResult: false
};

export const SAMPLE_QUERIES = [
  'docker networking host vs bridge',
  'react server components hydration error',
  'sqlite wal mode concurrent writes',
  'rust async runtime comparison tokio smol',
  'linux epoll vs io_uring architecture'
];
