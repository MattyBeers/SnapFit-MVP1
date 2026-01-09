import { useState, useEffect } from 'react';
import { getClosetItems, deleteClosetItem } from '../lib/api/closet';
import AddItemForm from './AddItemForm';
import VirtualFittingRoom from './VirtualFittingRoom';

// Convert hex color to closest color name
const hexToColorName = (hex) => {
  if (!hex || !hex.startsWith('#')) return hex;
  
  const colors = {
    '#000000': 'Black', '#ffffff': 'White', '#808080': 'Gray',
    '#ff0000': 'Red', '#00ff00': 'Green', '#0000ff': 'Blue',
    '#ffff00': 'Yellow', '#ff00ff': 'Magenta', '#00ffff': 'Cyan',
    '#ffa500': 'Orange', '#800080': 'Purple', '#ffc0cb': 'Pink',
    '#a52a2a': 'Brown', '#f5f5dc': 'Beige', '#f0e68c': 'Khaki',
    '#008080': 'Teal', '#000080': 'Navy', '#808000': 'Olive',
    '#c0c0c0': 'Silver', '#ffd700': 'Gold', '#4169e1': 'Royal Blue',
    '#8b4513': 'Saddle Brown', '#2e8b57': 'Sea Green', '#d2691e': 'Chocolate',
    '#ff6347': 'Tomato', '#40e0d0': 'Turquoise', '#ee82ee': 'Violet',
    '#f5deb3': 'Wheat', '#dda0dd': 'Plum', '#98fb98': 'Pale Green'
  };
  
  // Check for exact match
  const exactMatch = colors[hex.toLowerCase()];
  if (exactMatch) return exactMatch;
  
  // Convert hex to RGB
  const hexToRgb = (h) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };
  
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  // Find closest color by calculating distance
  let closestColor = 'Unknown';
  let minDistance = Infinity;
  
  for (const [colorHex, colorName] of Object.entries(colors)) {
    const colorRgb = hexToRgb(colorHex);
    if (!colorRgb) continue;
    
    const distance = Math.sqrt(
      Math.pow(rgb.r - colorRgb.r, 2) +
      Math.pow(rgb.g - colorRgb.g, 2) +
      Math.pow(rgb.b - colorRgb.b, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = colorName;
    }
  }
  
  return closestColor;
};

