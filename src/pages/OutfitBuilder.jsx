/**
 * Outfit Builder
 * Multi-select interface for creating outfit combinations
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getClosetItems } from '../lib/api/closet';
import { createOutfit, getOutfitById, updateOutfit } from '../lib/api/outfits';
import { useAuth } from '../context/AuthContext';

export default function OutfitBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editOutfitId = searchParams.get('edit');
  
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [outfitForm, setOutfitForm] = useState({
    name: '',
    occasion: '',
    weather: '',
    notes: '',
    is_public: false,
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadItems();
    if (editOutfitId) {
      loadExistingOutfit(editOutfitId);
    }
  }, [user, editOutfitId]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const fetchedItems = await getClosetItems(user.id);
      setItems(fetchedItems);
    } catch (error) {
      console.error('Error loading closet items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingOutfit = async (outfitId) => {
    try {
      const outfit = await getOutfitById(outfitId, user.id);
      setIsEditMode(true);
      setOutfitForm({
        name: outfit.name || '',
        occasion: outfit.occasion || '',
        weather: outfit.weather || '',
        notes: outfit.notes || '',
        is_public: outfit.is_public || false,
      });
      // Pre-select items from the outfit
      const itemIds = outfit.items.map(item => item._id.toString());
      setSelectedItems(itemIds);
    } catch (error) {
      console.error('Error loading outfit:', error);
      alert('Failed to load outfit for editing');
    }
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const getFilteredItems = () => {
    if (filter === 'all') return items;
    return items.filter((item) => item.type === filter);
  };

  const getSelectedItemsData = () => {
    return items.filter((item) => selectedItems.includes(item._id.toString()));
  };

  const handleSaveOutfit = async (e) => {
    e.preventDefault();

    if (selectedItems.length < 2) {
      alert('An outfit must have at least 2 items (e.g., shirt + pants)');
      return;
    }

    if (!outfitForm.name.trim()) {
      alert('Please enter an outfit name');
      return;
    }

    setSaving(true);

    try {
      if (isEditMode && editOutfitId) {
        // Update existing outfit
        await updateOutfit(
          editOutfitId,
          {
            name: outfitForm.name,
            occasion: outfitForm.occasion,
            weather: outfitForm.weather,
            notes: outfitForm.notes,
            is_public: outfitForm.is_public,
            items: selectedItems,
          },
          user.id
        );
        alert('Outfit updated!');
      } else {
        // Create new outfit
        await createOutfit(
          {
            name: outfitForm.name,
            occasion: outfitForm.occasion,
            weather: outfitForm.weather,
            notes: outfitForm.notes,
            is_public: outfitForm.is_public,
            items: selectedItems,
          },
          user.id
        );
        alert('Outfit saved!');
      }
      navigate('/outfits');
    } catch (error) {
      console.error('Error saving outfit:', error);
      alert('Failed to save outfit');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setSelectedItems([]);
    setOutfitForm({
      name: '',
      occasion: '',
      weather: '',
      notes: '',
      is_public: false,
    });
  };

  if (!user) return null;

  return (
    <div className="closet-screen outfit-builder-page sf-fade-in">
      {/* Header - Closet Style */}
      <div className="closet-header">
        <div>
          <h2 className="sf-title-lg">{isEditMode ? 'Edit Outfit' : 'Create Outfit'}</h2>
          <p className="sf-subtitle">
            {selectedItems.length} items selected {selectedItems.length < 2 && <span style={{ color: '#f59e0b' }}>(min. 2 required)</span>}
          </p>
        </div>
        <div className="closet-actions">
          <button
            className="sf-btn sf-btn-outline"
            onClick={() => navigate('/outfits')}
          >
            ← Back
          </button>
          <button
            className="sf-btn sf-btn-primary"
            onClick={handleSaveOutfit}
            disabled={saving || selectedItems.length < 2 || !outfitForm.name.trim()}
          >
            {saving ? 'Saving...' : isEditMode ? 'Update Outfit' : 'Save Outfit'}
          </button>
        </div>
      </div>

      {/* Outfit Details Form - Compact */}
      <div className="outfit-details-bar">
        <div className="outfit-detail-field">
          <input
            type="text"
            value={outfitForm.name}
            onChange={(e) => setOutfitForm({ ...outfitForm, name: e.target.value })}
            placeholder="Outfit name *"
            className="outfit-name-input"
            required
          />
        </div>
        <select
          value={outfitForm.occasion}
          onChange={(e) => setOutfitForm({ ...outfitForm, occasion: e.target.value })}
          className="filter-select"
        >
          <option value="">Occasion</option>
          <option value="casual">Casual</option>
          <option value="work">Work</option>
          <option value="formal">Formal</option>
          <option value="party">Party</option>
          <option value="date">Date</option>
          <option value="workout">Workout</option>
          <option value="travel">Travel</option>
        </select>
        <select
          value={outfitForm.weather}
          onChange={(e) => setOutfitForm({ ...outfitForm, weather: e.target.value })}
          className="filter-select"
        >
          <option value="">Weather</option>
          <option value="sunny">☀️ Sunny</option>
          <option value="cloudy">☁️ Cloudy</option>
          <option value="rainy">🌧️ Rainy</option>
          <option value="cold">❄️ Cold</option>
          <option value="hot">🔥 Hot</option>
        </select>
        <label className="public-toggle">
          <input
            type="checkbox"
            checked={outfitForm.is_public}
            onChange={(e) => setOutfitForm({ ...outfitForm, is_public: e.target.checked })}
          />
          <span>Public</span>
        </label>
      </div>

      {/* Category Filters - Closet Style */}
      <div className="closet-filters">
        <button
          className={`closet-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`closet-filter-btn ${filter === 'shirt' ? 'active' : ''}`}
          onClick={() => setFilter('shirt')}
        >
          Shirts
        </button>
        <button
          className={`closet-filter-btn ${filter === 'pants' ? 'active' : ''}`}
          onClick={() => setFilter('pants')}
        >
          Pants
        </button>
        <button
          className={`closet-filter-btn ${filter === 'dress' ? 'active' : ''}`}
          onClick={() => setFilter('dress')}
        >
          Dresses
        </button>
        <button
          className={`closet-filter-btn ${filter === 'shoes' ? 'active' : ''}`}
          onClick={() => setFilter('shoes')}
        >
          Shoes
        </button>
        <button
          className={`closet-filter-btn ${filter === 'jacket' ? 'active' : ''}`}
          onClick={() => setFilter('jacket')}
        >
          Jackets
        </button>
        <button
          className={`closet-filter-btn ${filter === 'accessories' ? 'active' : ''}`}
          onClick={() => setFilter('accessories')}
        >
          Accessories
        </button>
      </div>

      {/* Selected Items Preview */}
      {selectedItems.length > 0 && (
        <div className="selected-preview-bar">
          <span className="selected-label">Selected:</span>
          <div className="selected-preview-items">
            {getSelectedItemsData().map((item) => (
              <div key={item._id} className="selected-preview-item">
                <img src={item.image_url} alt={item.type} />
                <button
                  className="selected-preview-remove"
                  onClick={() => toggleItemSelection(item._id.toString())}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            className="sf-btn sf-btn-ghost sf-btn-sm"
            onClick={handleClear}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Items Grid - Closet Style */}
      {loading ? (
        <div className="closet-loading">Loading your closet...</div>
      ) : getFilteredItems().length === 0 ? (
        <div className="closet-empty">
          <p>📦 No items found</p>
          <p className="closet-empty-hint">
            Add items to your closet first
          </p>
          <button
            className="sf-btn sf-btn-primary"
            onClick={() => navigate('/closet')}
          >
            Go to Closet
          </button>
        </div>
      ) : (
        <div className="closet-grid">
          {getFilteredItems().map((item) => {
            const isSelected = selectedItems.includes(item._id.toString());
            return (
              <div
                key={item._id}
                className={`closet-item outfit-select-item ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleItemSelection(item._id.toString())}
              >
                <div className="closet-item-image">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.type} />
                  ) : (
                    <div className="closet-item-placeholder">No Image</div>
                  )}
                  {isSelected && (
                    <div className="item-selected-badge">✓</div>
                  )}
                </div>
                <div className="closet-item-info">
                  <span className="closet-item-type">{item.type}</span>
                  {item.brand && <span className="closet-item-brand">{item.brand}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
