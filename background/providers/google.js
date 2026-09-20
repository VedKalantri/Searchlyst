/**
 * TabFuse — Google / Web Documentation Search Provider
 * Queries web search index with resilient fallback parsing
 */

import { truncate, extractHostname } from '../../utils/sanitize.js';

function cleanHtmlText(str) {
  if (!str) return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export async function searchGoogle(query, maxResults = 5) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;

  // 1. Primary Strategy: Clean Web Search Index (DuckDuckGo HTML) for zero-bot-challenge web docs
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(ddgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (res.ok) {
      const html = await res.text();
      const results = [];

      // Match result blocks: result__title and result__snippet
      const resultBlockRegex = /<h2[^>]+class="result__title"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
      
      let match;
      const seenUrls = new Set();

      while ((match = resultBlockRegex.exec(html)) !== null && results.length < maxResults) {
        let rawUrl = match[1];
        let title = cleanHtmlText(match[2]);
        let snippet = cleanHtmlText(match[3]);

        // Decode DDG redirect URL if needed: //duckduckgo.com/l/?uddg=https%3A%2F%2F...
        let finalUrl = rawUrl;
        if (rawUrl.includes('uddg=')) {
          const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
          if (uddgMatch) {
            finalUrl = decodeURIComponent(uddgMatch[1]);
          }
        }

        if (!finalUrl.startsWith('http') || seenUrls.has(finalUrl) || finalUrl.includes('duckduckgo.com')) {
          continue;
        }
        seenUrls.add(finalUrl);

        const domain = extractHostname(finalUrl);

        results.push({
          id: `gg-${results.length + 1}-${Date.now()}`,
          source: 'google',
          title: title || `${domain} documentation`,
          url: finalUrl,
          domain: domain,
          snippet: truncate(snippet || `Documentation and web guide on ${domain}`, 160),
          metadata: {
            stats: 'Web & Docs',
            authorOrChannel: domain,
            tag: 'Google'
          }
        });
      }

      if (results.length > 0) {
        return { source: 'google', results, error: null };
      }
    }
  } catch (err) {
    console.warn('[TabFuse Google Provider] Web docs fallback attempt failed:', err.message);
  }

  // 2. Fallback direct entry to Google search
  return {
    source: 'google',
    results: [{
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
    }],
    error: null
  };
}
