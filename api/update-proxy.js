// ==============================================================================
// NEET-MDS Top-10 Planner — Serverless Update & Notice Proxy
// Fetches Live from NBEMS, MCC, and DCI Portals
// Handles Cloudflare Bot Challenges Honestly ("Manual check needed")
// Strict ASCII Quotes Only • 30-Minute Cache Header
// ==============================================================================

const https = require('https');
const http = require('http');

// Helper to fetch URL with realistic browser headers and 8s timeout
function fetchUrl(targetUrl) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const client = parsed.protocol === 'https:' ? https : http;
      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        timeout: 7000
      };

      const req = client.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
          if (body.length > 500000) { req.destroy(); } // Cap at 500KB
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ statusCode: 408, error: 'Connection timeout (7s)' });
      });

      req.on('error', (err) => {
        resolve({ statusCode: 500, error: err.message });
      });

      req.end();
    } catch(err) {
      resolve({ statusCode: 500, error: err.message });
    }
  });
}

// Extract notice links and text using regex
function parseHtmlNotices(html, baseUrl, keywordFilter) {
  const notices = [];
  if (!html) return notices;

  // Regex to match anchor tags with text
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const rawHref = match[1];
    const rawText = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    if (rawText.length > 12 && rawText.length < 240) {
      // Check if text is relevant to MDS / examination / counselling / notice
      const lower = rawText.toLowerCase();
      const isRelevant = keywordFilter ?
        keywordFilter.some(k => lower.includes(k.toLowerCase())) :
        (lower.includes('mds') || lower.includes('neet') || lower.includes('bulletin') || lower.includes('counselling') || lower.includes('notice') || lower.includes('admit'));

      if (isRelevant) {
        let fullUrl = rawHref;
        if (!rawHref.startsWith('http')) {
          try {
            fullUrl = new URL(rawHref, baseUrl).href;
          } catch(e) {
            fullUrl = baseUrl;
          }
        }

        // Avoid duplicate links
        if (!notices.some(n => n.title === rawText || n.url === fullUrl)) {
          notices.push({
            title: rawText,
            url: fullUrl,
            date: new Date().toISOString().split('T')[0]
          });
        }
      }
    }
    if (notices.length >= 8) break;
  }

  return notices;
}

module.exports = async (req, res) => {
  // CORS & 30-Minute Cache
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const nowIso = new Date().toISOString();
  const sourceConfigs = [
    {
      id: 'nbems',
      name: 'NBEMS Official (NEET-MDS)',
      url: 'https://natboard.edu.in/viewnbeexam?exam=neetmds',
      keywords: ['neet-mds', 'mds', 'bulletin', 'application', 'eligibility', 'result', 'admit card']
    },
    {
      id: 'mcc',
      name: 'MCC MDS Counselling',
      url: 'https://mcc.nic.in/mds-counselling/',
      keywords: ['mds', 'counselling', 'allotment', 'seat matrix', 'stray', 'round']
    },
    {
      id: 'dci',
      name: 'Dental Council of India (DCI / NDC)',
      url: 'https://dciindia.gov.in/',
      keywords: ['mds', 'internship', 'regulations', 'notification', 'curriculum']
    }
  ];

  const results = {};

  // Fetch all sources concurrently
  await Promise.all(sourceConfigs.map(async (src) => {
    const response = await fetchUrl(src.url);

    // Detect Cloudflare Bot Challenge / 403 / 503
    const isCloudflare = response.statusCode === 403 ||
      (response.body && (
        response.body.includes('cf-browser-verification') ||
        response.body.includes('Cloudflare') ||
        response.body.includes('Verify you are human') ||
        response.body.includes('turnstile')
      ));

    if (isCloudflare) {
      results[src.id] = {
        name: src.name,
        url: src.url,
        status: 'blocked',
        statusText: 'Manual check needed',
        details: 'NBEMS/portal Cloudflare human challenge active. Automated scraping paused.',
        notices: []
      };
    } else if (response.statusCode >= 200 && response.statusCode < 300) {
      const extractedNotices = parseHtmlNotices(response.body, src.url, src.keywords);
      results[src.id] = {
        name: src.name,
        url: src.url,
        status: 'ok',
        statusText: extractedNotices.length > 0 ? 'Notices Parsed' : 'Portal Checked (No new notice)',
        notices: extractedNotices
      };
    } else {
      results[src.id] = {
        name: src.name,
        url: src.url,
        status: 'error',
        statusText: 'Manual check needed',
        details: response.error || ('HTTP ' + response.statusCode),
        notices: []
      };
    }
  }));

  return res.status(200).json({
    status: 'completed',
    lastChecked: nowIso,
    packVersion: '2026-11-15.1',
    sources: results
  });
};
