/**
 * TabFuse — Reddit Search Provider
 * Resilient multi-strategy search for Reddit community discussions
 */

import { truncate, extractHostname } from '../../utils/sanitize.js';

function cleanHtmlEntities(str) {
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

export async function searchReddit(query, maxResults = 5) {
  const encodedQuery = encodeURIComponent(query);

  // Strategy 1: Clean Site-Search Index for Reddit discussions (bypasses Reddit bot challenge walls)
  try {
    const siteQuery = encodeURIComponent(`site:reddit.com ${query}`);
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${siteQuery}`;

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
      const blockRegex = /<h2[^>]+class="result__title"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
      let match;
      const seenUrls = new Set();

      while ((match = blockRegex.exec(html)) !== null && results.length < maxResults) {
        let rawUrl = match[1];

        // Decode DDG redirect URL if needed: //duckduckgo.com/l/?uddg=https%3A%2F%2F...
        let finalUrl = rawUrl;
        if (rawUrl.includes('uddg=')) {
          const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
          if (uddgMatch) {
            finalUrl = decodeURIComponent(uddgMatch[1]);
          }
        }

        if (!finalUrl.includes('reddit.com/r/') || seenUrls.has(finalUrl)) {
          continue;
        }
        seenUrls.add(finalUrl);

        let rawTitle = cleanHtmlEntities(match[2]);
        // Clean title: remove trailing " : r/subreddit" or " - Reddit"
        rawTitle = rawTitle.replace(/\s*[-:—]\s*(?:r\/[a-zA-Z0-9_]+|Reddit).*$/i, '').trim();

        const snippet = cleanHtmlEntities(match[3]);

        // Extract subreddit from URL
        const subMatch = finalUrl.match(/reddit\.com\/r\/([^/]+)/i);
        const subreddit = subMatch ? `r/${subMatch[1]}` : 'r/community';

        results.push({
          id: `rd-${results.length + 1}-${Date.now()}`,
          source: 'reddit',
          title: rawTitle || `Reddit Discussion in ${subreddit}`,
          url: finalUrl,
          domain: `reddit.com/${subreddit}`,
          snippet: truncate(snippet || `Community discussion in ${subreddit}`, 160),
          metadata: {
            stats: subreddit,
            authorOrChannel: subreddit,
            tag: subreddit
          }
        });
      }

      if (results.length > 0) {
        return { source: 'reddit', results, error: null };
      }
    }
  } catch (err) {
    console.warn('[TabFuse Reddit Provider] Site-search attempt error:', err.message);
  }

  // Strategy 2: Direct public Reddit search link fallback (never leaves user with a broken state)
  return {
    source: 'reddit',
    results: [{
      id: `rd-direct-${Date.now()}`,
      source: 'reddit',
      title: `Reddit Community Discussions: "${query}"`,
      url: `https://www.reddit.com/search/?q=${encodedQuery}`,
      domain: 'reddit.com',
      snippet: 'Explore Reddit engineering discussions, real-world bug reports, and solutions.',
      metadata: {
        stats: 'Community Discussions',
        authorOrChannel: 'Reddit',
        tag: 'Reddit'
      }
    }],
    error: null
  };
}
