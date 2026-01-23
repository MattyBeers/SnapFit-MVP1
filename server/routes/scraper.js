/**
 * Web Scraper Route - Extract product info from clothing websites
 * Scrapes product details from e-commerce sites for easy wishlist addition
 */

import express from 'express';
import * as cheerio from 'cheerio';
import scraperAdapter from '../lib/scraperAdapter.js';

const router = express.Router();

// Header rotation: lightweight user-agent variants
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function buildAgentIfNeeded() {
  const proxy = process.env.SCRAPER_PROXY;
  if (!proxy) return null;
  try {
    const mod = await import('https-proxy-agent');
    const HttpsProxyAgent = mod.default || mod.HttpsProxyAgent || mod;
    return new HttpsProxyAgent(proxy);
  } catch (e) {
    console.warn('SCRAPER_PROXY set but https-proxy-agent not installed. Install with `npm i https-proxy-agent` to enable proxy support.');
    return null;
  }
}

function looksLikeBotBlock(body) {
  if (!body || typeof body !== 'string') return false;
  const lower = body.toLowerCase();
  const indicators = ['captcha', 'cloudflare', 'cf-chl-bypass', 'access denied', 'bot', 'blocked', 'bot detection', 'verify you are human', 'reference id', 'bad request'];
  return indicators.some(i => lower.includes(i));
}

// Adapter: call a scraping API provider (ScrapingBee, ScraperAPI)
async function fetchViaScrapingApi(targetUrl, provider, apiKey, opts = {}) {
  if (!provider || !apiKey) return null;
  provider = provider.toLowerCase();
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  let apiUrl = null;
  const params = new URLSearchParams();
  if (provider === 'scrapingbee') {
    // ScrapingBee expects api_key and url
    params.set('api_key', apiKey);
    params.set('url', targetUrl);
    if (opts.render_js) params.set('render_js', 'true');
    // helpful defaults for demo
    params.set('block_ads', 'true');
    apiUrl = `https://app.scrapingbee.com/api/v1/?${params.toString()}`;
  } else if (provider === 'scraperapi') {
    // ScraperAPI expects api_key and url
    params.set('api_key', apiKey);
    params.set('url', targetUrl);
    if (opts.render) params.set('render', 'true');
    apiUrl = `http://api.scraperapi.com?${params.toString()}`;
  } else {
    console.warn('Unknown scraping provider:', provider);
    return null;
  }

  console.log(`➡️ Using scraping API provider ${provider} for ${targetUrl}`);
  try {
    const resp = await fetch(apiUrl, {
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: parseInt(process.env.SCRAPER_TIMEOUT_MS || '10000', 10),
    });
    return resp;
  } catch (err) {
    console.warn('Scraping API fetch error:', err && err.message ? err.message : err);
    return null;
  }
}
/**
 * POST /api/scraper/product
 * Scrape product information from a URL
 */
