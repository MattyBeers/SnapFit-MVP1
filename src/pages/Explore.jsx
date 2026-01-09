import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCommunityFeed } from '../lib/api/community';
import { likeOutfit, addComment, deleteOutfit } from '../lib/api/outfits';
import { isAdmin, canDeleteOutfit } from '../lib/adminUtils';

export default function Explore() {
  const { user } = useAuth();
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ occasion: '', weather: '' });
  const [liking, setLiking] = useState({});
  const [showComments, setShowComments] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [socialDisabled, setSocialDisabled] = useState(false);

  useEffect(() => {
    checkSocialFeatures();
    if (!socialDisabled) {
      loadFeed();
    }
  }, [filter]);

  function checkSocialFeatures() {
    const savedPrefs = localStorage.getItem('snapfit_preferences');
    if (savedPrefs) {
      const prefs = JSON.parse(savedPrefs);
      setSocialDisabled(prefs.enableSocialFeatures === false);
    }
  }

  async function loadFeed() {
    try {
      setLoading(true);
      const data = await getCommunityFeed({
        limit: 20,
        skip: 0,
        occasion: filter.occasion || undefined,
        weather: filter.weather || undefined,
      });
      console.log('📦 Loaded feed data:', data);
      console.log('👤 Current user:', user);
      if (data.length > 0) {
        console.log('📸 First outfit items:', data[0].items);
        console.log('🆔 First outfit user_id:', data[0].user_id);
        console.log('🆔 First outfit userId:', data[0].userId);
      }
      setOutfits(data);
    } catch (error) {
      console.error('Error loading community feed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLike(outfitId) {
    if (liking[outfitId]) return;

    try {
      setLiking({ ...liking, [outfitId]: true });
      const result = await likeOutfit(outfitId);

      setOutfits(outfits.map(outfit => {
        if (outfit._id === outfitId) {
          return {
            ...outfit,
            is_liked: result.liked,
            likes_count: result.likes_count
          };
        }
        return outfit;
      }));
    } catch (error) {
      console.error('Error liking outfit:', error);
    } finally {
      setLiking({ ...liking, [outfitId]: false });
    }
  }

  async function handleShare(outfit) {
    const shareData = {
      title: `${outfit.name} - SnapFit`,
      text: `Check out this ${outfit.occasion || 'awesome'} outfit by @${outfit.user?.username || 'SnapFit user'}!`,
      url: `${window.location.origin}/outfits/${outfit._id}`
    };

    try {
      // Try native share API first (works on mobile)
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareData.url);
        alert('🔗 Link copied to clipboard!');
      }
    } catch (error) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  }

  async function handleDeleteOutfit(outfitId) {
    if (!confirm('Are you sure you want to delete this outfit? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteOutfit(outfitId, user.id);
      // Remove from feed
      setOutfits(outfits.filter(outfit => outfit._id !== outfitId));
      alert('✅ Outfit deleted successfully');
    } catch (error) {
      console.error('Error deleting outfit:', error);
      alert('❌ Failed to delete outfit. Please try again.');
    }
  }

  async function handleAddComment(outfitId) {
    if (!commentText.trim() || !user) return;

    setSubmittingComment(true);
    try {
      const newComment = await addComment(outfitId, commentText);
      
      // Update the outfit in the list with new comment
      setOutfits(outfits.map(outfit => {
        if (outfit._id === outfitId) {
          return {
            ...outfit,
            comments: [...(outfit.comments || []), newComment],
            comments_count: (outfit.comments_count || 0) + 1
          };
        }
        return outfit;
      }));
      
      setCommentText('');
      // Comment added successfully
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  }

  function handleFilterChange(field, value) {
    setFilter({ ...filter, [field]: value });
  }

  if (loading && outfits.length === 0) {
    return (
      <div className="explore-page">
        <div className="explore-header">
          <h1>Explore</h1>
          <p className="explore-subtitle">Discover style inspiration from the community</p>
        </div>
        <div className="loading-spinner">Loading feed...</div>
      </div>
    );
  }

  return (
    <div className="explore-page">
      {/* Header */}
      <div className="explore-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <h1>Explore</h1>
          {(() => {
            console.log('🔍 Admin check - User:', user, 'isAdmin:', isAdmin(user));
            return isAdmin(user);
          })() && (
            <div style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              color: 'white',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(251, 191, 36, 0.3)'
            }}>
              🛡️ Admin Mode
            </div>
          )}
        </div>
        <p className="explore-subtitle">Discover style inspiration from the community</p>
      </div>

      {/* Privacy Mode Message */}
      {socialDisabled && (
        <div className="privacy-notice" style={{
          background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔒</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>Social Features Disabled</h3>
          <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '14px' }}>
            You've chosen to use SnapFit in private mode. The Explore feed, likes, and comments are currently hidden.
          </p>
          <button
            onClick={() => window.location.href = '/settings'}
            className="sf-btn sf-btn-primary"
            style={{ fontSize: '14px' }}
          >
            Enable Social Features in Settings
          </button>
        </div>
      )}

      {/* Filters */}
      {!socialDisabled && (
        <div className="explore-filters">
        <select
          value={filter.occasion}
          onChange={(e) => handleFilterChange('occasion', e.target.value)}
          className="filter-select"
        >
          <option value="">All Occasions</option>
          <option value="casual">Casual</option>
          <option value="work">Work</option>
          <option value="formal">Formal</option>
          <option value="party">Party</option>
          <option value="date">Date</option>
          <option value="workout">Workout</option>
          <option value="travel">Travel</option>
        </select>

        <select
          value={filter.weather}
          onChange={(e) => handleFilterChange('weather', e.target.value)}
          className="filter-select"
        >
          <option value="">All Weather</option>
          <option value="sunny">☀️ Sunny</option>
          <option value="cloudy">☁️ Cloudy</option>
          <option value="rainy">🌧️ Rainy</option>
          <option value="cold">❄️ Cold</option>
          <option value="hot">🔥 Hot</option>
        </select>

        {(filter.occasion || filter.weather) && (
          <button
            className="filter-clear-btn"
            onClick={() => setFilter({ occasion: '', weather: '' })}
          >
            Clear Filters
          </button>
        )}
        </div>
      )}

      {/* Feed */}
      {!socialDisabled && (
        outfits.length === 0 ? (
          <div className="empty-feed">
            <div className="empty-feed-icon">👗</div>
            <h3>No public outfits yet</h3>
            <p>Be the first to share your style with the community!</p>
          </div>
        ) : (
          <div className="feed-container">
            {outfits.map((outfit) => (
            <div key={outfit._id} className="feed-card">
              {/* User Header */}
              <div className="feed-card-header">
                <div className="feed-user-info">
                  <div className="feed-avatar">
                    {outfit.user?.avatar_url ? (
                      <img src={outfit.user.avatar_url} alt={outfit.user.username} />
                    ) : (
                      <div className="feed-avatar-placeholder">
                        {outfit.user?.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="feed-username">@{outfit.user?.username || 'anonymous'}</div>
                    <div className="feed-timestamp">
                      {new Date(outfit.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {/* Delete button for post owner OR admin (user1) */}
                {canDeleteOutfit(user, outfit) && (
                  <button
                    className="feed-delete-btn"
                    onClick={() => handleDeleteOutfit(outfit._id)}
                    title={isAdmin(user) ? "🛡️ Delete (Admin)" : "Delete your post"}
                  >
                    🗑️
                  </button>
                )}
              </div>

              {/* Outfit Images Grid */}
              <div className="feed-outfit-grid">
                {outfit.items && outfit.items.length > 0 ? (
                  <>
                    {outfit.items.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="feed-outfit-item">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.type || 'clothing item'}
                            onError={(e) => {
                              console.log('Failed to load image:', item.image_url);
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#f3f4f6;color:#9ca3af;font-size:32px;">👕</div>`;
                            }}
                          />
                        ) : (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            background: '#f3f4f6',
                            color: '#9ca3af',
                            fontSize: '32px'
                          }}>
                            👕
                          </div>
                        )}
                      </div>
                    ))}
                    {outfit.items.length > 4 && (
                      <div className="feed-outfit-item feed-more-items">
                        <span>+{outfit.items.length - 4}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    background: '#f9fafb'
                  }}>
                    No items in this outfit
                  </div>
                )}
              </div>

              {/* Actions Bar */}
              <div className="feed-actions">
                <button
                  className={`feed-action-btn ${outfit.is_liked ? 'liked' : ''}`}
                  onClick={() => handleLike(outfit._id)}
                  disabled={liking[outfit._id]}
                >
                  <span className="feed-action-icon">
                    {outfit.is_liked ? '❤️' : '🤍'}
                  </span>
                  <span>{outfit.likes_count || 0}</span>
                </button>

                <button 
                  className="feed-action-btn"
                  onClick={() => setShowComments(outfit._id)}
                >
                  <span className="feed-action-icon">💬</span>
                  <span>{outfit.comments_count || 0}</span>
                </button>

                <button 
                  className="feed-action-btn"
                  onClick={() => handleShare(outfit)}
                >
                  <span className="feed-action-icon">🔗</span>
                  <span>Share</span>
                </button>
              </div>

              {/* Outfit Details */}
              <div className="feed-content">
                <h3 className="feed-outfit-name">{outfit.name}</h3>
                
                <div className="feed-tags">
                  {outfit.occasion && (
                    <span className="feed-tag feed-tag-occasion">{outfit.occasion}</span>
                  )}
                  {outfit.weather && (
                    <span className="feed-tag feed-tag-weather">{outfit.weather}</span>
                  )}
                </div>

                {outfit.notes && (
                  <p className="feed-notes">{outfit.notes}</p>
                )}
              </div>

              {/* Comments Section */}
              {showComments === outfit._id && (
                <div className="feed-comments-section">
                  <div className="feed-comments-list">
                    {outfit.comments && outfit.comments.length > 0 ? (
                      outfit.comments.map((comment, idx) => (
                        <div key={idx} className="feed-comment">
                          <span className="feed-comment-user">@{comment.user?.username || 'User'}</span>
                          <span className="feed-comment-text">{comment.text}</span>
                        </div>
                      ))
                    ) : (
                      <p className="feed-no-comments">No comments yet. Be the first!</p>
                    )}
                  </div>
                  
                  {user && (
                    <div className="feed-add-comment">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddComment(outfit._id)}
                        disabled={submittingComment}
                      />
                      <button
                        onClick={() => handleAddComment(outfit._id)}
                        disabled={!commentText.trim() || submittingComment}
                        className="sf-btn sf-btn-primary sf-btn-sm"
                      >
                        Post
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            ))}
          </div>
        )
      )}

      {!socialDisabled && loading && outfits.length > 0 && (
        <div className="loading-more">Loading more...</div>
      )}
    </div>
  );
}
