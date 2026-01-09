import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getOutfits } from '../lib/api/outfits';
import { getClosetItems } from '../lib/api/closet';
import { getWishlistItems } from '../lib/api/wishlist';
import VirtualFittingRoom from '../components/VirtualFittingRoom';

export default function VirtualFittingRoomPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [outfits, setOutfits] = useState([]);
  const [closetItems, setClosetItems] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('outfits'); // 'outfits', 'closet', 'wishlist', 'builder'
  const [selectedItems, setSelectedItems] = useState([]); // For building custom outfit
  const [showQuickTryOn, setShowQuickTryOn] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [user]);

  const loadAllData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [outfitsData, closetData, wishlistData] = await Promise.all([
        getOutfits().catch(() => []),
        getClosetItems().catch(() => []),
        getWishlistItems().catch(() => [])
      ]);
      setOutfits(outfitsData);
      setClosetItems(closetData);
      setWishlistItems(wishlistData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoading(false);
    }
  };

  // Toggle item selection for custom outfit building
  const toggleItemSelection = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i._id === item._id || i.id === item.id);
      if (exists) {
        return prev.filter(i => i._id !== item._id && i.id !== item.id);
      }
      return [...prev, item];
    });
  };

  // Create custom outfit from selected items
  const tryOnSelectedItems = () => {
    if (selectedItems.length === 0) return;
    
    const customOutfit = {
      _id: 'custom-' + Date.now(),
      name: 'Custom Try-On',
      items: selectedItems.map(item => ({
        ...item,
        image_url: item.image_url || item.imageUrl,
        type: item.type || item.category || 'top'
      }))
    };
    setSelectedOutfit(customOutfit);
  };

  // Quick try on single item
  const quickTryOnItem = (item) => {
    const singleItemOutfit = {
      _id: 'quick-' + Date.now(),
      name: 'Quick Try-On',
      items: [{
        ...item,
        image_url: item.image_url || item.imageUrl,
        type: item.type || item.category || 'top'
      }]
    };
    setSelectedOutfit(singleItemOutfit);
  };

  // Wait for auth to finish loading before checking user
  if (authLoading) {
    return (
      <div className="container" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h2>🔒 Login Required</h2>
        <p>Please log in to access the Virtual Fitting Room</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div className="loading">Loading your wardrobe...</div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '20px' }}>
      <div className="vfr-page-header" style={{
        textAlign: 'center',
        marginBottom: '24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '24px 20px',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
      }}>
        <h1 style={{ fontSize: '2.2em', margin: '0 0 8px 0' }}>🪞 Virtual Fitting Room</h1>
        <p style={{ fontSize: '1em', opacity: 0.9, margin: 0 }}>
          Try on clothes from your closet, wishlist, or saved outfits • See yourself in 360°
        </p>
        
        {/* Multi-angle photo status */}
        {userProfile && (
          <div style={{
            marginTop: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.2)',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px'
          }}>
            {(userProfile.body_photo_front && userProfile.body_photo_back && 
              userProfile.body_photo_left && userProfile.body_photo_right) ? (
              <>
                <span>✅ 360° Photos Ready</span>
              </>
            ) : userProfile.body_photo_url || userProfile.body_photo_front ? (
              <>
                <span>📸 Front view only</span>
                <a href="/settings" style={{ color: 'white', textDecoration: 'underline' }}>Add more angles</a>
              </>
            ) : (
              <>
                <span>📷 No body photo</span>
                <a href="/settings" style={{ color: 'white', textDecoration: 'underline' }}>Set up now</a>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tabs for different sources */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        overflowX: 'auto',
        paddingBottom: '8px'
      }}>
        <button
          onClick={() => setActiveTab('outfits')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '25px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s',
            background: activeTab === 'outfits' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f3f4f6',
            color: activeTab === 'outfits' ? 'white' : '#4b5563'
          }}
        >
          👗 Outfits ({outfits.length})
        </button>
        <button
          onClick={() => setActiveTab('closet')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '25px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s',
            background: activeTab === 'closet' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f3f4f6',
            color: activeTab === 'closet' ? 'white' : '#4b5563'
          }}
        >
          🏠 Closet ({closetItems.length})
        </button>
        <button
          onClick={() => setActiveTab('wishlist')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '25px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s',
            background: activeTab === 'wishlist' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f3f4f6',
            color: activeTab === 'wishlist' ? 'white' : '#4b5563'
          }}
        >
          💝 Wishlist ({wishlistItems.length})
        </button>
        <button
          onClick={() => setActiveTab('builder')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '25px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s',
            background: activeTab === 'builder' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f3f4f6',
            color: activeTab === 'builder' ? 'white' : '#4b5563'
          }}
        >
          ✨ Mix & Match
        </button>
      </div>

      {/* Selected Items Bar (for Mix & Match mode) */}
      {selectedItems.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          border: '2px solid #10b981'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontWeight: '600', color: '#065f46' }}>
              ✨ {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setSelectedItems([])}
                style={{
                  padding: '8px 16px',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Clear All
              </button>
              <button
                onClick={tryOnSelectedItems}
                style={{
                  padding: '8px 20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px'
                }}
              >
                🪞 Try On Selected
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {selectedItems.map((item, idx) => (
              <div key={idx} style={{
                width: '50px',
                height: '50px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '2px solid #10b981',
                position: 'relative'
              }}>
                <img 
                  src={item.image_url || item.imageUrl} 
                  alt={item.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  onClick={() => toggleItemSelection(item)}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '20px',
                    height: '20px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outfits Tab */}
      {activeTab === 'outfits' && (
        outfits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <span style={{ fontSize: '48px' }}>👗</span>
            <h3>No Outfits Yet</h3>
            <p>Create your first outfit to try it on!</p>
            <button 
              onClick={() => window.location.href = '/outfits/builder'}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                marginTop: '16px'
              }}
            >
              ➕ Create Outfit
            </button>
          </div>
        ) : (
          <div className="outfit-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '16px'
          }}>
            {outfits.map(outfit => (
              <div 
                key={outfit._id}
                className="outfit-card vfr-outfit-card"
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '2px solid transparent'
                }}
                onClick={() => setSelectedOutfit(outfit)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.2)';
                  e.currentTarget.style.borderColor = '#667eea';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <h4 style={{ margin: '0 0 12px 0', color: '#1a1a1a', fontSize: '15px' }}>{outfit.name}</h4>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {outfit.items.slice(0, 4).map((item, idx) => (
                    <div key={idx} style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      background: '#f5f5f5'
                    }}>
                      <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                  {outfit.items.length > 4 && (
                    <div style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '6px',
                      background: '#e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#6b7280'
                    }}>+{outfit.items.length - 4}</div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{outfit.items.length} items</span>
                  <span style={{ fontSize: '13px', color: '#667eea', fontWeight: '600' }}>🪞 Try On →</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Closet Tab */}
      {activeTab === 'closet' && (
        closetItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <span style={{ fontSize: '48px' }}>🏠</span>
            <h3>Your Closet is Empty</h3>
            <p>Add items to your closet to try them on!</p>
            <button 
              onClick={() => window.location.href = '/closet'}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                marginTop: '16px'
              }}
            >
              ➕ Add to Closet
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '12px'
          }}>
            {closetItems.map(item => {
              const isSelected = selectedItems.some(i => i._id === item._id);
              return (
                <div 
                  key={item._id}
                  style={{
                    background: 'white',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                    border: isSelected ? '3px solid #10b981' : '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '100%',
                    height: '160px',
                    background: '#f5f5f5',
                    position: 'relative'
                  }}>
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: '#10b981',
                        color: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px'
                      }}>✓</div>
                    )}
                  </div>
                  <div style={{ padding: '10px' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '500', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                    <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#6b7280', textTransform: 'capitalize' }}>{item.type || item.category}</p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => quickTryOnItem(item)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}
                      >🪞 Try</button>
                      <button
                        onClick={() => toggleItemSelection(item)}
                        style={{
                          padding: '6px 10px',
                          background: isSelected ? '#10b981' : '#f3f4f6',
                          color: isSelected ? 'white' : '#4b5563',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >{isSelected ? '✓' : '+'}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Wishlist Tab */}
      {activeTab === 'wishlist' && (
        wishlistItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <span style={{ fontSize: '48px' }}>💝</span>
            <h3>Your Wishlist is Empty</h3>
            <p>Add items you want to try before buying!</p>
            <button 
              onClick={() => window.location.href = '/wishlist'}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                marginTop: '16px'
              }}
            >
              ➕ Add to Wishlist
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '12px'
          }}>
            {wishlistItems.map(item => {
              const isSelected = selectedItems.some(i => i._id === item._id || i.id === item.id);
              return (
                <div 
                  key={item._id || item.id}
                  style={{
                    background: 'white',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                    border: isSelected ? '3px solid #10b981' : '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '100%',
                    height: '160px',
                    background: '#f5f5f5',
                    position: 'relative'
                  }}>
                    <img 
                      src={item.image_url || item.imageUrl} 
                      alt={item.name || item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: '#10b981',
                        color: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px'
                      }}>✓</div>
                    )}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: '#f43f5e',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: '600'
                    }}>WISHLIST</div>
                  </div>
                  <div style={{ padding: '10px' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '500', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name || item.title}</p>
                    {item.price && <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#059669', fontWeight: '600' }}>{item.price}</p>}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => quickTryOnItem(item)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}
                      >🪞 Try</button>
                      <button
                        onClick={() => toggleItemSelection(item)}
                        style={{
                          padding: '6px 10px',
                          background: isSelected ? '#10b981' : '#f3f4f6',
                          color: isSelected ? 'white' : '#4b5563',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >{isSelected ? '✓' : '+'}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Mix & Match Builder Tab */}
      {activeTab === 'builder' && (
        <div>
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid #d1fae5'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#065f46' }}>✨ Mix & Match Mode</h3>
            <p style={{ margin: 0, color: '#047857', fontSize: '14px' }}>
              Select items from your closet and wishlist below to create a custom outfit, then try it on!
            </p>
          </div>
          
          {/* Combined items from closet and wishlist */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '10px'
          }}>
            {[...closetItems, ...wishlistItems].map((item, idx) => {
              const isSelected = selectedItems.some(i => (i._id === item._id) || (i.id === item.id));
              const isWishlist = wishlistItems.some(w => w._id === item._id || w.id === item.id);
              return (
                <div 
                  key={item._id || item.id || idx}
                  onClick={() => toggleItemSelection(item)}
                  style={{
                    background: 'white',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                    border: isSelected ? '3px solid #10b981' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '100%',
                    height: '140px',
                    background: '#f5f5f5',
                    position: 'relative'
                  }}>
                    <img 
                      src={item.image_url || item.imageUrl} 
                      alt={item.name || item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        background: '#10b981',
                        color: 'white',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px'
                      }}>✓</div>
                    )}
                    {isWishlist && (
                      <div style={{
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        background: '#f43f5e',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        fontSize: '9px',
                        fontWeight: '600'
                      }}>💝</div>
                    )}
                  </div>
                  <div style={{ padding: '8px' }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: '500', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name || item.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {closetItems.length === 0 && wishlistItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#6b7280' }}>Add items to your closet or wishlist to start mixing and matching!</p>
            </div>
          )}
        </div>
      )}

      {selectedOutfit && (
        <VirtualFittingRoom 
          outfit={selectedOutfit}
          userProfile={userProfile}
          onClose={() => {
            setSelectedOutfit(null);
            setSelectedItems([]);
          }}
          onSave={() => {
            loadAllData();
          }}
        />
      )}
    </div>
  );
}
