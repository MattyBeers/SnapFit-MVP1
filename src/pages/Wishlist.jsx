/**
 * Wishlist Page - Save and try on items you want to buy
 * Users can add aspirational items, try them on with existing fits, and purchase via affiliate links
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AddItemForm from '../components/AddItemForm';
import VirtualFittingRoom from '../components/VirtualFittingRoom';
import { apiGet } from '../lib/api-client';
import { 
  getWishlistItems, 
  createWishlistItem, 
  updateWishlistItem, 
  deleteWishlistItem 
} from '../lib/api/wishlist';
import { getUserProfile } from '../lib/api/users';

export default function Wishlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [wishlistItems, setWishlistItems] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showTryOn, setShowTryOn] = useState(false);
  const [closetItems, setClosetItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [productUrl, setProductUrl] = useState('');
  const [scrapedProduct, setScrapedProduct] = useState(null);
  const [useAffiliate, setUseAffiliate] = useState(true);
  const affiliateTemplate = import.meta.env.VITE_AFFILIATE_TEMPLATE || '?aff={AFFILIATE_ID}';
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');
  const [useScrapingApiToggle, setUseScrapingApiToggle] = useState(true);
  const [useProxyToggle, setUseProxyToggle] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [showCheckerboard, setShowCheckerboard] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadWishlist();
    loadClosetItems();
    loadUserProfile();
  }, [user, navigate]);

  // Load user profile with body avatar and measurements for VFR
  const loadUserProfile = async () => {
    try {
      const profile = await getUserProfile();
      console.log('👤 Loaded user profile for VFR:', profile);
      console.log('📸 Body photo URL:', profile?.body_photo_url);
      setUserProfile(profile);
    } catch (error) {
      console.warn('⚠️ Could not load user profile:', error.message);
      // Try loading from localStorage as fallback
      const savedProfile = localStorage.getItem(`snapfit_profile_${user.id}`);
      if (savedProfile) {
        setUserProfile(JSON.parse(savedProfile));
      }
    }
  };

  const loadWishlist = async () => {
    setIsLoading(true);
    
    // Always load localStorage first for offline/cache access
    const saved = localStorage.getItem(`snapfit_wishlist_${user.id}`);
    const localItems = saved ? JSON.parse(saved) : [];
    
    try {
      // Try to load from backend API
      const dbItems = await getWishlistItems();
      console.log('✅ Loaded wishlist from database:', dbItems?.length || 0, 'items');
      console.log('📦 Local cache has:', localItems.length, 'items');
      
      if (dbItems && dbItems.length > 0) {
        // Use database as source of truth, but sync to localStorage for offline access
        setWishlistItems(dbItems);
        saveWishlistToLocalStorage(dbItems);
        console.log('💾 Synced database items to localStorage cache');
      } else if (localItems.length > 0) {
        // Database is empty but we have local items - migrate them
        console.log('🔄 Migrating', localItems.length, 'items from localStorage to database...');
        
        const migratedItems = [];
        for (const item of localItems) {
          try {
            const createdItem = await createWishlistItem({
              name: item.name || 'Unnamed Item',
              type: item.type,
              brand: item.brand,
              color: item.color,
              size: item.size,
              season: item.season,
              tags: item.tags,
              image_url: item.image_url,
              notes: item.notes,
              purchaseUrl: item.purchaseUrl,
              estimatedPrice: item.estimatedPrice,
              priority: item.priority || 'medium',
              purchased: item.purchased || false,
            });
            migratedItems.push(createdItem);
            console.log('✅ Migrated item:', item.name);
          } catch (migrationError) {
            console.warn('⚠️ Failed to migrate item:', item.name, migrationError.message);
            // Keep the local item if migration fails
            migratedItems.push(item);
          }
        }
        
        setWishlistItems(migratedItems);
        saveWishlistToLocalStorage(migratedItems);
        console.log('✅ Migration complete:', migratedItems.length, 'items');
      } else {
        setWishlistItems([]);
      }
    } catch (error) {
      console.warn('⚠️ Backend API not available, using localStorage:', error.message);
      // Offline mode - use localStorage
      setWishlistItems(localItems);
    } finally {
      setIsLoading(false);
    }
  };

  const loadClosetItems = async () => {
    try {
      const items = await apiGet('/closet');
      setClosetItems(items || []);
    } catch (error) {
      console.warn('Backend API not available, virtual try-on will be limited');
      setClosetItems([]);
    }
  };

  const saveWishlistToLocalStorage = (items) => {
    // Always keep localStorage synced for offline access and price tracking
    localStorage.setItem(`snapfit_wishlist_${user.id}`, JSON.stringify(items));
    console.log('💾 Saved', items.length, 'items to localStorage cache');
  };

  const handleAddItem = async (newItem) => {
    const price = parseFloat(newItem.estimatedPrice?.replace(/[$,]/g, '') || 0);
    const wishlistItem = {
      ...newItem,
      name: newItem.name || 'Unnamed Item',
      estimatedPrice: price,
      originalPrice: price,
      priority: newItem.priority || 'medium',
      notes: newItem.notes || '',
      purchaseUrl: newItem.purchaseUrl || '',
      isWishlist: true,
      purchased: false,
      priceHistory: [{ price, date: new Date().toISOString() }],
      lastChecked: new Date().toISOString(),
    };

    let updatedItems;
    
    try {
      // Save to backend API
      const createdItem = await createWishlistItem(wishlistItem);
      updatedItems = [createdItem, ...wishlistItems];
      console.log('✅ Wishlist item saved to database:', createdItem._id);
    } catch (error) {
      console.warn('⚠️ Backend API not available, saving to localStorage only:', error.message);
      // Fallback to localStorage only
      const localItem = {
        ...wishlistItem,
        id: Date.now().toString(),
        addedDate: new Date().toISOString(),
        customOrder: wishlistItems.length,
      };
      updatedItems = [localItem, ...wishlistItems];
    }
    
    // Always save to both state and localStorage
    setWishlistItems(updatedItems);
    saveWishlistToLocalStorage(updatedItems);
    setShowAddForm(false);
  };

  const handleUpdateItem = async (itemId, updates) => {
    try {
      // Try to update via API
      await updateWishlistItem(itemId, updates);
      console.log('✅ Wishlist item updated in database:', itemId);
    } catch (error) {
      console.warn('⚠️ Backend API not available, updating localStorage only:', error.message);
    }
    
    // Always update local state
    const updated = wishlistItems.map(item =>
      (item._id === itemId || item.id === itemId) ? { ...item, ...updates } : item
    );
    setWishlistItems(updated);
    saveWishlistToLocalStorage(updated);
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Remove this item from your wishlist?')) return;
    
    try {
      // Try to delete via API
      await deleteWishlistItem(itemId);
      console.log('✅ Wishlist item deleted from database:', itemId);
    } catch (error) {
      console.warn('⚠️ Backend API not available, deleting from localStorage only:', error.message);
    }
    
    // Always update local state
    const updated = wishlistItems.filter(item => item._id !== itemId && item.id !== itemId);
    setWishlistItems(updated);
    saveWishlistToLocalStorage(updated);
  };

  const handleMarkAsPurchased = async (itemId) => {
    const item = wishlistItems.find(i => i._id === itemId || i.id === itemId);
    if (confirm(`Mark "${item.name}" as purchased? This will move it to your closet.`)) {
      await handleUpdateItem(itemId, { purchased: true, purchaseDate: new Date().toISOString() });
      // Optionally, could add to actual closet here
    }
  };

  const checkPriceUpdates = async (item) => {
    // Simulate price checking (in production, would call scraper API)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/scraper/product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.purchaseUrl })
      });
      
      if (response.ok) {
        const data = await response.json();
        const newPrice = parseFloat(data.product?.price || item.estimatedPrice);
        const itemId = item._id || item.id;
        
        if (newPrice < item.estimatedPrice) {
          // Price dropped!
          const priceDrop = item.estimatedPrice - newPrice;
          const percentDrop = ((priceDrop / item.estimatedPrice) * 100).toFixed(0);
          
          addNotification({
            type: 'price_drop',
            itemId: itemId,
            itemName: item.name,
            oldPrice: item.estimatedPrice,
            newPrice,
            percentDrop,
            message: `💰 Price dropped ${percentDrop}% on ${item.name}!`,
            date: new Date().toISOString()
          });
          
          handleUpdateItem(itemId, {
            estimatedPrice: newPrice,
            priceHistory: [...(item.priceHistory || []), { price: newPrice, date: new Date().toISOString() }],
            lastChecked: new Date().toISOString()
          });
        } else {
          handleUpdateItem(itemId, { lastChecked: new Date().toISOString() });
        }
      }
    } catch (error) {
      console.log('Price check skipped (API not available)');
    }
  };

  const addNotification = (notification) => {
    const newNotifications = [{ ...notification, id: Date.now() }, ...notifications];
    setNotifications(newNotifications);
    localStorage.setItem(`snapfit_notifications_${user.id}`, JSON.stringify(newNotifications));
  };

  const generateCompleteTheLook = (baseItem) => {
    // AI-powered outfit suggestions based on wishlist item
    const suggestions = [];
    const itemType = baseItem.type?.toLowerCase();
    
    // Suggest complementary items from closet
    if (itemType?.includes('top') || itemType?.includes('shirt')) {
      const bottoms = closetItems.filter(i => i.type?.toLowerCase().includes('pant') || i.type?.toLowerCase().includes('short'));
      const shoes = closetItems.filter(i => i.type?.toLowerCase().includes('shoe'));
      suggestions.push(...bottoms.slice(0, 2), ...shoes.slice(0, 1));
    } else if (itemType?.includes('pant') || itemType?.includes('jean')) {
      const tops = closetItems.filter(i => i.type?.toLowerCase().includes('top') || i.type?.toLowerCase().includes('shirt'));
      suggestions.push(...tops.slice(0, 3));
    }
    
    return suggestions;
  };

  const handleScrapeProduct = async () => {
    if (!productUrl.trim()) {
      setScrapeError('Please enter a product URL');
      return;
    }

    setIsScraping(true);
    setScrapeError('');

    try {
      // When called from the Wishlist "Get Item" flow, request the server to
      // prefer the configured scraping API adapter (ScrapingBee/ScraperAPI).
      const response = await fetch(`${import.meta.env.VITE_API_URL}/scraper/product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: productUrl, useScrapingApi: useScrapingApiToggle, useProxy: useProxyToggle })
      });

      if (!response.ok) {
        // Try to extract detailed error from server response
        const errBody = await response.json().catch(() => null);
        const detail = errBody?.details || errBody?.error || (errBody ? JSON.stringify(errBody) : `${response.status} ${response.statusText}`);
        setScrapeError(`Scraper error: ${detail}`);
        setIsScraping(false);
        return;
      }

      const data = await response.json();
      
      // Extract product from response
      const product = data.product || data;
      
      console.log('🔍 Raw scraped data:', data);
      console.log('📦 Product object:', product);
      console.log('🖼️ Image URL:', product.image_url);
      console.log('👕 Product type:', product.type);
      
      // Set scraped product data (include image candidates)
      const images = product.images && product.images.length ? product.images : (product.image_url ? product.image_url ? product.images || [product.image_url] : [] : []);
      setScrapedProduct({
        name: product.name || 'Scraped Item',
        image_url: (images && images[0]) || product.image_url,
        images: images || (product.image_url ? [product.image_url] : []),
        brand: product.brand,
        notes: product.description,
        purchaseUrl: productUrl, // use the original URL entered by the user
        estimatedPrice: product.price ? `$${product.price}` : '',
        type: product.type || 'shirt', // Include type for VFR clothing placement
        color: product.color || '', // Include color if available
      });
      console.log('✅ Scraped product set to state:', {
        name: product.name,
        image_url: product.image_url,
        brand: product.brand,
        price: product.price,
        type: product.type
      });
      
      // Leave preview open so user can review/select images before adding

    } catch (error) {
      console.error('Scraping error:', error);
      // surface the underlying message where possible
      setScrapeError(error?.message || 'Could not scrape product. Please add manually or try a different URL.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleAddScrapedItem = () => {
    if (scrapedProduct) {
      // Apply affiliate wrapping if enabled
      const toAdd = { ...scrapedProduct };
      toAdd.purchaseUrl = useAffiliate ? wrapAffiliateUrl(scrapedProduct.purchaseUrl, affiliateTemplate) : scrapedProduct.purchaseUrl;
      handleAddItem(toAdd);
      setScrapedProduct(null);
      setProductUrl('');
    }
  };

  function wrapAffiliateUrl(url, template) {
    try {
      if (!url) return url;
      // If template contains {AFFILIATE_ID}, replace with env var or default
      const affiliateId = import.meta.env.VITE_AFFILIATE_ID || 'AFF123';
      const wrapped = template.replace('{AFFILIATE_ID}', affiliateId).replace('{URL}', encodeURIComponent(url));
      // If template contains {URL} we assume a redirect-affiliate pattern e.g. https://track.example.com/redirect?u={URL}&aff={AFFILIATE_ID}
      if (wrapped.includes('{URL}')) return wrapped.replace('{URL}', encodeURIComponent(url));

      // If template starts with a '?' we append to the original URL
      if (wrapped.startsWith('?') || wrapped.startsWith('&')) {
        return url + wrapped;
      }

      // Otherwise, if template looks like a prefix redirect (contains {AFFILIATE_ID} replaced), return as-is
      if (wrapped.includes('http')) return wrapped.replace('{ORIG}', encodeURIComponent(url));

      return url;
    } catch (e) {
      return url;
    }
  }

  const handleTryOn = (item) => {
    // Check if user has a body avatar set up
    if (!userProfile?.body_photo_url) {
      const setupNow = confirm(
        '📸 No body photo found!\n\n' +
        'For the best virtual try-on experience, upload your body photo in Settings.\n\n' +
        'You can still try on items with a default silhouette.\n\n' +
        'Would you like to set up your body avatar now?'
      );
      
      if (setupNow) {
        navigate('/settings');
        return;
      }
    }
    
    setSelectedItem(item);
    setShowTryOn(true);
  };

  const createOutfitWithItem = (wishlistItem) => {
    // Create a temporary outfit combining wishlist item with closet items
    const outfit = {
      id: `temp_${Date.now()}`,
      name: `Try On: ${wishlistItem.name}`,
      items: [wishlistItem],
      isTemporary: true,
    };
    return outfit;
  };

  // Filter and sort items
  const getFilteredItems = () => {
    let filtered = wishlistItems;

    // Filter by type
    if (filter !== 'all') {
      filtered = filtered.filter(item => item.type === filter);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.addedDate) - new Date(a.addedDate);
        case 'price-low':
          return parseFloat(a.estimatedPrice || 0) - parseFloat(b.estimatedPrice || 0);
        case 'price-high':
          return parseFloat(b.estimatedPrice || 0) - parseFloat(a.estimatedPrice || 0);
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredItems = getFilteredItems();
  const totalEstimatedCost = wishlistItems
    .filter(item => !item.purchased)
    .reduce((sum, item) => sum + parseFloat(item.estimatedPrice || 0), 0);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div className="wishlist-page">
      {/* Header */}
      <div className="wishlist-header">
        <div className="wishlist-header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <h1>✨ My Wishlist</h1>
            {notifications.length > 0 && (
              <button
                className="notification-badge-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                title={`${notifications.length} new notifications`}
              >
                🔔 <span className="badge-count">{notifications.length}</span>
              </button>
            )}
          </div>
          <p className="wishlist-subtitle">
            Save items you want to buy and try them on with your existing wardrobe
          </p>
          
          {/* Stats */}
          <div className="wishlist-stats">
            <div className="stat-card">
              <span className="stat-value">{wishlistItems.filter(i => !i.purchased).length}</span>
              <span className="stat-label">Items</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">${totalEstimatedCost.toFixed(2)}</span>
              <span className="stat-label">Total Value</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{wishlistItems.filter(i => i.purchased).length}</span>
              <span className="stat-label">Purchased</span>
            </div>
          </div>
        </div>

        {/* Notifications Panel */}
        {showNotifications && notifications.length > 0 && (
          <div className="notifications-panel">
            <div className="notifications-header">
              <h3>🔔 Notifications</h3>
              <button onClick={() => setShowNotifications(false)} className="close-btn">×</button>
            </div>
            <div className="notifications-list">
              {notifications.map(notif => (
                <div key={notif.id} className={`notification-item ${notif.type}`}>
                  <div className="notification-content">
                    <p>{notif.message}</p>
                    {notif.type === 'price_drop' && (
                      <div className="price-drop-details">
                        <span className="old-price">${notif.oldPrice.toFixed(2)}</span>
                        <span className="arrow">→</span>
                        <span className="new-price">${notif.newPrice.toFixed(2)}</span>
                        <span className="savings">Save ${(notif.oldPrice - notif.newPrice).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <span className="notification-time">
                    {new Date(notif.date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Complete the Look Suggestions */}
        {suggestions.length > 0 && selectedItem && (
          <div className="complete-look-panel">
            <div className="complete-look-header">
              <h3>✨ Complete the Look with "{selectedItem.name}"</h3>
              <button onClick={() => {setSuggestions([]); setSelectedItem(null);}} className="close-btn">×</button>
            </div>
            <div className="suggestions-grid">
              {suggestions.map((suggestion, idx) => (
                <div key={idx} className="suggestion-card">
                  <img src={suggestion.image_url} alt={suggestion.type} />
                  <div className="suggestion-info">
                    <p className="suggestion-type">{suggestion.type}</p>
                    <button
                      className="sf-btn sf-btn-sm sf-btn-primary"
                      onClick={() => {
                        const outfit = createOutfitWithItem(selectedItem);
                        outfit.items.push(suggestion);
                        handleTryOn(outfit);
                        setSuggestions([]);
                      }}
                    >
                      Try Together
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* URL Scraper - Quick Add from Website */}
        <div className="url-scraper-section" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
        }}>
          <h3 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '18px' }}>
            🛍️ Add from Website
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.9)', margin: '0 0 15px 0', fontSize: '14px' }}>
            Paste a product URL from any clothing website and we'll automatically extract the details!
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="url"
              placeholder="https://example.com/product..."
              value={productUrl}
              onChange={(e) => { setProductUrl(e.target.value); setScrapeError(''); }}
              onKeyPress={(e) => e.key === 'Enter' && handleScrapeProduct()}
              style={{ flex: '1', minWidth: '250px', padding: '12px 16px', borderRadius: '8px', border: 'none', fontSize: '14px', outline: 'none' }}
              disabled={isScraping}
            />
            <button onClick={handleScrapeProduct} disabled={isScraping || !productUrl.trim()} style={{ padding: '12px 24px', background: 'white', color: '#667eea', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600' }}>
              {isScraping ? '⏳ Fetching...' : '🔍 Get Item'}
            </button>
          </div>

          <div style={{ marginTop: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={useScrapingApiToggle} onChange={(e) => setUseScrapingApiToggle(e.target.checked)} />
              Use Scraping API (ScrapingBee)
            </label>
            <label style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={useProxyToggle} onChange={(e) => setUseProxyToggle(e.target.checked)} />
              Force Proxy Fallback
            </label>
          </div>

          {scrapeError && (
            <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '6px', color: 'white', fontSize: '13px' }}>
              ⚠️ {scrapeError}
            </div>
          )}

          {scrapedProduct && (
            <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
              {/* Image Selection Section */}
              <div style={{ marginBottom: '15px' }}>
                {/* Background Toggle */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
                  <button
                    onClick={() => setShowCheckerboard(false)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: !showCheckerboard ? '#10b981' : 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    ⬜ White
                  </button>
                  <button
                    onClick={() => setShowCheckerboard(true)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: showCheckerboard ? '#10b981' : 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    🏁 Transparent Check
                  </button>
                </div>
                
                {/* Main Selected Image */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                  {scrapedProduct.image_url ? (
                    <div style={{
                      width: '180px',
                      height: '180px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      background: showCheckerboard 
                        ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 20px 20px'
                        : 'white'
                    }}>
                      <img 
                        src={scrapedProduct.image_url} 
                        alt={scrapedProduct.name} 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'contain'
                        }} 
                        onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23ddd" width="100" height="100"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="40">👕</text></svg>'; }} 
                      />
                    </div>
                  ) : (
                    <div style={{ width: '180px', height: '180px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>👕</div>
                  )}
                </div>
                
                {showCheckerboard && (
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', textAlign: 'center', margin: '0 0 8px 0' }}>
                    💡 Checkerboard shows transparent areas - these work best for virtual try-on!
                  </p>
                )}
                
                {/* Image Selection Thumbnails */}
                {scrapedProduct.images && scrapedProduct.images.length > 1 && (
                  <div style={{ marginBottom: '10px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', marginBottom: '8px', textAlign: 'center' }}>
                      📷 Select the image you want to save ({scrapedProduct.images.length} available)
                    </p>
                    <div style={{ 
                      display: 'flex', 
                      gap: '10px', 
                      justifyContent: 'center', 
                      flexWrap: 'wrap',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      padding: '8px',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '8px'
                    }}>
                      {scrapedProduct.images.map((img, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setScrapedProduct({ ...scrapedProduct, image_url: img })}
                          style={{ 
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                          }}
                          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <div style={{
                            width: '70px',
                            height: '70px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: scrapedProduct.image_url === img ? '3px solid #10b981' : '3px solid transparent',
                            boxShadow: scrapedProduct.image_url === img ? '0 0 12px rgba(16, 185, 129, 0.5)' : 'none',
                            background: showCheckerboard 
                              ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 12px 12px'
                              : 'white'
                          }}>
                            <img 
                              src={img} 
                              alt={`Option ${idx + 1}`} 
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover'
                              }} 
                              onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                            />
                          </div>
                          {scrapedProduct.image_url === img && (
                            <div style={{
                              position: 'absolute',
                              top: '-6px',
                              right: '-6px',
                              background: '#10b981',
                              color: 'white',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>✓</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Product Info Section */}
              <div style={{ color: 'white', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{scrapedProduct.name}</h4>
                {scrapedProduct.brand && (<p style={{ margin: '0 0 5px 0', fontSize: '14px', opacity: 0.9 }}>👔 {scrapedProduct.brand}</p>)}
                {scrapedProduct.estimatedPrice && (<p style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>{scrapedProduct.estimatedPrice}</p>)}
                
                <div style={{ marginTop: '12px', textAlign: 'left' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <input type="checkbox" checked={useAffiliate} onChange={(e) => setUseAffiliate(e.target.checked)} />
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px' }}>Use affiliate link</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px', justifyContent: 'center' }}>
                <button 
                  onClick={() => { setScrapedProduct(null); setProductUrl(''); }}
                  style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                >
                  ✕ Cancel
                </button>
                <button 
                  onClick={handleAddScrapedItem} 
                  style={{ padding: '10px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                >
                  ✓ Add to Wishlist
                </button>
              </div>
            </div>
          )}

          <div style={{ marginTop: '12px' }}>
            <button className="sf-btn sf-btn-primary" onClick={() => { setScrapedProduct(null); setShowAddForm(true); }}>➕ Add Manually</button>
          </div>
        </div>
      </div>

      <div className="wishlist-controls">
        <div className="wishlist-search">
          <input
            type="text"
            placeholder="🔍 Search wishlist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="wishlist-filters">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="shirt">Shirts</option>
            <option value="pants">Pants</option>
            <option value="jacket">Jackets</option>
            <option value="dress">Dresses</option>
            <option value="shoes">Shoes</option>
            <option value="accessory">Accessories</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="recent">Recently Added</option>
            <option value="priority">Priority</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Wishlist Grid */}
      {isLoading ? (
        <div className="empty-wishlist">
          <div className="empty-icon">⏳</div>
          <h3>Loading your wishlist...</h3>
          <p>Please wait while we fetch your saved items.</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-wishlist">
          <div className="empty-icon">✨</div>
          <h3>Your wishlist is empty</h3>
          <p>Start adding items you want to buy and try them on virtually!</p>
          <button
            className="sf-btn sf-btn-primary"
            onClick={() => setShowAddForm(true)}
          >
            Add Your First Item
          </button>
        </div>
      ) : (
        <div className="wishlist-grid">
          {filteredItems.map((item, index) => {
            const priceDrop = item.originalPrice && item.estimatedPrice < item.originalPrice 
              ? ((item.originalPrice - item.estimatedPrice) / item.originalPrice * 100).toFixed(0)
              : null;
            const itemId = item._id || item.id;
            
            return (
              <div
                key={itemId}
                className={`wishlist-card priority-${item.priority} ${item.purchased ? 'purchased' : ''}`}
                draggable
                onDragStart={() => setDraggedItem(item)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  const draggedItemId = draggedItem?._id || draggedItem?.id;
                  if (draggedItem && draggedItemId !== itemId) {
                    const newItems = [...wishlistItems];
                    const draggedIndex = newItems.findIndex(i => (i._id || i.id) === draggedItemId);
                    const targetIndex = newItems.findIndex(i => (i._id || i.id) === itemId);
                    const [removed] = newItems.splice(draggedIndex, 1);
                    newItems.splice(targetIndex, 0, removed);
                    setWishlistItems(newItems);
                    saveWishlistToLocalStorage(newItems);
                  }
                  setDraggedItem(null);
                }}
              >
                {/* Priority Badge */}
                <div className="priority-badge">
                  {item.priority === 'high' && '🔥'}
                  {item.priority === 'medium' && '⭐'}
                  {item.priority === 'low' && '💭'}
                  <span>{item.priority}</span>
                </div>

                {/* Price Drop Alert */}
                {priceDrop && (
                  <div className="price-drop-badge">
                    💰 {priceDrop}% OFF
                  </div>
                )}

                {/* Item Image */}
                <div className="wishlist-item-image">
                  <img src={item.image_url} alt={item.name} />
                  {item.purchased && (
                    <div className="purchased-overlay">
                      <span>✓ Purchased</span>
                    </div>
                  )}
                  
                  {/* Quick Actions Overlay */}
                  <div className="wishlist-quick-actions">
                    <button
                      onClick={() => handleTryOn(item)}
                      title="Try on virtually"
                      className="quick-action-btn"
                    >
                      👤
                    </button>
                    {item.purchaseUrl && (
                      <button
                        onClick={() => checkPriceUpdates(item)}
                        title="Check for price updates"
                        className="quick-action-btn"
                      >
                        💰
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const completeLook = generateCompleteTheLook(item);
                        setSuggestions(completeLook);
                        setSelectedItem(item);
                      }}
                      title="Complete the look"
                      className="quick-action-btn"
                    >
                      ✨
                    </button>
                  </div>
                </div>

                {/* Item Info */}
                <div className="wishlist-item-info">
                  <h3>{item.name || 'Unnamed Item'}</h3>
                  {item.brand && <p className="item-brand">👔 {item.brand}</p>}
                  
                  <div className="item-meta">
                    <span className="item-type">{item.type}</span>
                    {item.estimatedPrice > 0 && (
                      <div className="item-price-container">
                        {item.originalPrice && item.estimatedPrice < item.originalPrice && (
                          <span className="item-price-old">${item.originalPrice.toFixed(2)}</span>
                        )}
                        <span className={`item-price ${priceDrop ? 'price-dropped' : ''}`}>
                          ${item.estimatedPrice.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {item.notes && (
                    <p className="item-notes">💭 {item.notes}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="wishlist-item-actions">
                  {item.purchaseUrl && (
                    <a
                      href={item.purchaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sf-btn sf-btn-sm sf-btn-primary"
                      style={{ flex: 1 }}
                    >
                      🛒 Buy Now
                    </a>
                  )}

                  {!item.purchased && (
                    <button
                      className="sf-btn sf-btn-sm sf-btn-success"
                      onClick={() => handleMarkAsPurchased(itemId)}
                      title="Mark as purchased"
                      style={{ flex: 1 }}
                    >
                      ✓ Got It
                    </button>
                  )}

                  <button
                    className="sf-btn sf-btn-sm sf-btn-ghost"
                    onClick={() => setEditingItem(item)}
                  >
                    ✏️
                  </button>
                  <button
                    className="sf-btn sf-btn-sm sf-btn-ghost"
                    onClick={() => handleDeleteItem(itemId)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content wishlist-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Add to Wishlist</h2>
              <button className="modal-close" onClick={() => setShowAddForm(false)}>×</button>
            </div>
            
            <AddItemForm
              userId={user?.id}
              onSubmit={scrapedProduct ? handleAddScrapedItem : handleAddItem}
              onCancel={() => {
                setShowAddForm(false);
                setScrapedProduct(null);
              }}
              isWishlist={true}
              initialData={scrapedProduct}
            />
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal-content wishlist-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Edit Wishlist Item</h2>
              <button className="modal-close" onClick={() => setEditingItem(null)}>×</button>
            </div>
            
            <div className="edit-form">
              <div className="form-field">
                <label>Priority</label>
                <select
                  value={editingItem.priority}
                  onChange={(e) => setEditingItem({ ...editingItem, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="form-field">
                <label>Estimated Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingItem.estimatedPrice}
                  onChange={(e) => setEditingItem({ ...editingItem, estimatedPrice: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="form-field">
                <label>Purchase URL</label>
                <input
                  type="url"
                  value={editingItem.purchaseUrl}
                  onChange={(e) => setEditingItem({ ...editingItem, purchaseUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="form-field">
                <label>Notes</label>
                <textarea
                  value={editingItem.notes}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  placeholder="Why do you want this item?"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button
                  className="sf-btn sf-btn-primary"
                  onClick={() => {
                    handleUpdateItem(editingItem._id || editingItem.id, editingItem);
                    setEditingItem(null);
                  }}
                >
                  💾 Save Changes
                </button>
                <button
                  className="sf-btn sf-btn-outline"
                  onClick={() => setEditingItem(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Try On Modal - Virtual Fitting Room */}
      {showTryOn && selectedItem && (
        <VirtualFittingRoom
          outfit={createOutfitWithItem(selectedItem)}
          userProfile={userProfile}
          onClose={() => {
            setShowTryOn(false);
            setSelectedItem(null);
          }}
          onSave={(outfit) => {
            // Optionally save the outfit combination
            setShowTryOn(false);
            setSelectedItem(null);
          }}
        />
      )}

      <style>{`
        .wishlist-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }

        /* Notification Badge */
        .notification-badge-btn {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border: none;
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
        }

        .notification-badge-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        .badge-count {
          background: white;
          color: #ef4444;
          border-radius: 10px;
          padding: 2px 8px;
          font-size: 12px;
          font-weight: 700;
        }

        /* Notifications Panel */
        .notifications-panel {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          margin-bottom: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .notifications-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .notifications-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .notifications-header .close-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          font-size: 24px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
        }

        .notifications-header .close-btn:hover {
          background: rgba(255,255,255,0.3);
        }

        .notifications-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .notification-item {
          padding: 16px 20px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          transition: background 0.2s;
        }

        .notification-item:hover {
          background: #f9fafb;
        }

        .notification-item.price_drop {
          background: linear-gradient(90deg, rgba(16, 185, 129, 0.05) 0%, rgba(255, 255, 255, 0) 100%);
        }

        .notification-content {
          flex: 1;
        }

        .notification-content p {
          margin: 0 0 8px 0;
          font-weight: 500;
        }

        .price-drop-details {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .old-price {
          text-decoration: line-through;
          color: #9ca3af;
        }

        .arrow {
          color: #10b981;
        }

        .new-price {
          color: #10b981;
          font-weight: 700;
        }

        .savings {
          background: #10b981;
          color: white;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .notification-time {
          font-size: 12px;
          color: #9ca3af;
          white-space: nowrap;
        }

        /* Complete the Look Panel */
        .complete-look-panel {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 2px solid #fbbf24;
          border-radius: 12px;
          margin-bottom: 24px;
          padding: 0;
          overflow: hidden;
        }

        .complete-look-header {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .complete-look-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .complete-look-header .close-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          font-size: 24px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
        }

        .suggestions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 16px;
          padding: 20px;
        }

        .suggestion-card {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: all 0.2s;
        }

        .suggestion-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .suggestion-card img {
          width: 100%;
          height: 150px;
          object-fit: cover;
        }

        .suggestion-info {
          padding: 12px;
        }

        .suggestion-type {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 8px 0;
          text-transform: capitalize;
        }

        .wishlist-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          gap: 24px;
        }

        .wishlist-header-content {
          flex: 1;
        }

        .wishlist-header h1 {
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .wishlist-subtitle {
          color: var(--sf-muted);
          font-size: 16px;
          margin: 0 0 20px 0;
        }

        .wishlist-stats {
          display: flex;
          gap: 16px;
        }

        .stat-card {
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 120px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--sf-primary);
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 13px;
          color: var(--sf-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .wishlist-controls {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .wishlist-search {
          flex: 1;
          min-width: 250px;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--sf-primary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .wishlist-filters {
          display: flex;
          gap: 12px;
        }

        .filter-select {
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-select:hover {
          border-color: var(--sf-primary);
        }

        .empty-wishlist {
          text-align: center;
          padding: 80px 24px;
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          border: 2px dashed #e5e7eb;
          border-radius: 16px;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .empty-wishlist h3 {
          font-size: 24px;
          margin: 0 0 8px 0;
          color: var(--sf-text);
        }

        .empty-wishlist p {
          color: var(--sf-muted);
          margin: 0 0 24px 0;
        }

        .wishlist-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }

        .wishlist-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s ease;
          position: relative;
          cursor: grab;
        }

        .wishlist-card:active {
          cursor: grabbing;
        }

        .wishlist-card.priority-high {
          border-color: #ef4444;
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1);
        }

        .wishlist-card.priority-medium {
          border-color: #f59e0b;
        }

        .wishlist-card.priority-low {
          border-color: #10b981;
        }

        .wishlist-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .wishlist-card.purchased {
          opacity: 0.7;
        }

        .priority-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          padding: 6px 12px;
          border-radius: 20px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
          z-index: 10;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          display: flex;
          align-items: center;
          gap: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .wishlist-card.priority-high .priority-badge {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }

        .wishlist-card.priority-medium .priority-badge {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .wishlist-card.priority-low .priority-badge {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .price-drop-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
          animation: pulseDrop 2s infinite;
        }

        @keyframes pulseDrop {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .wishlist-item-image {
          width: 100%;
          height: 280px;
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        .wishlist-item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .wishlist-quick-actions {
          position: absolute;
          bottom: 12px;
          right: 12px;
          display: flex;
          gap: 8px;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.3s ease;
        }

        .wishlist-card:hover .wishlist-quick-actions {
          opacity: 1;
          transform: translateY(0);
        }

        .quick-action-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.95);
          color: #667eea;
          font-size: 18px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .quick-action-btn:hover {
          background: #667eea;
          color: white;
          transform: scale(1.1);
        }

        .purchased-overlay {
          position: absolute;
          inset: 0;
          background: rgba(16, 185, 129, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          font-weight: 600;
        }

        .wishlist-item-info {
          padding: 16px;
        }

        .wishlist-item-info h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: var(--sf-text);
        }

        .item-brand {
          font-size: 13px;
          color: var(--sf-muted);
          margin: 0 0 8px 0;
          font-weight: 500;
        }

        .item-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .item-type {
          font-size: 12px;
          color: var(--sf-muted);
          text-transform: capitalize;
        }

        .item-price-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .item-price-old {
          font-size: 14px;
          color: #9ca3af;
          text-decoration: line-through;
        }

        .item-price {
          font-size: 16px;
          font-weight: 700;
          color: var(--sf-primary);
        }

        .item-price.price-dropped {
          color: #10b981;
          animation: priceGlow 2s infinite;
        }

        @keyframes priceGlow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .item-notes {
          font-size: 13px;
          color: var(--sf-muted);
          margin: 8px 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .item-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .tag {
          font-size: 11px;
          padding: 4px 8px;
          background: #f3f4f6;
          color: var(--sf-muted);
          border-radius: 4px;
        }

        .wishlist-item-actions {
          padding: 12px 16px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .wishlist-item-actions .sf-btn {
          flex: 1;
          min-width: 80px;
        }

        .item-menu {
          display: flex;
          gap: 4px;
        }

        .wishlist-modal,
        .wishlist-edit-modal {
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .edit-form {
          padding: 24px;
        }

        .form-field {
          margin-bottom: 20px;
        }

        .form-field label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--sf-text);
        }

        .form-field input,
        .form-field select,
        .form-field textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.2s ease;
        }

        .form-field input:focus,
        .form-field select:focus,
        .form-field textarea:focus {
          outline: none;
          border-color: var(--sf-primary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .form-actions {
          display: flex;
          gap: 12px;
          padding-top: 16px;
        }

        @media (max-width: 768px) {
          .wishlist-header {
            flex-direction: column;
          }

          .wishlist-stats {
            width: 100%;
          }

          .stat-card {
            flex: 1;
          }

          .wishlist-controls {
            flex-direction: column;
          }

          .wishlist-filters {
            width: 100%;
          }

          .filter-select {
            flex: 1;
          }

          .wishlist-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
