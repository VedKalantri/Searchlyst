/**
 * TabFuse Sanitization & Security Utilities
 */

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, (s) => ESCAPE_MAP[s] || s);
}

export function truncate(str, maxLen = 140) {
  if (!str) return '';
  const trimmed = str.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen).trim() + '…';
}

export function cleanUrl(url) {
  try {
    const parsed = new URL(url);
    // Strip trailing slashes and common tracking parameters
    ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'source'].forEach(p => parsed.searchParams.delete(p));
    return parsed.toString();
  } catch {
    return url;
  }
}

export function extractHostname(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
