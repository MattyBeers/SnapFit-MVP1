/**
 * Add Item Form with Mobile Camera Upload
 * Features: Camera/gallery access, Supabase Storage upload, OpenAI Vision analysis
 */

import { useState, useRef } from 'react';
import { createClosetItem } from '../lib/api/closet';
import { uploadImage, compressImage } from '../lib/storage';
import { removeClothingBackground, previewBackgroundRemoval } from '../lib/backgroundRemoval';
import BackgroundRemover from './BackgroundRemover';

export default function AddItemForm({ userId, onItemAdded, onClose, isWishlist = false, onSubmit, onCancel, initialData }) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(initialData?.image_url || null);
  const [formData, setFormData] = useState({
    type: initialData?.type || '',
    color: initialData?.color || '#000000',
    brand: initialData?.brand || '',
    season: initialData?.season || 'all',
    tags: initialData?.tags || '',
    notes: initialData?.notes || '',
    // Wishlist-specific fields
    ...(isWishlist && {
      priority: initialData?.priority || 'medium',
      estimatedPrice: initialData?.estimatedPrice || '',
      purchaseUrl: initialData?.purchaseUrl || '',
      name: initialData?.name || '',
    }),
  });
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [aiUsed, setAiUsed] = useState(false);
  const [showBgRemover, setShowBgRemover] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [bgSettings, setBgSettings] = useState({
    enabled: true,
    neutralBackground: true,
    backgroundColor: '#000000'
  });
  const fileInputRef = useRef(null);

  // Convert file to base64 for OpenAI Vision API
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // OpenAI Vision API - Analyze clothing image
  const analyzeImage = async (file) => {
    setAnalyzing(true);
    
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!apiKey) {
        console.warn('OpenAI API key not configured, using mock data');
        // Fallback to mock data if no API key
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setAnalyzing(false);
        return {
          type: 'shirt',
          color: '#4169e1',
          tags: ['casual', 'cotton'],
        };
      }

      // Convert to base64 for API
      const base64Image = await fileToBase64(file);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this clothing item and return ONLY a JSON object (no markdown, no explanation) with: type (shirt/pants/dress/shoes/jacket/accessories/other), color (hex code of dominant color), tags (array of 2-3 style tags like casual, formal, sporty, vintage, etc). Example: {"type":"shirt","color":"#4169e1","tags":["casual","cotton"]}',
                },
                {
                  type: 'image_url',
                  image_url: { url: base64Image },
                },
              ],
            },
          ],
          max_tokens: 150,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse JSON from response (remove markdown if present)
      const jsonMatch = content.match(/\{[^}]+\}/);
      const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      
      setAnalyzing(false);
      return analysis;
    } catch (error) {
      console.error('Error analyzing image:', error);
      setAnalyzing(false);
      // Return default values on error
      return { type: '', color: '', tags: [] };
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Show preview immediately
      setImagePreview(URL.createObjectURL(file));

      // Compress image for storage
      const compressed = await compressImage(file);
      setImageFile(compressed);
      // Don't run AI automatically anymore
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image');
    }
  };

  // Background removal handler
  const handleRemoveBackground = async () => {
    if (!imageFile) {
      alert('Please select an image first');
      return;
    }

    setRemovingBg(true);
    try {
      const result = await removeClothingBackground(imageFile, {
        provider: 'auto',
        quality: 'high',
        neutralBackground: true, // Always transparent
        backgroundColor: 'transparent' // Force transparent
      });

      // Update preview and file
      setImagePreview(result.url);
      setImageFile(result.blob);
      setBgRemoved(true);
      setRemovingBg(false);
      
      console.log(`✅ Background removed using: ${result.method}`);
      if (result.method === 'removebg') {
        alert('✅ Professional background removed! (Transparent PNG)');
      } else {
        alert(`Background removed using: ${result.method}`);
      }
    } catch (error) {
      console.error('Background removal failed:', error);
      setRemovingBg(false);
      alert('Failed to remove background. Keeping original image.');
    }
  };

  // Manual AI analysis trigger
  const handleUseAI = async () => {
    if (!imageFile) {
      alert('Please select an image first');
      return;
    }

    try {
      const analysis = await analyzeImage(imageFile);
      
      // Auto-fill form with AI suggestions
      setFormData((prev) => ({
        ...prev,
        type: analysis.type || prev.type,
        color: analysis.color || prev.color,
        tags: Array.isArray(analysis.tags) ? analysis.tags.join(', ') : prev.tags,
      }));
      
      setAiUsed(true);
    } catch (error) {
      console.error('Error analyzing image:', error);
      alert('Failed to analyze image with AI');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageFile) {
      alert('Please select an image');
      return;
    }

    if (!formData.type) {
      alert('Please select a type for your item');
      return;
    }

    if (isWishlist && !formData.name) {
      alert('Please enter an item name');
      return;
    }

    // If wishlist mode with custom handler, use it
    if (isWishlist && onSubmit) {
      setLoading(true);
      try {
        if (!userId) {
          alert('User not authenticated. Please log in again.');
          setLoading(false);
          return;
        }
        
        setUploadProgress(30);
        // Upload to user's folder with 'wishlist' subfolder
        const imageUrl = await uploadImage(imageFile, userId, 'wishlist');
        setUploadProgress(100);
        
        const itemData = {
          image_url: imageUrl,
          type: formData.type,
          color: formData.color,
          brand: formData.brand,
          season: formData.season,
          tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
          notes: formData.notes,
          name: formData.name,
          priority: formData.priority,
          estimatedPrice: formData.estimatedPrice,
          purchaseUrl: formData.purchaseUrl,
        };

        onSubmit(itemData);
        setLoading(false);
      } catch (error) {
        console.error('Error adding wishlist item:', error);
        alert('Failed to add item to wishlist');
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    console.log('Starting item upload...', { userId, formData });

    try {
      // Upload image to Supabase Storage
      setUploadProgress(30);
      console.log('Uploading image to Supabase...');
      const imageUrl = await uploadImage(imageFile, userId);
      console.log('Image uploaded:', imageUrl);
      setUploadProgress(60);

      // Save item to MongoDB with image URL
      console.log('Creating closet item in database...');
      const newItem = await createClosetItem(
        {
          image_url: imageUrl,
          type: formData.type,
          color: formData.color,
          brand: formData.brand,
          season: formData.season,
          tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
          notes: formData.notes,
        },
        userId
      );
      console.log('Item created successfully:', newItem);

      setUploadProgress(100);
      alert('Item added to closet! 🎉');
      onItemAdded(newItem);
    } catch (error) {
      console.error('Error adding item:', error);
      alert(`Failed to add item: ${error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="add-item-overlay" onClick={onClose}>
      <div className="add-item-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-item-header">
          <h3>Add Closet Item</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Image Upload */}
          <div className="image-upload-section">
            {imagePreview ? (
              <div className="image-preview" style={{
                background: bgRemoved ? 
                  'repeating-conic-gradient(#e5e7eb 0% 25%, #f9fafb 0% 50%) 50% / 20px 20px' : 
                  '#f9fafb',
                padding: '20px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px'
              }}>
                <img src={imagePreview} alt="Preview" style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  objectFit: 'contain'
                }} />
                {analyzing && (
                  <div className="analyzing-overlay">
                    <div className="spinner"></div>
                    <span>Analyzing with AI...</span>
                    <button
                      type="button"
                      className="skip-ai-btn"
                      onClick={() => setAnalyzing(false)}
                    >
                      Skip AI
                    </button>
                  </div>
                )}
                <div className="image-actions">
                  <button
                    type="button"
                    className="change-photo-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📷 Change Photo
                  </button>
                  <button
                    type="button"
                    className={`bg-remove-btn ${bgRemoved ? 'bg-removed' : ''}`}
                    onClick={handleRemoveBackground}
                    disabled={removingBg}
                  >
                    {removingBg ? '⏳ Removing...' : bgRemoved ? '✅ Background Removed' : '🎨 Remove Background'}
                  </button>
                  {!analyzing && !aiUsed && (
                    <button
                      type="button"
                      className="ai-assist-btn"
                      onClick={handleUseAI}
                    >
                      🤖 Use AI Assist
                    </button>
                  )}
                  {aiUsed && (
                    <span className="ai-badge">✨ AI Analyzed</span>
                  )}
                </div>
                
                {/* Background Settings */}
                <div className="bg-settings">
                  <details>
                    <summary>⚙️ Background Options</summary>
                    <div className="bg-options">
                      <label className="bg-option">
                        <input
                          type="checkbox"
                          checked={bgSettings.neutralBackground}
                          onChange={(e) => setBgSettings({
                            ...bgSettings,
                            neutralBackground: e.target.checked
                          })}
                        />
                        <span>Use neutral background (for VFR)</span>
                      </label>
                      {bgSettings.neutralBackground && (
                        <div className="color-picker-group">
                          <label>Background Color:</label>
                          <div className="color-picker-row">
                            <input
                              type="color"
                              value={bgSettings.backgroundColor}
                              onChange={(e) => setBgSettings({
                                ...bgSettings,
                                backgroundColor: e.target.value
                              })}
                            />
                            <div className="preset-colors">
                              <button type="button" onClick={() => setBgSettings({...bgSettings, backgroundColor: '#000000'})} style={{backgroundColor: '#000000'}} title="Black"/>
                              <button type="button" onClick={() => setBgSettings({...bgSettings, backgroundColor: '#FFFFFF'})} style={{backgroundColor: '#FFFFFF', border: '1px solid #ccc'}} title="White"/>
                              <button type="button" onClick={() => setBgSettings({...bgSettings, backgroundColor: '#808080'})} style={{backgroundColor: '#808080'}} title="Gray"/>
                              <button type="button" onClick={() => setBgSettings({...bgSettings, backgroundColor: '#F5F5F5'})} style={{backgroundColor: '#F5F5F5', border: '1px solid #ccc'}} title="Off-White"/>
                            </div>
                          </div>
                        </div>
                      )}
                      <p className="bg-tip">💡 Neutral backgrounds work best for 3D fitting room</p>
                    </div>
                  </details>
                </div>
              </div>
            ) : (
              <div
                className="image-upload-placeholder"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="camera-icon">📸</span>
                <span>Tap to take photo or upload</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Form Fields */}
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="item-type">Type *</label>
              <select
                id="item-type"
                name="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              >
                <option value="">Select type</option>
                <option value="shirt">Shirt</option>
                <option value="pants">Pants</option>
                <option value="dress">Dress</option>
                <option value="shoes">Shoes</option>
                <option value="jacket">Jacket</option>
                <option value="accessories">Accessories</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="item-color">Color</label>
              <input
                id="item-color"
                type="color"
                name="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label htmlFor="item-brand">Brand</label>
              <input
                id="item-brand"
                type="text"
                name="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Nike, Zara, etc."
              />
            </div>

            <div className="form-field">
              <label htmlFor="item-season">Season</label>
              <select
                id="item-season"
                name="season"
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
              >
                <option value="all">All Seasons</option>
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
                <option value="fall">Fall</option>
                <option value="winter">Winter</option>
              </select>
            </div>

            <div className="form-field form-field-full">
              <label htmlFor="item-tags">Tags (comma-separated)</label>
              <input
                id="item-tags"
                type="text"
                name="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="casual, work, formal"
              />
            </div>

            {/* Wishlist-specific fields */}
            {isWishlist && (
              <>
                <div className="form-field">
                  <label htmlFor="item-name">Item Name *</label>
                  <input
                    id="item-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Nike Air Max 270"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="item-priority">Priority</label>
                  <select
                    id="item-priority"
                    name="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="item-price">Estimated Price</label>
                  <input
                    id="item-price"
                    type="number"
                    step="0.01"
                    name="estimatedPrice"
                    value={formData.estimatedPrice}
                    onChange={(e) => setFormData({ ...formData, estimatedPrice: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-field form-field-full">
                  <label htmlFor="item-url">Purchase URL</label>
                  <input
                    id="item-url"
                    type="url"
                    name="purchaseUrl"
                    value={formData.purchaseUrl}
                    onChange={(e) => setFormData({ ...formData, purchaseUrl: e.target.value })}
                    placeholder="https://example.com/product"
                  />
                </div>
              </>
            )}

            <div className="form-field form-field-full">
              <label htmlFor="item-notes">{isWishlist ? 'Why do you want this?' : 'Notes'}</label>
              <textarea
                id="item-notes"
                name="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={isWishlist ? "This would complete my summer wardrobe..." : "Any additional notes..."}
                rows="2"
              />
            </div>
          </div>

          {/* Upload Progress */}
          {loading && uploadProgress > 0 && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="progress-text">
                {uploadProgress < 60 ? 'Uploading image...' : 'Saving item...'}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="sf-btn sf-btn-outline"
              onClick={onCancel || onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="sf-btn sf-btn-primary"
              disabled={loading || analyzing}
            >
              {loading ? 'Adding...' : isWishlist ? '✨ Add to Wishlist' : 'Add to Closet'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .add-item-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
          overflow-y: auto;
        }

        .add-item-modal {
          background: var(--sf-surface, #fff);
          border-radius: 16px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        .add-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--sf-border, #e0e0e0);
        }

        .add-item-header h3 {
          margin: 0;
          font-size: 20px;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 32px;
          line-height: 1;
          cursor: pointer;
          color: var(--sf-muted, #666);
          padding: 0;
          width: 32px;
          height: 32px;
        }

        form {
          padding: 24px;
        }

        .image-upload-section {
          margin-bottom: 24px;
        }

        .image-upload-placeholder {
          border: 2px dashed var(--sf-border, #e0e0e0);
          border-radius: 12px;
          padding: 60px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .image-upload-placeholder:hover {
          border-color: var(--sf-primary, #0b6bdc);
          background: var(--sf-bg, #f9f9f9);
        }

        .camera-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
        }

        .image-preview {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
        }

        .image-preview img {
          width: 100%;
          height: auto;
          display: block;
        }

        .analyzing-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          gap: 12px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .skip-ai-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid white;
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          margin-top: 8px;
        }

        .image-actions {
          position: absolute;
          bottom: 12px;
          left: 12px;
          right: 12px;
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: space-between;
        }

        .change-photo-btn {
          background: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          flex-shrink: 0;
        }

        .ai-assist-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          font-weight: 600;
          flex-shrink: 0;
        }

        .ai-assist-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .ai-badge {
          background: rgba(255, 255, 255, 0.95);
          color: #667eea;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
        }

        .form-field-full {
          grid-column: 1 / -1;
        }

        .form-field label {
          margin-bottom: 6px;
          font-weight: 500;
          font-size: 14px;
          color: var(--sf-text, #1a1a1a);
        }

        .form-field input,
        .form-field select,
        .form-field textarea {
          padding: 10px 12px;
          border: 1px solid var(--sf-border, #e0e0e0);
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
        }

        .form-field input[type="color"] {
          height: 44px;
          cursor: pointer;
        }

        .form-field textarea {
          resize: vertical;
        }

        .upload-progress {
          margin-bottom: 20px;
          text-align: center;
        }

        .progress-bar {
          height: 8px;
          background: var(--sf-bg, #f0f0f0);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--sf-primary, #0b6bdc), #3b82f6);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 13px;
          color: var(--sf-muted, #666);
        }

        .form-actions {
          display: flex;
          gap: 12px;
        }

        .form-actions button {
          flex: 1;
        }

        @media (max-width: 600px) {
          .add-item-modal {
            max-height: 95vh;
            border-radius: 12px 12px 0 0;
            align-self: flex-end;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Background Remover Modal */}
      {showBgRemover && imagePreview && (
        <BackgroundRemover
          imageUrl={imagePreview}
          onComplete={(processed) => {
            setImagePreview(processed.url);
            // Convert blob to file
            const file = new File([processed.blob], 'processed-image.png', { type: 'image/png' });
            setImageFile(file);
            setShowBgRemover(false);
          }}
          onCancel={() => setShowBgRemover(false)}
        />
      )}
    </div>
  );
}
