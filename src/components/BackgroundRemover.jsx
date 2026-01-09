/**
 * Image Background Remover Component
 * Allows users to remove backgrounds from clothing items
 */

import { useState } from 'react';
import { removeBackground, removeBgWithAPI, autoCrop } from '../lib/imageProcessing';

export default function BackgroundRemover({ imageUrl, onComplete, onCancel }) {
  const [processing, setProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState(null);
  const [threshold, setThreshold] = useState(30);
  const [method, setMethod] = useState('auto'); // 'auto' or 'api'
  const [error, setError] = useState(null);

  const handleAutoRemove = async () => {
    setProcessing(true);
    setError(null);
    
    try {
      // Remove background
      const result = await removeBackground(imageUrl, { threshold });
      
      // Auto-crop to remove excess space
      const cropped = await autoCrop(result.url);
      
      setProcessedImage(cropped);
    } catch (err) {
      console.error('Background removal error:', err);
      setError('Failed to remove background. Try adjusting the threshold.');
    } finally {
      setProcessing(false);
    }
  };

  const handleAPIRemove = async () => {
    setProcessing(true);
    setError(null);
    
    try {
      // Convert URL to File
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'image.jpg', { type: blob.type });
      
      // Use Remove.bg API
      const result = await removeBgWithAPI(file);
      
      // Auto-crop
      const cropped = await autoCrop(result.url);
      
      setProcessedImage(cropped);
    } catch (err) {
      console.error('API background removal error:', err);
      setError(err.message || 'Failed to remove background with API');
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = () => {
    if (processedImage) {
      onComplete(processedImage);
    }
  };

  return (
    <div className="bg-remover-overlay">
      <div className="bg-remover-modal">
        <div className="bg-remover-header">
          <h3>🎨 Remove Background</h3>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <div className="bg-remover-content">
          {/* Preview Section */}
          <div className="bg-remover-preview">
            <div className="preview-column">
              <h4>Original</h4>
              <div className="preview-image-container">
                <img src={imageUrl} alt="Original" />
              </div>
            </div>
            
            {processedImage && (
              <div className="preview-column">
                <h4>Processed</h4>
                <div className="preview-image-container checkerboard">
                  <img src={processedImage.url} alt="Processed" />
                </div>
              </div>
            )}
          </div>

          {/* Controls Section */}
          <div className="bg-remover-controls">
            <div className="control-group">
              <label>Method</label>
              <div className="method-selector">
                <button
                  className={`method-btn ${method === 'auto' ? 'active' : ''}`}
                  onClick={() => setMethod('auto')}
                >
                  🤖 Auto (Free)
                </button>
                <button
                  className={`method-btn ${method === 'api' ? 'active' : ''}`}
                  onClick={() => setMethod('api')}
                >
                  ✨ AI (Premium)
                </button>
              </div>
              <small className="hint-text">
                {method === 'auto' 
                  ? 'Works best with solid color backgrounds'
                  : 'Professional AI removal (requires API key)'}
              </small>
            </div>

            {method === 'auto' && (
              <div className="control-group">
                <label>Sensitivity: {threshold}</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value))}
                  disabled={processing}
                />
                <small className="hint-text">
                  Lower = stricter, Higher = more aggressive
                </small>
              </div>
            )}

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="bg-remover-actions">
              <button
                className="sf-btn sf-btn-primary"
                onClick={method === 'auto' ? handleAutoRemove : handleAPIRemove}
                disabled={processing}
              >
                {processing ? '⏳ Processing...' : '🎨 Remove Background'}
              </button>
              
              {processedImage && (
                <button
                  className="sf-btn sf-btn-primary"
                  onClick={handleSave}
                >
                  ✅ Use This Image
                </button>
              )}
              
              <button
                className="sf-btn sf-btn-outline"
                onClick={onCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-remover-tips">
          <h4>💡 Tips for Best Results:</h4>
          <ul>
            <li>📸 Take photos against a plain, solid-colored background</li>
            <li>💡 Ensure good lighting with no harsh shadows</li>
            <li>📏 Keep the clothing item centered and fully visible</li>
            <li>🎨 White or light backgrounds work best for auto removal</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
