import fetch from 'node-fetch';

// Header rotation: lightweight user-agent variants
export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export function looksLikeBotBlock(body) {
  if (!body || typeof body !== 'string') return false;
  const lower = body.toLowerCase();
  const indicators = ['captcha', 'cloudflare', 'cf-chl-bypass', 'access denied', 'bot', 'blocked', 'bot detection', 'verify you are human', 'reference id', 'bad request'];
  return indicators.some(i => lower.includes(i));
}

export async function buildAgentIfNeeded(proxy) {
  if (!proxy) return null;
  try {
    const mod = await import('https-proxy-agent');
    const HttpsProxyAgent = mod.default || mod.HttpsProxyAgent || mod;
    return new HttpsProxyAgent(proxy);
  } catch (e) {
    console.warn('SCRAPER_PROXY set but https-proxy-agent not installed.');
    return null;
  }
}

// ScrapingBee Amazon Product API - returns structured JSON data
export async function fetchAmazonProduct(asin, apiKey) {
  if (!apiKey || !asin) return null;
  
  const params = new URLSearchParams();
  params.set('api_key', apiKey);
  params.set('query', asin);  // ScrapingBee uses 'query' for ASIN
  params.set('domain', 'com');
  
  const apiUrl = `https://app.scrapingbee.com/api/v1/amazon/product?${params.toString()}`;
  console.log('📦 Using ScrapingBee Amazon Product API for ASIN:', asin);
  
  try {
    const resp = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
      timeout: parseInt(process.env.SCRAPER_TIMEOUT_MS || '30000', 10)
    });
    
    if (resp.ok) {
      const data = await resp.json();
      return { success: true, data, isAmazon: true };
    }
    return null;
  } catch (err) {
    console.warn('Amazon API fetch error:', err?.message || err);
    return null;
  }
}

// Extract ASIN from Amazon URL
export function extractAmazonASIN(url) {
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes('amazon')) return null;
    
    // Match various Amazon URL patterns
    // /dp/ASIN
    const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
    if (dpMatch) return dpMatch[1];
    
    // /gp/product/ASIN
    const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    if (gpMatch) return gpMatch[1];
    
    // /gp/aw/d/ASIN (mobile URLs)
    const mobileMatch = url.match(/\/gp\/aw\/d\/([A-Z0-9]{10})/i);
    if (mobileMatch) return mobileMatch[1];
    
    // /product/ASIN
    const productMatch = url.match(/\/product\/([A-Z0-9]{10})/i);
    if (productMatch) return productMatch[1];
    
    return null;
  } catch {
    return null;
  }
}

export async function fetchViaScrapingApi(targetUrl, provider, apiKey, opts = {}) {
  if (!provider || !apiKey) return null;
  provider = provider.toLowerCase();
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  let apiUrl = null;
  const params = new URLSearchParams();
  if (provider === 'scrapingbee') {
    params.set('api_key', apiKey);
    params.set('url', targetUrl);
    // Use JS rendering for dynamic sites
    params.set('render_js', 'true');
    params.set('block_ads', 'true');
    // Use regular premium proxy (stealth uses 75 credits per request)
    params.set('premium_proxy', 'true');
    params.set('country_code', 'us');
    apiUrl = `https://app.scrapingbee.com/api/v1/?${params.toString()}`;
  } else if (provider === 'scraperapi') {
    params.set('api_key', apiKey);
    params.set('url', targetUrl);
    if (opts.render) params.set('render', 'true');
    apiUrl = `http://api.scraperapi.com?${params.toString()}`;
  } else {
    console.warn('Unknown scraping provider:', provider);
    return null;
  }

  try {
    const resp = await fetch(apiUrl, {
      headers: { 'User-Agent': ua, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
      timeout: parseInt(process.env.SCRAPER_TIMEOUT_MS || '10000', 10)
    });
    return resp;
  } catch (err) {
    console.warn('Scraping API fetch error:', err && err.message ? err.message : err);
    return null;
  }
}

// Try fetch with a given http(s) agent and retry/backoff logic
export async function tryFetchWithAgent(url, agent, maxAttempts = 3, baseTimeout = 10000) {
  let resp = null;
  let lastError = null;
  let blockedBody = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      resp = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: baseTimeout,
        agent
      });

      if (!resp.ok) {
        if (resp.status >= 500 || resp.status === 429) {
          lastError = new Error(`Remote returned ${resp.status} ${resp.statusText}`);
          if (attempt < maxAttempts) await sleep(2 ** attempt * 250);
          continue;
        }

        let body = '';
        try { body = await resp.text(); } catch (e) { body = ''; }
        if (resp.status === 403 || looksLikeBotBlock(body)) {
          blockedBody = body;
          return { resp, blockedBody, lastError };
        }

        return { resp, blockedBody, lastError };
      }

      return { resp, blockedBody, lastError };
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) await sleep(2 ** attempt * 250);
    }
  }
  return { resp, blockedBody, lastError };
}

// High-level helper: try provider (if requested) then direct, then optional proxy
export async function fetchWithFallback(url, opts = {}) {
  const provider = opts.provider || process.env.SCRAPING_PROVIDER || null;
  const apiKey = opts.apiKey || process.env.SCRAPING_API_KEY || null;
  const useScrapingApi = Boolean(opts.useScrapingApi) || (provider && apiKey);
  const useProxyFlag = Boolean(opts.useProxy);
  const maxAttempts = parseInt(process.env.SCRAPER_MAX_ATTEMPTS || '3', 10);
  const baseTimeout = parseInt(process.env.SCRAPER_TIMEOUT_MS || '10000', 10);

  // If requested, try provider first
  if (useScrapingApi) {
    try {
      const apiResp = await fetchViaScrapingApi(url, provider, apiKey, { render_js: false, render: true });
      if (apiResp) {
        if (apiResp.ok) return { response: apiResp, blockedBody: null, lastError: null, usedProvider: true };
        // otherwise fallthrough to direct
        let bodySnippet = '';
        try { const b = await apiResp.text(); bodySnippet = String(b).slice(0, 1000); } catch (e) { bodySnippet = `<unable to read: ${e.message}>`; }
        console.warn('Scraping API returned non-OK', { status: apiResp.status, bodySnippet });
      }
    } catch (e) {
      console.warn('Error using scraping API adapter:', e && e.message ? e.message : e);
    }
  }

  // Direct fetch
  let result = await tryFetchWithAgent(url, null, maxAttempts, baseTimeout);
  let response = result.resp;
  let blockedBody = result.blockedBody;
  let lastError = result.lastError;

  // If blocked and proxy configured OR useProxyFlag requested, try proxy
  const proxy = process.env.SCRAPER_PROXY || opts.proxy || null;
  if ((result.blockedBody || (response && response.status === 403) || useProxyFlag) && proxy) {
    const agent = await buildAgentIfNeeded(proxy);
    if (agent) {
      const proxyResult = await tryFetchWithAgent(url, agent, maxAttempts, baseTimeout);
      response = proxyResult.resp || response;
      blockedBody = blockedBody || proxyResult.blockedBody;
      lastError = lastError || proxyResult.lastError;
    } else {
      console.warn('SCRAPER_PROXY configured but agent not available');
    }
  }

  return { response, blockedBody, lastError, usedProvider: false };
}

export default {
  fetchViaScrapingApi,
  buildAgentIfNeeded,
  tryFetchWithAgent,
  fetchWithFallback,
  looksLikeBotBlock,
  fetchAmazonProduct,
  extractAmazonASIN
};
