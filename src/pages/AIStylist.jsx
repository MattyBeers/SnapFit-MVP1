/**
 * AI Stylist - Generate outfit recommendations
 * Virtual Fitting Room - Try on outfits with body template
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClosetItems } from '../lib/api/closet';
import { createOutfit } from '../lib/api/outfits';
import { getUserProfile } from '../lib/api/users';
import { useAuth } from '../context/AuthContext';
import VirtualFittingRoom from '../components/VirtualFittingRoom';

export default function AIStylist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [showFittingRoom, setShowFittingRoom] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [fittingRoomBg, setFittingRoomBg] = useState('neutral');
  const [showRecommendations, setShowRecommendations] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadItems();
    loadUserProfile();
  }, [user]);

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

  const loadUserProfile = async () => {
    try {
      const profile = await getUserProfile();
      setUserProfile(profile);
      
      // Load saved preferences
      const savedPrefs = localStorage.getItem('snapfit_preferences');
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        setFittingRoomBg(prefs.fittingRoomBackground || 'neutral');
        setShowRecommendations(prefs.showRecommendations !== false);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Categorize items by type for head-to-toe outfits
  const categorizeItems = () => {
    return {
      hats: items.filter(i => i.type === 'hat' || i.tags?.includes('hat')),
      tops: items.filter(i => ['shirt', 'jacket', 'dress'].includes(i.type)),
      bottoms: items.filter(i => ['pants', 'shorts', 'skirt'].includes(i.type)),
      shoes: items.filter(i => i.type === 'shoes'),
      accessories: items.filter(i => i.type === 'accessories'),
    };
  };

  // Generate outfit combinations (minimum: top + bottom)
  const generateOutfits = (occasion = 'casual', count = 3) => {
    setGenerating(true);
    const categorized = categorizeItems();
    const generated = [];

    // Algorithm: Create complete outfits with at least top + bottom
    for (let i = 0; i < count && generated.length < count; i = i + 1) {
      const top = categorized.tops[Math.floor(Math.random() * categorized.tops.length)];
      const bottom = categorized.bottoms[Math.floor(Math.random() * categorized.bottoms.length)];
      
      if (!top || !bottom) {
        continue; // Need minimum shirt + pants
      }

      const outfit = {
        id: Date.now() + i,
        name: `${occasion} Look ${i + 1}`,
        items: [top, bottom],
        occasion,
      };

      // Add shoes if available
      if (categorized.shoes.length > 0) {
        const shoes = categorized.shoes[Math.floor(Math.random() * categorized.shoes.length)];
        outfit.items.push(shoes);
      }

      // Add accessories randomly (30% chance)
      if (categorized.accessories.length > 0 && Math.random() > 0.7) {
        const accessory = categorized.accessories[Math.floor(Math.random() * categorized.accessories.length)];
        outfit.items.push(accessory);
      }

      // Add hat/jacket for formal/cold weather
      if (occasion === 'formal' || occasion === 'cold') {
        if (categorized.hats.length > 0 && Math.random() > 0.5) {
          outfit.items.push(categorized.hats[0]);
        }
      }

      generated.push(outfit);
    }

    setRecommendations(generated);
    setGenerating(false);
  };

  const saveOutfit = async (outfit) => {
    try {
      await createOutfit(
        {
          name: outfit.name,
          occasion: outfit.occasion,
          items: outfit.items.map(item => item._id.toString()),
          is_public: false,
        },
        user.id
      );
      alert('✅ Outfit saved!');
    } catch (error) {
      console.error('Error saving outfit:', error);
      alert('Failed to save outfit');
    }
  };

  const openFittingRoom = (outfit) => {
    setSelectedOutfit(outfit);
    setShowFittingRoom(true);
  };

  if (!user) return null;

  return (
    <div className="ai-stylist sf-fade-in">
      <div className="stylist-header">
        <div>
          <h2 className="sf-title-lg">✨ AI Stylist</h2>
          <p className="sf-subtitle">Get personalized outfit recommendations</p>
        </div>
        <button
          className="sf-btn sf-btn-outline"
          onClick={() => navigate('/outfits')}
        >
          ← Back
        </button>
      </div>

      {loading ? (
        <div className="stylist-loading">Loading your wardrobe...</div>
      ) : items.length < 2 ? (
        <div className="stylist-empty">
          <p>👗 You need at least a top and bottom to generate outfits</p>
          <button
            className="sf-btn sf-btn-primary"
            onClick={() => navigate('/closet')}
          >
            Add Items to Closet
          </button>
        </div>
      ) : (
        <>
          <div className="stylist-controls">
            <h3>Generate Outfits For:</h3>
            <div className="occasion-buttons">
              <button
                className="occasion-btn"
                onClick={() => generateOutfits('casual', 3)}
                disabled={generating}
              >
                👕 Casual
              </button>
              <button
                className="occasion-btn"
                onClick={() => generateOutfits('work', 3)}
                disabled={generating}
              >
                💼 Work
              </button>
              <button
                className="occasion-btn"
                onClick={() => generateOutfits('formal', 3)}
                disabled={generating}
              >
                🎩 Formal
              </button>
              <button
                className="occasion-btn"
                onClick={() => generateOutfits('party', 3)}
                disabled={generating}
              >
                🎉 Party
              </button>
              <button
                className="occasion-btn"
                onClick={() => generateOutfits('date', 3)}
                disabled={generating}
              >
                💕 Date Night
              </button>
            </div>
          </div>

          {generating && (
            <div className="generating-loader">
              <div className="spinner"></div>
              <p>Creating perfect outfits for you...</p>
            </div>
          )}

          {!showRecommendations && (
            <div className="privacy-notice" style={{
              background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px',
              marginTop: '24px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>💡</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>AI Recommendations Disabled</h3>
              <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '14px' }}>
                AI outfit suggestions are currently hidden. You can still use the Virtual Fitting Room by manually creating outfits.
              </p>
              <button
                onClick={() => window.location.href = '/settings'}
                className="sf-btn sf-btn-primary"
                style={{ fontSize: '14px' }}
              >
                Enable Recommendations in Settings
              </button>
            </div>
          )}

          {showRecommendations && recommendations.length > 0 && (
            <div className="recommendations">
              <h3>Recommended Outfits</h3>
              <div className="recommendations-grid">
                {recommendations.map((outfit) => (
                  <div key={outfit.id} className="recommendation-card">
                    <div className="recommendation-items">
                      {outfit.items.map((item, idx) => (
                        <div key={idx} className="recommendation-item">
                          <img src={item.image_url} alt={item.type} />
                          <span className="item-label">{item.type}</span>
                        </div>
                      ))}
                    </div>
                    <div className="recommendation-info">
                      <h4>{outfit.name}</h4>
                      <span className="recommendation-occasion">{outfit.occasion}</span>
                      <div className="recommendation-actions">
                        <button
                          className="sf-btn sf-btn-sm sf-btn-outline"
                          onClick={() => openFittingRoom(outfit)}
                        >
                          👤 Try On
                        </button>
                        <button
                          className="sf-btn sf-btn-sm sf-btn-primary"
                          onClick={() => saveOutfit(outfit)}
                        >
                          💾 Save
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Enhanced Virtual Fitting Room */}
      {showFittingRoom && selectedOutfit && (
        <VirtualFittingRoom
          outfit={selectedOutfit}
          userProfile={userProfile}
          onClose={() => setShowFittingRoom(false)}
          onSave={(outfit) => saveOutfit(outfit)}
        />
      )}

      <style>{`
        .ai-stylist {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .stylist-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .stylist-controls {
          background: white;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 30px;
        }

        .stylist-controls h3 {
          margin-bottom: 16px;
        }

        .occasion-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .occasion-btn {
          padding: 12px 24px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s;
        }

        .occasion-btn:hover:not(:disabled) {
          border-color: var(--sf-primary, #0b6bdc);
          transform: translateY(-2px);
        }

        .occasion-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .generating-loader {
          text-align: center;
          padding: 40px;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f0f0f0;
          border-top-color: var(--sf-primary, #0b6bdc);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .recommendations {
          margin-top: 30px;
        }

        .recommendations h3 {
          margin-bottom: 20px;
        }

        .recommendations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .recommendation-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .recommendation-items {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px;
          padding: 12px;
          background: #f9f9f9;
        }

        .recommendation-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: 8px;
          overflow: hidden;
        }

        .recommendation-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .item-label {
          position: absolute;
          bottom: 4px;
          left: 4px;
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        .recommendation-info {
          padding: 16px;
        }

        .recommendation-info h4 {
          margin-bottom: 8px;
        }

        .recommendation-occasion {
          display: inline-block;
          background: var(--sf-primary-light, #e3f2fd);
          color: var(--sf-primary, #0b6bdc);
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 12px;
        }

        .recommendation-actions {
          display: flex;
          gap: 8px;
        }

        /* Virtual Fitting Room */
        .fitting-room-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .fitting-room-modal {
          background: white;
          border-radius: 16px;
          max-width: 1000px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .fitting-room-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e0e0e0;
        }

        .fitting-room-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .body-template {
          flex: 1;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          position: relative;
        }

        .user-body-photo {
          position: absolute;
          width: 250px;
          height: 550px;
          z-index: 1;
          opacity: 0.3;
        }

        .user-body-photo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: grayscale(50%);
        }

        .body-silhouette.with-photo {
          opacity: 0.7;
          z-index: 2;
        }

        .body-silhouette {
          width: 200px;
          height: 500px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: linear-gradient(135deg, #f5deb3 0%, #d2b48c 100%);
          border-radius: 100px 100px 40px 40px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        /* Human silhouette using CSS */
        .body-head {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f5deb3 0%, #daa520 100%);
          margin-top: 15px;
          position: relative;
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.1);
          border: 2px solid rgba(255,255,255,0.3);
        }

        /* Face features */
        .body-head::before,
        .body-head::after {
          content: '';
          position: absolute;
          width: 8px;
          height: 8px;
          background: rgba(0,0,0,0.6);
          border-radius: 50%;
          top: 25px;
        }

        .body-head::before {
          left: 18px;
        }

        .body-head::after {
          right: 18px;
        }

        /* Neck */
        .body-torso::before {
          content: '';
          position: absolute;
          width: 30px;
          height: 20px;
          background: linear-gradient(135deg, #f5deb3 0%, #d2b48c 100%);
          top: -10px;
          border-radius: 0 0 5px 5px;
        }

        .body-torso {
          width: 140px;
          height: 180px;
          margin-top: 5px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f5deb3 0%, #d2b48c 100%);
          border-radius: 50px 50px 20px 20px;
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.1);
        }

        /* Arms */
        .body-torso::after {
          content: '';
          position: absolute;
          width: 180px;
          height: 30px;
          background: linear-gradient(135deg, #f5deb3 0%, #d2b48c 100%);
          top: 30px;
          border-radius: 15px;
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.1);
        }

        .body-legs {
          width: 120px;
          height: 160px;
          position: relative;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          justify-content: center;
        }

        /* Individual legs */
        .body-legs::before,
        .body-legs::after {
          content: '';
          width: 50px;
          height: 150px;
          background: linear-gradient(135deg, #f5deb3 0%, #d2b48c 100%);
          border-radius: 25px 25px 10px 10px;
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.1);
        }

        .body-feet {
          width: 120px;
          height: 40px;
          margin-top: -10px;
          position: relative;
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: center;
        }

        /* Individual feet */
        .body-feet::before,
        .body-feet::after {
          content: '';
          width: 50px;
          height: 20px;
          background: linear-gradient(135deg, #f5deb3 0%, #d2b48c 100%);
          border-radius: 10px 10px 20px 20px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        .overlay-hat,
        .overlay-top,
        .overlay-bottom,
        .overlay-shoes,
        .overlay-accessory {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .body-accessories {
          position: absolute;
          right: -60px;
          top: 150px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .overlay-accessory {
          width: 50px;
          height: 50px;
        }

        .fitting-room-sidebar {
          width: 300px;
          padding: 24px;
          overflow-y: auto;
          border-left: 1px solid #e0e0e0;
        }

        .fitting-room-sidebar h4 {
          margin-bottom: 16px;
        }

        .fitting-item {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 12px;
          background: #f9f9f9;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .fitting-item img {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 6px;
        }

        .fitting-item div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .fitting-item span {
          font-size: 13px;
          color: #666;
        }

        .stylist-empty,
        .stylist-loading {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 12px;
        }

        @media (max-width: 768px) {
          .occasion-buttons {
            flex-direction: column;
          }

          .occasion-btn {
            width: 100%;
          }

          .recommendations-grid {
            grid-template-columns: 1fr;
          }

          .fitting-room-content {
            flex-direction: column;
          }

          .fitting-room-sidebar {
            width: 100%;
            border-left: none;
            border-top: 1px solid #e0e0e0;
          }

          .body-template {
            min-height: 400px;
          }
        }
      `}</style>
    </div>
  );
}
