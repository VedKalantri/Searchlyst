/**
 * TabFuse — Reddit Search Provider
 * Queries Reddit's search.json public endpoint with fallback
 */

import { truncate } from '../../utils/sanitize.js';

export async function searchReddit(query, maxResults = 5) {
  const encodedQuery = encodeURIComponent(query);
  const urls = [
    `https://www.reddit.com/search.json?q=${encodedQuery}&limit=${maxResults}&sort=relevance`,
    `https://old.reddit.com/search.json?q=${encodedQuery}&limit=${maxResults}&sort=relevance`
  ];

  let lastError = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'TabFuse/1.0 (ChromeExtension; multi-search-tool; mailto:contact@tabfuse.local)'
        }
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Reddit rate limit reached. Retry shortly.');
        }
        if (res.status === 403) {
          throw new Error('Reddit access restricted (HTTP 403).');
        }
        throw new Error(`Reddit HTTP ${res.status}`);
      }

      const json = await res.json();
      const children = json.data?.children || [];

      if (children.length === 0) continue;

      const results = children.slice(0, maxResults).map((item) => {
        const p = item.data;
        const score = p.score >= 1000 ? `${(p.score / 1000).toFixed(1)}k` : `${p.score}`;

        let snippetText = p.selftext ? p.selftext.replace(/[\r\n]+/g, ' ') : '';
        if (!snippetText) {
          snippetText = `Discussion in r/${p.subreddit} by u/${p.author}`;
        }

        return {
          id: `rd-${p.id}`,
          source: 'reddit',
          title: p.title,
          url: `https://www.reddit.com${p.permalink}`,
          domain: `reddit.com/r/${p.subreddit}`,
          snippet: truncate(snippetText, 160),
          metadata: {
            stats: `▲ ${score} • 💬 ${p.num_comments}`,
            authorOrChannel: `u/${p.author}`,
            tag: `r/${p.subreddit}`
          }
        };
      });

      return { source: 'reddit', results, error: null };
    } catch (err) {
      lastError = err.message;
    }
  }

  // If Reddit blocks programmatic API, return a clean direct link so the user can still open and explore it
  return {
    source: 'reddit',
    results: [{
      id: `rd-direct-${Date.now()}`,
      source: 'reddit',
      title: `Reddit Community Discussions: "${query}"`,
      url: `https://www.reddit.com/search/?q=${encodedQuery}`,
      domain: 'reddit.com',
      snippet: 'Explore Reddit threads, questions, and engineering discussions for this topic.',
      metadata: {
        stats: 'Reddit Community',
        authorOrChannel: 'Reddit Search',
        tag: 'Discussions'
      }
    }],
    error: lastError
  };
}
