import axios from 'axios';

// Usage: node server/test-scraper.js <url1> <url2> ...
// Example: node server/test-scraper.js "https://www.example.com/product/123"

const API = process.env.API_URL || 'http://localhost:3001/api/scraper/product';
const rawArgs = process.argv.slice(2);
const urls = rawArgs.filter(a => !a.startsWith('--'));
const useApiFlag = rawArgs.includes('--useApi') || process.env.USE_SCRAPING_API === '1';
const useProxyFlag = rawArgs.includes('--useProxy') || process.env.USE_SCRAPER_PROXY === '1';

if (!urls.length) {
  console.error('Please provide one or more product URLs as arguments');
  console.error('Optional flag: --useApi to force using configured scraping API provider');
  process.exit(1);
}

(async () => {
  for (const url of urls) {
    try {
      console.log('\n=== Testing URL:', url, 'useScrapingApi=' + useApiFlag, 'useProxy=' + useProxyFlag, '===');
      const resp = await axios.post(API, { url, useScrapingApi: useApiFlag, useProxy: useProxyFlag }, { timeout: 20000 });
      console.log('HTTP', resp.status);
      console.log('Response data:', JSON.stringify(resp.data, null, 2));
    } catch (err) {
      if (err.response) {
        console.error('HTTP', err.response.status);
        console.error('Response body:', JSON.stringify(err.response.data, null, 2));
      } else {
        console.error('Request error:', err.message);
      }
    }
  }
})();