router.post('/product', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL
    let productUrl;
    try {
      productUrl = new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log('🔍 Scraping product from:', url);

    // Detect retailer for specialized scraping
    const hostname = productUrl.hostname.toLowerCase();
    const retailer = detectRetailer(hostname);
    console.log('🏪 Detected retailer:', retailer);

    // Use centralized adapter to handle provider and proxy fallbacks
    const provider = process.env.SCRAPING_PROVIDER || null;
    const providerKey = process.env.SCRAPING_API_KEY || null;
    const useScrapingApi = Boolean(req.body && req.body.useScrapingApi) || (provider && providerKey);
    const useProxy = Boolean(req.body && req.body.useProxy);

    // Special handling for Amazon - use ScrapingBee's Amazon Product API
    if (retailer === 'amazon' && provider === 'scrapingbee' && providerKey) {
      const asin = scraperAdapter.extractAmazonASIN(url);
      if (asin) {
        console.log('🛒 Using Amazon Product API for ASIN:', asin);
        try {
          const amazonResult = await scraperAdapter.fetchAmazonProduct(asin, providerKey);
          
          if (amazonResult && amazonResult.success && amazonResult.data) {
            const amazonData = amazonResult.data;
          console.log('📦 Amazon API raw data:', JSON.stringify(amazonData, null, 2).slice(0, 2000));
          
          // Get actual product image - be more lenient with filtering
          let mainImage = '';
          let productImages = [];
          
          // Try main_image first
          if (amazonData.main_image && typeof amazonData.main_image === 'string') {
            // Accept any amazon image URL except tracking pixels
            if (!amazonData.main_image.includes('fls-na.amazon') && 
                !amazonData.main_image.includes('uedata')) {
              mainImage = amazonData.main_image;
              productImages.push(mainImage);
            }
          }
          
          // Then try images array
          if (amazonData.images && Array.isArray(amazonData.images)) {
            const validImages = amazonData.images.filter(img => {
              if (!img || typeof img !== 'string') return false;
              // Accept most amazon image URLs
              if (img.includes('fls-na.amazon') || img.includes('uedata')) return false;
              return img.includes('amazon') || img.includes('ssl-images') || img.startsWith('http');
            });
            productImages = [...new Set([...productImages, ...validImages])];
            if (!mainImage && validImages.length > 0) mainImage = validImages[0];
          }
          
          // Try image_url as fallback
          if (!mainImage && amazonData.image_url) {
            mainImage = amazonData.image_url;
            productImages.push(mainImage);
          }
          
          // Parse price correctly - handle various formats
          let priceValue = '';
          if (amazonData.price) {
            if (typeof amazonData.price === 'object') {
              priceValue = amazonData.price.value || amazonData.price.amount || amazonData.price.raw || '';
            } else if (typeof amazonData.price === 'string') {
              // Extract number from price string like "$64.99"
              const match = amazonData.price.match(/([\d,.]+)/);
              priceValue = match ? parseFloat(match[1].replace(',', '')) : '';
            } else if (typeof amazonData.price === 'number') {
              priceValue = amazonData.price;
            }
          }
          // Also check buybox_price which is often more accurate
          if (!priceValue && amazonData.buybox_price) {
            if (typeof amazonData.buybox_price === 'object') {
              priceValue = amazonData.buybox_price.value || amazonData.buybox_price.amount || '';
            } else {
              priceValue = amazonData.buybox_price;
            }
          }
          
          const productInfo = {
            name: amazonData.title || amazonData.name || '',
            image_url: mainImage,
            images: productImages,
            price: priceValue,
            brand: amazonData.brand || amazonData.manufacturer || 'Amazon',
            description: amazonData.description || (amazonData.feature_bullets ? amazonData.feature_bullets.join(' ') : '') || '',
            url: url,
            type: categorizeProduct((amazonData.title || '') + ' ' + (amazonData.description || '')),
            color: amazonData.color || '',
            category: amazonData.categories?.[0] || '',
            rating: amazonData.rating,
            reviews_count: amazonData.reviews_count,
          };
          
          console.log('📦 Parsed product info:', { name: productInfo.name, image_url: productInfo.image_url, price: productInfo.price });
            return res.json({ success: true, product: productInfo });
          }
        } catch (amazonError) {
          console.warn('Amazon Product API failed, falling back to general scraper:', amazonError.message);
        }
        // If Amazon API failed, don't fall through - Amazon blocks general scraping
        // Return a helpful error instead
        return res.status(400).json({ 
          error: 'Could not fetch Amazon product. The product may not exist or Amazon is blocking requests.',
          suggestion: 'Try copying the full product URL from Amazon, or add the item manually.'
        });
      }
    }

    // Let adapter handle provider-first then direct/proxy fallback
    const adapterResult = await scraperAdapter.fetchWithFallback(url, { provider, apiKey: providerKey, useScrapingApi, useProxy });
    let response = adapterResult.response;
    let blockedBody = adapterResult.blockedBody;
    let lastError = adapterResult.lastError;

    if (!response) {
      console.error('❌ Scraping error:', lastError || new Error('No response from fetch attempts'));
      return res.status(500).json({ error: 'Failed to scrape product information', details: (lastError && lastError.message) || 'No response' });
    }

    if (!response.ok) {
      // If we detected a bot block, return a clearer blocked response
      if (blockedBody || response.status === 403) {
        const snippet = blockedBody ? blockedBody.slice(0, 1000) : '';
        return res.status(423).json({ error: 'Scraper blocked', details: `Blocked response detected. Snippet: ${snippet}` });
      }

      // Non-OK other statuses
      let respBody = null;
      try { respBody = await response.text(); } catch (e) { respBody = `<unable to read body: ${e.message}>`; }
      return res.status(502).json({ error: `Failed to fetch URL: ${response.status} ${response.statusText}`, details: `Response body (first 1000 chars): ${typeof respBody === 'string' ? respBody.slice(0, 1000) : String(respBody)}` });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract product information using multiple strategies
    const productInfo = {
      name: '',
      image_url: '',
      price: '',
      brand: '',
      description: '',
      url: url,
      type: 'shirt', // default
      color: '',
      category: '',
    };

    // Strategy 1: Open Graph meta tags (most reliable)
    // Collect image candidates (og:image, twitter:image)
    const imagesSet = new Set();
    const ogImage = $('meta[property="og:image"]').attr('content');
    const twImage = $('meta[name="twitter:image"]').attr('content');
    if (ogImage) imagesSet.add(ogImage);
    if (twImage) imagesSet.add(twImage);

    productInfo.description = $('meta[property="og:description"]').attr('content') || 
                              $('meta[name="description"]').attr('content') || '';

    // Strategy 2: JSON-LD structured data (e-commerce sites often use this)
    const jsonLdScripts = $('script[type="application/ld+json"]');
    jsonLdScripts.each((i, elem) => {
      try {
        let data = JSON.parse($(elem).html());

        if (Array.isArray(data)) {
          data = data.find(item => item['@type'] === 'Product') || data[0];
        }

        let product = null;
        if (data) {
          if (data['@type'] === 'Product') product = data;
          else if (data['@graph']) product = data['@graph'].find(item => item['@type'] === 'Product');
        }

        if (product) {
          if (product.name && !productInfo.name) productInfo.name = product.name;

          // Collect images from JSON-LD
          if (product.image) {
            if (Array.isArray(product.image)) {
              product.image.forEach(img => imagesSet.add(typeof img === 'string' ? img : img?.url || img?.contentUrl));
            } else {
              const img = typeof product.image === 'string' ? product.image : product.image?.url || product.image?.contentUrl;
              if (img) imagesSet.add(img);
            }
          }

          if (product.description && !productInfo.description) productInfo.description = product.description;
          if (product.brand && !productInfo.brand) {
            productInfo.brand = typeof product.brand === 'string' ? product.brand : product.brand?.name || '';
          }

          // Handle offers which may be array or object
          const offers = product.offers;
          let priceValue;
          if (Array.isArray(offers) && offers.length > 0) {
            priceValue = offers[0].price || offers[0].priceSpecification?.price;
          } else if (offers) {
            priceValue = offers.price || offers.priceSpecification?.price;
          }

          if (priceValue) {
            productInfo.price = typeof priceValue === 'number' ? priceValue : parseFloat(String(priceValue).replace(/[^\d.]/g, ''));
          }

          if (product.color && !productInfo.color) productInfo.color = product.color;
        }
      } catch (e) {
        // Skip invalid JSON
      }
    });

    // Strategy 3: Common HTML patterns
    if (!productInfo.name) {
      productInfo.name = $('h1.product-title').text().trim() ||
                        $('h1[itemprop="name"]').text().trim() ||
                        $('.product-name').text().trim() ||
                        $('h1').first().text().trim();
    }

    // Collect additional image candidates from common selectors
    const gallerySelectors = [
      'img.product-image',
      'img[itemprop="image"]',
      '.product-photo img',
      '#product-image',
      '.product-gallery img',
      '.product-thumbnails img',
      '.carousel img',
    ];
    gallerySelectors.forEach(sel => {
      $(sel).each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy');
        if (src) imagesSet.add(src);
      });
    });

    // Fallback: first image on page
    if (imagesSet.size === 0) {
      const firstImg = $('img').first().attr('src');
      if (firstImg) imagesSet.add(firstImg);
    }

    // Normalize and set primary image_url
    const images = Array.from(imagesSet).filter(Boolean).map(src => {
      if (typeof src !== 'string') return null;
      try {
        if (!src.startsWith('http')) return new URL(src, productUrl.origin).href;
        return src;
      } catch (e) {
        return src;
      }
    }).filter(Boolean);
    if (images.length > 0) productInfo.image_url = images[0];
    productInfo.images = images;

    if (!productInfo.price) {
      // Try common meta tags for price
      const metaPrice = $('meta[property="product:price:amount"]').attr('content') || $('meta[name="price"]').attr('content');
      if (metaPrice) {
        productInfo.price = parseFloat(String(metaPrice).replace(/[^\d.]/g, ''));
      } else {
        const priceText = $('.product-price').text() ||
                         $('[itemprop="price"]').text() ||
                         $('.price').first().text() || '';
        // Extract numeric price (global search for currency+number patterns)
        const globalMatch = priceText.match(/[\$€£]\s*(\d{1,3}(?:[.,]\d{2})?)/);
        if (globalMatch) {
          productInfo.price = parseFloat(globalMatch[1].replace(/,/g, ''));
        } else {
          // Last resort: search entire HTML for a price-like string
          const priceMatch = html.match(/[\$€£]\s*(\d{1,3}(?:[.,]\d{2})?)/);
          if (priceMatch) productInfo.price = parseFloat(priceMatch[1].replace(/,/g, ''));
        }
      }
    }

    if (!productInfo.brand) {
      productInfo.brand = $('[itemprop="brand"]').text().trim() ||
                         $('.product-brand').text().trim() ||
                         $('meta[property="og:site_name"]').attr('content') ||
                         productUrl.hostname.replace('www.', '').split('.')[0];
    }

    // Strategy 4: Enhanced product categorization
    const searchText = ((productInfo.name || '') + ' ' + (productInfo.description || '')).toLowerCase();
    productInfo.type = categorizeProduct(searchText);

    // Extract color if not already found
    if (!productInfo.color) {
      const colorMatch = searchText.match(/\b(black|white|red|blue|green|yellow|pink|purple|orange|brown|gray|grey|beige|navy|teal|burgundy|maroon|olive|tan|cream|ivory)\b/);
      if (colorMatch) {
        productInfo.color = colorMatch[1];
      }
    }

    console.log('📊 Categorized as:', productInfo.type);

    // Extract color
    if (!productInfo.color) {
      const colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'orange', 'brown', 'gray', 'grey', 'beige', 'navy', 'tan'];
      for (const color of colors) {
        if (searchText.includes(color)) {
          productInfo.color = color;
          break;
        }
      }
    }

    // Ensure all images are absolute (already normalized above), but re-run defensive normalization
    if (Array.isArray(productInfo.images)) {
      productInfo.images = productInfo.images.map(src => {
        try {
          if (!src.startsWith('http')) return new URL(src, productUrl.origin).href;
          return src;
        } catch (e) {
          return src;
        }
      });
      if (!productInfo.image_url && productInfo.images.length) productInfo.image_url = productInfo.images[0];
    }

    // Clean up name (remove extra whitespace, brand name duplicates)
    productInfo.name = productInfo.name.trim().replace(/\s+/g, ' ');

    // Validation - be more lenient, accept if we have at least name OR image
    if (!productInfo.name && !productInfo.image_url) {
      return res.status(400).json({ 
        error: 'Could not extract product information from this URL. Please try a direct product page.',
        partial: productInfo 
      });
    }
    
    // If we have image but no name, try to extract name from URL
    if (!productInfo.name && productInfo.image_url) {
      const urlPath = productUrl.pathname;
      const pathSegments = urlPath.split('/').filter(Boolean);
      const lastSegment = pathSegments[pathSegments.length - 1] || '';
      productInfo.name = lastSegment.replace(/-/g, ' ').replace(/\d+/g, '').trim() || 'Item from ' + productInfo.brand;
    }

    console.log('✅ Successfully scraped product:', productInfo.name);

    res.json({
      success: true,
      product: productInfo,
    });

  } catch (error) {
    console.error('❌ Scraping error:', error);
    res.status(500).json({ 
      error: 'Failed to scrape product information',
      details: error.message 
    });
  }
});

