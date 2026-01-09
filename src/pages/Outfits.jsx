import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOutfits, deleteOutfit } from '../lib/api/outfits';
import VirtualFittingRoom from '../components/VirtualFittingRoom';

export default function Outfits() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVFR, setShowVFR] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [filterActivity, setFilterActivity] = useState('all');
  const [filterSeason, setFilterSeason] = useState('all');

  useEffect(() => {
    if (user) {
      loadOutfits();
    }
  }, [user]);

  const loadOutfits = async () => {
    setLoading(true);
    try {
      const fetchedOutfits = await getOutfits(user.id);
      console.log('📦 Loaded outfits:', fetchedOutfits);
      console.log('📦 First outfit items:', fetchedOutfits[0]?.items);
      setOutfits(fetchedOutfits);
    } catch (error) {
      console.error('Error loading outfits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (outfitId) => {
    if (!confirm('Delete this outfit?')) return;
    
    try {
      await deleteOutfit(outfitId, user.id);
      setOutfits((prev) => prev.filter((outfit) => outfit._id !== outfitId));
    } catch (error) {
      console.error('Error deleting outfit:', error);
      alert('Failed to delete outfit');
    }
  };

  const handleCleanupBrokenOutfits = async () => {
    const brokenOutfits = outfits.filter(o => o.items?.length === 0);
    if (brokenOutfits.length === 0) {
      alert('No broken outfits to clean up!');
      return;
    }

    if (!confirm(`Delete ${brokenOutfits.length} outfit(s) with missing items?`)) return;

    try {
      for (const outfit of brokenOutfits) {
        await deleteOutfit(outfit._id, user.id);
      }
      setOutfits((prev) => prev.filter((outfit) => outfit.items?.length > 0));
      alert(`✅ Cleaned up ${brokenOutfits.length} outfit(s)`);
    } catch (error) {
      console.error('Error cleaning up outfits:', error);
      alert('Failed to clean up outfits');
    }
  };

  if (!user) {
    return (
      <div className="sf-card sf-fade-in">
        <h2>Outfits</h2>
        <p>Please log in to view your outfits.</p>
      </div>
    );
  }

  // Filter outfits by activity and season
  const filteredOutfits = outfits.filter(outfit => {
    const matchesActivity = filterActivity === 'all' || outfit.occasion === filterActivity;
    const matchesSeason = filterSeason === 'all' || outfit.weather === filterSeason;
    return matchesActivity && matchesSeason;
  });

  return (
    <div className="outfits-page sf-fade-in">
      <div className="outfits-header">
        <div>
          <h2 className="sf-title-lg">My Outfits</h2>
          <p className="sf-subtitle">{filteredOutfits.length} of {outfits.length} outfits</p>
        </div>
        <div className="outfits-actions">
          {outfits.some(o => o.items?.length === 0) && (
            <button
              className="sf-btn sf-btn-outline"
              onClick={handleCleanupBrokenOutfits}
              style={{ background: '#fee2e2', color: '#dc2626', borderColor: '#fecaca' }}
            >
              🧹 Clean Up
            </button>
          )}
          <button
            className="sf-btn sf-btn-outline"
            onClick={() => navigate('/outfits/stylist')}
          >
            ✨ AI Stylist
          </button>
          <button
            className="sf-btn sf-btn-primary"
            onClick={() => navigate('/outfits/builder')}
          >
            + Create Outfit
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="outfits-filters">
        <div className="filter-group">
          <label>🎯 Activity:</label>
          <select value={filterActivity} onChange={(e) => setFilterActivity(e.target.value)} className="sf-select">
            <option value="all">All Activities</option>
            <option value="work">💼 Work</option>
            <option value="casual">👕 Casual</option>
            <option value="formal">🎩 Formal</option>
            <option value="workout">💪 Workout</option>
            <option value="party">🎉 Party</option>
            <option value="date">💕 Date</option>
          </select>
        </div>
        <div className="filter-group">
          <label>🌤️ Season:</label>
          <select value={filterSeason} onChange={(e) => setFilterSeason(e.target.value)} className="sf-select">
            <option value="all">All Seasons</option>
            <option value="spring">🌸 Spring</option>
            <option value="summer">☀️ Summer</option>
            <option value="fall">🍂 Fall</option>
            <option value="winter">❄️ Winter</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="outfits-loading">Loading outfits...</div>
      ) : filteredOutfits.length === 0 && outfits.length > 0 ? (
        <div className="outfits-empty">
          <p>🔍 No outfits match your filters</p>
          <p className="outfits-empty-hint">Try adjusting the activity or season filters</p>
          <button
            className="sf-btn sf-btn-secondary"
            onClick={() => {
              setFilterActivity('all');
              setFilterSeason('all');
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : outfits.length === 0 ? (
        <div className="outfits-empty">
          <p>👗 No outfits yet</p>
          <p className="outfits-empty-hint">
            Create your first outfit by selecting items from your closet
          </p>
          <button
            className="sf-btn sf-btn-primary"
            onClick={() => navigate('/outfits/builder')}
          >
            Create Outfit
          </button>
        </div>
      ) : filteredOutfits.length === 0 ? (
        <div className="outfits-empty">
          <p>🔍 No outfits match your filters</p>
          <p className="outfits-empty-hint">Try adjusting the activity or season filters</p>
          <button
            className="sf-btn sf-btn-secondary"
            onClick={() => {
              setFilterActivity('all');
              setFilterSeason('all');
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="outfits-grid">
          {filteredOutfits.map((outfit) => (
            <div key={outfit._id} className="outfit-card">
              <div className="outfit-card-images-all">
                {outfit.items?.length === 0 ? (
                  <div className="outfit-no-items">
                    ⚠️ Items no longer in closet
                  </div>
                ) : (
                  outfit.items?.map((item, idx) => (
                    <div key={idx} className="outfit-item-thumb-sm">
                      <img src={item.image_url} alt={item.type} />
                      <span className="outfit-item-type-label">{item.type}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="outfit-card-info">
                <h3>{outfit.name}</h3>
                <p className="outfit-item-count">{outfit.items?.length || 0} items</p>
                <div className="outfit-tags">
                  {outfit.occasion && (
                    <span className="outfit-tag outfit-occasion">
                      {outfit.occasion === 'work' && '💼'}
                      {outfit.occasion === 'casual' && '👕'}
                      {outfit.occasion === 'formal' && '🎩'}
                      {outfit.occasion === 'workout' && '💪'}
                      {outfit.occasion === 'party' && '🎉'}
                      {outfit.occasion === 'date' && '💕'}
                      {' '}{outfit.occasion}
                    </span>
                  )}
                  {outfit.weather && (
                    <span className="outfit-tag outfit-weather">
                      {outfit.weather === 'spring' && '🌸'}
                      {outfit.weather === 'summer' && '☀️'}
                      {outfit.weather === 'fall' && '🍂'}
                      {outfit.weather === 'winter' && '❄️'}
                      {' '}{outfit.weather}
                    </span>
                  )}
                </div>
                <div className="outfit-card-actions">
                  <button
                    className="outfit-tryon-btn sf-btn sf-btn-primary"
                    onClick={() => {
                      setSelectedOutfit(outfit);
                      setShowVFR(true);
                    }}
                    style={{ marginBottom: '8px', width: '100%' }}
                  >
                    👤 Try On
                  </button>
                  <button
                    className="outfit-edit-btn"
                    onClick={() => navigate(`/outfits/builder?edit=${outfit._id}`)}
                  >
                    Edit
                  </button>
                  <button
                    className="outfit-delete-btn"
                    onClick={() => handleDelete(outfit._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Virtual Fitting Room */}
      {showVFR && selectedOutfit && (
        <VirtualFittingRoom
          outfit={selectedOutfit}
          userProfile={userProfile}
          onClose={() => {
            setShowVFR(false);
            setSelectedOutfit(null);
          }}
          onSave={() => {
            // Reload outfits to reflect any updates
            loadOutfits();
          }}
        />
      )}
    </div>
  );
}
