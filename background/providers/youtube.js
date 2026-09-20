/**
 * TabFuse — YouTube Search Provider
 * Isolated provider parsing ytInitialData state from YouTube search results
 */

import { truncate } from '../../utils/sanitize.js';

export async function searchYouTube(query, maxResults = 5) {
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!res.ok) {
      throw new Error(`YouTube responded with HTTP ${res.status}`);
    }

    const html = await res.text();

    // Extract ytInitialData
    const match = html.match(/(?:var\s+ytInitialData\s*=\s*|window\["ytInitialData"\]\s*=\s*)({.+?});<\/script>/s);
    if (!match || !match[1]) {
      // Fallback if initial data regex didn't catch or layout changed
      return {
        source: 'youtube',
        results: [{
          id: `yt-fallback-${Date.now()}`,
          source: 'youtube',
          title: `Search YouTube for "${query}"`,
          url: searchUrl,
          domain: 'youtube.com',
          snippet: 'Direct video and channel search on YouTube.',
          metadata: {
            stats: 'Video & Tutorials',
            authorOrChannel: 'YouTube Search',
            tag: 'Video'
          }
        }],
        error: null
      };
    }

    const data = JSON.parse(match[1]);
    const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    const videos = [];

    for (const section of sections) {
      const contents = section?.itemSectionRenderer?.contents || [];
      for (const item of contents) {
        if (item.videoRenderer) {
          const v = item.videoRenderer;
          const videoId = v.videoId;
          if (!videoId) continue;

          const title = v.title?.runs?.map(r => r.text).join('') || v.title?.simpleText || 'YouTube Video';
          const channel = v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || 'Channel';
          const views = v.viewCountText?.simpleText || '';
          const duration = v.lengthText?.simpleText || '';

          let snippet = '';
          if (v.detailedMetadataSnippets && v.detailedMetadataSnippets[0]?.snippetText?.runs) {
            snippet = v.detailedMetadataSnippets[0].snippetText.runs.map(r => r.text).join('');
          } else if (v.descriptionSnippet?.runs) {
            snippet = v.descriptionSnippet.runs.map(r => r.text).join('');
          }

          videos.push({
            id: `yt-${videoId}`,
            source: 'youtube',
            title: title.trim(),
            url: `https://www.youtube.com/watch?v=${videoId}`,
            domain: 'youtube.com',
            snippet: truncate(snippet || `Video by ${channel}`, 160),
            metadata: {
              stats: [views, duration].filter(Boolean).join(' • ') || 'Video',
              authorOrChannel: channel,
              tag: 'YouTube'
            }
          });

          if (videos.length >= maxResults) break;
        }
      }
      if (videos.length >= maxResults) break;
    }

    if (videos.length === 0) {
      videos.push({
        id: `yt-query-${Date.now()}`,
        source: 'youtube',
        title: `YouTube Results for "${query}"`,
        url: searchUrl,
        domain: 'youtube.com',
        snippet: 'Explore video breakdowns and tutorials on YouTube.',
        metadata: {
          stats: 'Video Search',
          authorOrChannel: 'YouTube',
          tag: 'Video'
        }
      });
    }

    return { source: 'youtube', results: videos, error: null };
  } catch (err) {
    return {
      source: 'youtube',
      results: [],
      error: err.message || 'Failed to search YouTube'
    };
  }
}