// Helper: Detect retailer from hostname
function detectRetailer(hostname) {
  if (hostname.includes('amazon')) return 'amazon';
  if (hostname.includes('zara')) return 'zara';
  if (hostname.includes('hm.com') || hostname.includes('h&m')) return 'hm';
  if (hostname.includes('asos')) return 'asos';
  if (hostname.includes('shein')) return 'shein';
  if (hostname.includes('nike')) return 'nike';
  if (hostname.includes('adidas')) return 'adidas';
  if (hostname.includes('gap')) return 'gap';
  if (hostname.includes('forever21')) return 'forever21';
  if (hostname.includes('urbanoutfitters')) return 'urban-outfitters';
  return 'generic';
}

// Helper: Auto-categorize product type with enhanced AI logic
function categorizeProduct(text) {
  const lower = text.toLowerCase();
  
  // Tops
  if (lower.match(/\b(t-shirt|tee|tank top|camisole|crop top|tube top)\b/)) return 'shirt';
  if (lower.match(/\b(blouse|button-up|button down)\b/)) return 'shirt';
  if (lower.match(/\b(sweater|pullover|knit|cardigan)\b/)) return 'sweater';
  if (lower.match(/\b(hoodie|sweatshirt)\b/)) return 'hoodie';
  
  // Outerwear
  if (lower.match(/\b(jacket|coat|blazer|parka|windbreaker|bomber)\b/)) return 'jacket';
  
  // Bottoms
  if (lower.match(/\b(jeans|denim)\b/)) return 'jeans';
  if (lower.match(/\b(pants|trousers|slacks|chinos|khakis)\b/)) return 'pants';
  if (lower.match(/\b(shorts|bermuda)\b/)) return 'shorts';
  if (lower.match(/\b(skirt|mini|midi|maxi)\b/)) return 'skirt';
  if (lower.match(/\b(leggings|tights)\b/)) return 'leggings';
  
  // Dresses & One-pieces
  if (lower.match(/\b(dress|gown|frock|sundress)\b/)) return 'dress';
  if (lower.match(/\b(jumpsuit|romper|playsuit|overalls)\b/)) return 'jumpsuit';
  
  // Footwear
  if (lower.match(/\b(sneakers|trainers|kicks)\b/)) return 'sneakers';
  if (lower.match(/\b(boots|ankle boot|knee boot)\b/)) return 'boots';
  if (lower.match(/\b(heels|pumps|stilettos)\b/)) return 'heels';
  if (lower.match(/\b(sandals|flip-flops|slides)\b/)) return 'sandals';
  if (lower.match(/\b(loafers|oxfords|dress shoes)\b/)) return 'dress-shoes';
  if (lower.match(/\b(shoes|footwear)\b/)) return 'shoes';
  
  // Accessories
  if (lower.match(/\b(hat|cap|beanie|fedora)\b/)) return 'hat';
  if (lower.match(/\b(bag|purse|handbag|tote|clutch|backpack)\b/)) return 'bag';
  if (lower.match(/\b(belt|sash)\b/)) return 'belt';
  if (lower.match(/\b(scarf|bandana)\b/)) return 'scarf';
  if (lower.match(/\b(sunglasses|glasses|eyewear)\b/)) return 'sunglasses';
  if (lower.match(/\b(jewelry|necklace|bracelet|earrings|ring)\b/)) return 'jewelry';
  if (lower.match(/\b(watch)\b/)) return 'watch';
  
  // Activewear
  if (lower.match(/\b(sports bra|athletic)\b/)) return 'activewear';
  if (lower.match(/\b(yoga pants|gym|workout)\b/)) return 'activewear';
  
  return 'shirt'; // default fallback
}

export default router;
