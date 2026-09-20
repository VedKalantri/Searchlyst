/**
 * TabFuse — Stack Overflow Search Provider
 * Queries StackExchange 2.3 API
 */

import { truncate } from '../../utils/sanitize.js';

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export async function searchStackOverflow(query, maxResults = 5) {
  const url = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=stackoverflow`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Stack Overflow API error (HTTP ${res.status})`);
    }

    const data = await res.json();
    const items = data.items || [];

    const results = items.slice(0, maxResults).map((item) => {
      const tags = (item.tags || []).slice(0, 3).join(', ');
      const solved = item.is_answered ? '✓ Answered' : 'Unsolved';

      return {
        id: `so-${item.question_id}`,
        source: 'stackoverflow',
        title: decodeHtmlEntities(item.title),
        url: item.link,
        domain: 'stackoverflow.com',
        snippet: truncate(`Tags: [${tags}] • ${item.answer_count} answers • ${item.view_count.toLocaleString()} views`, 160),
        metadata: {
          stats: `▲ ${item.score} • ${solved}`,
          authorOrChannel: decodeHtmlEntities(item.owner?.display_name || 'developer'),
          tag: item.tags?.[0] || 'programming'
        }
      };
    });

    return { source: 'stackoverflow', results, error: null };
  } catch (err) {
    return {
      source: 'stackoverflow',
      results: [],
      error: err.message || 'Failed to search Stack Overflow'
    };
  }
}
