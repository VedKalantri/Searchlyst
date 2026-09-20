/**
 * Searchlyst — GitHub Search Provider
 * Queries GitHub's public Search API
 */

import { truncate } from '../../utils/sanitize.js';

export async function searchGitHub(query, maxResults = 5) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${maxResults}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Searchlyst-Search-Extension'
      }
    });

    if (!res.ok) {
      if (res.status === 403) {
        throw new Error('GitHub API rate limit reached. Retry shortly.');
      }
      throw new Error(`GitHub error (HTTP ${res.status})`);
    }

    const data = await res.json();
    const items = data.items || [];

    const results = items.slice(0, maxResults).map((repo) => {
      const stars = repo.stargazers_count >= 1000 
        ? `${(repo.stargazers_count / 1000).toFixed(1)}k` 
        : `${repo.stargazers_count}`;

      return {
        id: `gh-${repo.id}`,
        source: 'github',
        title: repo.full_name,
        url: repo.html_url,
        domain: 'github.com',
        snippet: truncate(repo.description || 'Public repository on GitHub.', 160),
        metadata: {
          stats: `★ ${stars} • 🍴 ${repo.forks_count}`,
          authorOrChannel: repo.owner?.login || '',
          tag: repo.language || 'Code'
        }
      };
    });

    return { source: 'github', results, error: null };
  } catch (err) {
    return {
      source: 'github',
      results: [],
      error: err.message || 'Failed to search GitHub'
    };
  }
}