export default function ClosetScreen({ userId, userProfile }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState({ type: '', color: '', season: '' });
  const [selectedItem, setSelectedItem] = useState(null);
  const [showVFR, setShowVFR] = useState(false);
  const [expandedItem, setExpandedItem] = useState(null);
  const [previewBg, setPreviewBg] = useState('transparent');

  useEffect(() => {
    loadItems();
  }, [userId, filter]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const fetchedItems = await getClosetItems(userId, filter);
      setItems(fetchedItems || []);
    } catch (error) {
      console.error('Error loading closet items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleItemAdded = (newItem) => {
    setItems((prev) => [newItem, ...prev]);
    setShowAddForm(false);
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Delete this item from your closet?')) return;
    
    try {
      await deleteClosetItem(itemId, userId);
      setItems((prev) => prev.filter((item) => item._id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  return (
    <div className="closet-screen sf-fade-in">
      <div className="closet-header">
        <div>
          <h2 className="sf-title-lg">Your Closet</h2>
          <p className="sf-subtitle">{items.length} items in your wardrobe</p>
        </div>
        <button
          className="sf-btn sf-btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          <span className="add-icon">+</span> Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="closet-filters">
        <select
          value={filter.type}
          onChange={(e) => setFilter({ ...filter, type: e.target.value })}
          className="filter-select"
        >
          <option value="">All Types</option>
          <option value="shirt">Shirts</option>
          <option value="pants">Pants</option>
          <option value="dress">Dresses</option>
          <option value="shoes">Shoes</option>
          <option value="jacket">Jackets</option>
          <option value="accessories">Accessories</option>
        </select>

        <select
          value={filter.season}
          onChange={(e) => setFilter({ ...filter, season: e.target.value })}
          className="filter-select"
        >
          <option value="">All Seasons</option>
          <option value="spring">Spring</option>
          <option value="summer">Summer</option>
          <option value="fall">Fall</option>
          <option value="winter">Winter</option>
          <option value="all">All Seasons</option>
        </select>

        {filter.type || filter.season ? (
          <button
            className="filter-clear"
            onClick={() => setFilter({ type: '', color: '', season: '' })}
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="closet-loading">Loading your closet...</div>
      ) : items.length === 0 ? (
        <div className="closet-empty">
          <p>📸 Your closet is empty</p>
          <p className="closet-empty-hint">
            Tap "Add Item" to start photographing your wardrobe
          </p>
        </div>
      ) : (
        <div className="closet-grid">
          {items.map((item) => (
            <div key={item._id} className="closet-item">
              <div 
                className="closet-item-image"
                onClick={() => setExpandedItem(item)}
                style={{ cursor: 'pointer' }}
                title="Click to view larger"
              >
                {item.image_url ? (
                  <img src={item.image_url} alt={item.type} />
                ) : (
                  <div className="closet-item-placeholder">No Image</div>
                )}
              </div>
              <div className="closet-item-info">
                <span className="closet-item-type">{item.type}</span>
                {item.brand && <span className="closet-item-brand">{item.brand}</span>}
                {item.color && (
                  <span className="closet-item-color">
                    <span
                      className="color-dot"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    {hexToColorName(item.color)}
                  </span>
                )}
                <div className="closet-item-actions">
                  <button
                    className="closet-item-tryon"
                    onClick={() => {
                      setSelectedItem(item);
                      setShowVFR(true);
                    }}
                    title="Try on in Virtual Fitting Room"
                  >
                    👤 Try On
                  </button>
                  <button
                    className="closet-item-delete"
                    onClick={() => handleDelete(item._id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddForm && (
        <AddItemForm
          userId={userId}
          onItemAdded={handleItemAdded}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* Virtual Fitting Room Modal */}
      {showVFR && selectedItem && (
        <VirtualFittingRoom
          outfit={{
            items: [selectedItem],
            name: `Try ${selectedItem.type}`,
            occasion: 'casual'
          }}
          userProfile={userProfile || {}}
          onClose={() => {
            setShowVFR(false);
            setSelectedItem(null);
          }}
          onSave={() => {
            setShowVFR(false);
            setSelectedItem(null);
          }}
        />
      )}

      {/* Expanded Item View Modal */}
      {expandedItem && (
        <div className="item-preview-modal" onClick={() => setExpandedItem(null)}>
          <div className="item-preview-content" onClick={(e) => e.stopPropagation()}>
            <div className="item-preview-header">
              <h3>🔍 {expandedItem.type}</h3>
              <button 
                className="close-btn" 
                onClick={() => setExpandedItem(null)}
              >
                ×
              </button>
            </div>
            
            <div className="item-preview-controls">
              <label>Background:</label>
              <select 
                value={previewBg} 
                onChange={(e) => setPreviewBg(e.target.value)}
                className="bg-selector-mini"
              >
                <option value="transparent">✨ Transparent (Checkerboard)</option>
                <option value="white">⚪ White</option>
                <option value="black">⚫ Black</option>
                <option value="gray">🔘 Gray</option>
                <option value="studio">📸 Studio</option>
              </select>
            </div>

            <div 
              className="item-preview-image"
              style={{
                background: previewBg === 'transparent' 
                  ? 'repeating-conic-gradient(#e5e7eb 0% 25%, #f9fafb 0% 50%) 50% / 20px 20px'
                  : previewBg === 'white' ? '#ffffff'
                  : previewBg === 'black' ? '#000000'
                  : previewBg === 'gray' ? '#6b7280'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}
            >
              <img src={expandedItem.image_url} alt={expandedItem.type} />
            </div>

            <div className="item-preview-details">
              {expandedItem.brand && <p><strong>Brand:</strong> {expandedItem.brand}</p>}
              {expandedItem.color && (
                <p>
                  <strong>Color:</strong> 
                  <span
                    className="color-dot"
                    style={{ backgroundColor: expandedItem.color, marginLeft: '8px' }}
                  ></span>
                  {hexToColorName(expandedItem.color)}
                </p>
              )}
              {expandedItem.season && <p><strong>Season:</strong> {expandedItem.season}</p>}
              {expandedItem.tags && <p><strong>Tags:</strong> {expandedItem.tags}</p>}
            </div>

            <div className="item-preview-actions">
              <button
                className="sf-btn sf-btn-primary"
                onClick={() => {
                  setSelectedItem(expandedItem);
                  setShowVFR(true);
                  setExpandedItem(null);
                }}
              >
                👤 Try On
              </button>
              <button
                className="sf-btn sf-btn-outline"
                onClick={() => setExpandedItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
