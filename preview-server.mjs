import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

import { searchGoogle } from './background/providers/google.js';
import { searchYouTube } from './background/providers/youtube.js';
import { searchGitHub } from './background/providers/github.js';
import { searchReddit } from './background/providers/reddit.js';
import { searchStackOverflow } from './background/providers/stackoverflow.js';

const PORT = 3888;
const ROOT = path.resolve('.');

const PROVIDERS = {
  google: searchGoogle,
  youtube: searchYouTube,
  github: searchGitHub,
  reddit: searchReddit,
  stackoverflow: searchStackOverflow
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let reqPath = decodeURI(parsedUrl.pathname);

  // API Route: /api/search?q=...&sources=google,youtube,...
  if (reqPath === '/api/search') {
    const q = parsedUrl.searchParams.get('q') || '';
    const sourcesParam = parsedUrl.searchParams.get('sources') || '';
    const sources = sourcesParam ? sourcesParam.split(',') : ['google', 'youtube', 'github', 'reddit', 'stackoverflow'];
    const limit = parseInt(parsedUrl.searchParams.get('limit') || '5', 10);

    const startTime = Date.now();
    const promises = sources.map(async (sid) => {
      const provider = PROVIDERS[sid];
      if (!provider) return { source: sid, results: [], error: 'Unknown provider' };
      try {
        return await provider(q, limit);
      } catch (err) {
        return { source: sid, results: [], error: err.message };
      }
    });

    const settled = await Promise.allSettled(promises);
    const aggregated = [];
    const sourceSummaries = {};

    settled.forEach((outcome, idx) => {
      const sid = sources[idx];
      if (outcome.status === 'fulfilled') {
        const val = outcome.value;
        sourceSummaries[sid] = { count: val.results?.length || 0, error: val.error || null };
        if (val.results) aggregated.push(...val.results);
      } else {
        sourceSummaries[sid] = { count: 0, error: outcome.reason?.message || 'Network error' };
      }
    });

    const durationMs = Date.now() - startTime;
    const responsePayload = {
      query: q,
      totalResults: aggregated.length,
      results: aggregated,
      sourceSummaries,
      durationMs
    };

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(responsePayload));
  }

  // Static File Serving
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/popup/popup.html';
  }

  const filePath = path.join(ROOT, reqPath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found: ' + reqPath);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[Searchlyst Preview Server] Ready at: http://localhost:${PORT}/popup/popup.html`);
  console.log(`[Searchlyst Search API] Ready at: http://localhost:${PORT}/api/search`);
});
