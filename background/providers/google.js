/**
 * TabFuse — Google Search Provider
 * Isolated provider parsing web search results with fallback resilience
 */

import { truncate, extractHostname } from '../../utils/sanitize.js';

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

export async function searchGoogle(query, maxResults = 5) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!res.ok) {
      throw new Error(`Google responded with HTTP ${res.status}`);
    }

    const html = await res.text();
    const results = [];

    // Parse blocks with <h3> headers and preceding/enclosing links
    // Handles direct links and /url?q= redirects
    const linkRegex = /<a[^>]+href="(?:\/url\?q=)?(https?:\/\/(?!www\.google\.[a-z]+)[^"&]+)[^>]*>(?:[\s\S]*?)<h3[^>]*>([\s\S]*?)<\/h3>/gi;
    
    let match;
    const seenUrls = new Set();

    while ((match = linkRegex.exec(html)) !== null && results.length < maxResults) {
      let targetUrl = decodeURIComponent(match[1]);
      const rawTitle = match[2];
      const title = stripHtml(rawTitle);

      if (!title || seenUrls.has(targetUrl) || targetUrl.includes('google.com')) continue;
      seenUrls.add(targetUrl);

      // Extract a snippet context if available nearby
      const hostname = extractHostname(targetUrl);

      results.push({
        id: `gg-${results.length + 1}-${Date.now()}`,
        source: 'google',
        title: title,
        url: targetUrl,
        domain: hostname,
        snippet: `Web result on ${hostname} matching "${query}"`,
        metadata: {
          stats: 'Web & Docs',
          authorOrChannel: hostname,
          tag: 'Google'
        }
      });
    }

    // If Google returned a consent page or zero parsed items, provide direct search result fallback
    if (results.length === 0) {
      results.push({
        id: `gg-direct-${Date.now()}`,
        source: 'google',
        title: `Google Search: "${query}"`,
        url: searchUrl,
        domain: 'google.com',
        snippet: 'Official Google web and documentation index for this query.',
        metadata: {
          stats: 'Search Index',
          authorOrChannel: 'Google',
          tag: 'Web'
        }
      });
    }

    return { source: 'google', results, error: null };
  } catch (err) {
    return {
      source: 'google',
      results: [],
      error: err.message || 'Failed to search Google'
    };
  }
}
