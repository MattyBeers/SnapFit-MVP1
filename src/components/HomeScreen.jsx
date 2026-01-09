import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getMessages, postMessage, deleteMessage } from "../lib/api/community";
import StyleAnalytics from "./StyleAnalytics";
import WelcomeSteps from "./WelcomeSteps";

function HomeScreen({ onContinue, onWelcomeContinue }) {
  const { userProfile, user } = useAuth();
  const username = userProfile?.username || "snapfit_user";
  const [messages, setMessages] = useState([]);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [preferences, setPreferences] = useState(null);
  const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [showGetStarted, setShowGetStarted] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadMessages();
    loadPreferences();
    checkFirstVisit();
    checkForVideo();
    // read persisted preference for showing get started steps
    try {
      const prefs = localStorage.getItem('snapfit_preferences');
      const parsed = prefs ? JSON.parse(prefs) : {};
      if (parsed.showGetStarted) setShowGetStarted(true);
    } catch (e) {
      // ignore
    }
  }, []);

  // Listen for preference updates so hero can refresh without a full page reload
  useEffect(() => {
    const handler = (e) => {
      console.log('🔁 Received snapfit_prefs_updated event', e?.detail);
      loadPreferences();
      checkForVideo();
      // show transient toast in Home
      try {
        setToast({ type: 'success', message: 'Preferences saved — hero updated' });
        setTimeout(() => setToast(null), 3000);
      } catch (err) {
        console.warn('Could not show toast in Home', err);
      }
    };
    window.addEventListener('snapfit_prefs_updated', handler);
    return () => window.removeEventListener('snapfit_prefs_updated', handler);
  }, []);

  const checkForVideo = async () => {
    try {
      const savedPrefs = localStorage.getItem('snapfit_preferences');
      const parsed = savedPrefs ? JSON.parse(savedPrefs) : {};
      if (parsed.forceOnboarding) {
        console.log('🔧 forceOnboarding preference enabled — showing onboarding card instead of video.');
        setHasVideo(false);
        return;
      }
    } catch (e) {
      // ignore and continue to video check
    }
    try {
      const res = await fetch('/sample-video.mp4', { method: 'HEAD' });
      if (res.ok) setHasVideo(true);
    } catch (err) {
      setHasVideo(false);
    }
  };

  const checkFirstVisit = () => {
    const hasSeenWelcome = localStorage.getItem('snapfit_welcome_seen');
    if (!hasSeenWelcome) {
      setShowWelcomeVideo(true);
    }
  };

  const handleCloseWelcome = () => {
    localStorage.setItem('snapfit_welcome_seen', 'true');
    setShowWelcomeVideo(false);
    if (onWelcomeContinue) {
      onWelcomeContinue();
    }
  };

  const loadPreferences = () => {
    const savedPrefs = localStorage.getItem('snapfit_preferences');
    if (savedPrefs) {
      setPreferences(JSON.parse(savedPrefs));
    } else {
      // Default: all features enabled
      setPreferences({ enableAnalytics: true, enableSocialFeatures: true });
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const fetchedMessages = await getMessages(10);
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostMessage = async () => {
    if (!messageText.trim() || !user) return;
    
    setPosting(true);
    try {
      const newMessage = await postMessage(messageText);
      setMessages([newMessage, ...messages]);
      setMessageText('');
      setShowMessageForm(false);
    } catch (error) {
      console.error('Error posting message:', error);
      alert('Failed to post message');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Delete this message?')) return;
    
    try {
      await deleteMessage(messageId);
      setMessages(messages.filter(m => m._id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    }
  };

  const handleContinue = () => {
    if (onContinue) onContinue();
  };

  return (
    <div className="sf-stack sf-fade-in home-center" style={{ gap: 16 }}>
      {toast && (
        <div role="status" aria-live="polite" style={{ position: 'fixed', right: 20, top: 80, zIndex: 9999 }}>
          <div style={{ background: toast.type === 'success' ? '#10b981' : '#111827', color: '#fff', padding: '10px 14px', borderRadius: 8, boxShadow: '0 8px 30px rgba(2,6,23,0.2)' }}>
            {toast.message}
          </div>
        </div>
      )}
      {/* Top "Skip" */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="sf-btn sf-btn-ghost sf-btn-sm" onClick={handleContinue}>
          Skip to Closet →
        </button>
      </div>

      {/* Hero card */}
      <section className="sf-card">
        <div className="sf-kicker">Welcome back</div>
        <div className="sf-title-lg">@{username}</div>
        <p className="sf-subtitle" style={{ marginTop: 8 }}>
          Snap your clothes, build your fit. Check your closet or let SnapFit
          help you plan your next look. Or fits for any occasion.
        </p>

        <div className="sf-row" style={{ marginTop: 12, gap: 8, flexWrap: "wrap" }}>
          <button className="sf-btn sf-btn-primary" onClick={handleContinue}>
            Open My Closet
          </button>
          {preferences?.enableAnalytics !== false && (
            <button className="sf-btn sf-btn-outline" onClick={() => setShowAnalytics(true)}>
              📊 My Style Analytics
            </button>
          )}
        </div>
      </section>

      {/* Video + Message Board */}
      <section className="home-media">
        <div className="home-media__video card-shadow">
          {/* Responsive media frame: show video if available, otherwise show onboarding steps inline */}
          <div className="media-frame">
            {(!showGetStarted && hasVideo) ? (
              <video
                className="media-frame__video"
                controls
                playsInline
                poster="/video-poster.png"
              >
                <source src="/sample-video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <WelcomeSteps variant="card" onContinue={handleContinue} onShowAnalytics={() => setShowAnalytics(true)} />
            )}
          </div>
          <div className="home-media__meta">
            <div className="sf-kicker">Featured</div>
            <h3 className="sf-title-sm">How SnapFit recommends your best fits</h3>
            <p className="sf-subtitle">Short descriptive copy that explains what this video is about and why it helps you plan outfits.</p>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button className="sf-btn sf-btn-primary" onClick={handleContinue}>Open My Closet</button>
              <button
                className="sf-btn sf-btn-outline"
                onClick={() => {
                  const next = !showGetStarted;
                  setShowGetStarted(next);
                  try {
                    const prefs = localStorage.getItem('snapfit_preferences');
                    const parsed = prefs ? JSON.parse(prefs) : {};
                    parsed.showGetStarted = next;
                    localStorage.setItem('snapfit_preferences', JSON.stringify(parsed));
                    // notify other components
                    window.dispatchEvent(new CustomEvent('snapfit_prefs_updated', { detail: parsed }));
                  } catch (e) {
                    console.warn('Could not persist showGetStarted preference', e);
                  }
                }}
              >
                {showGetStarted ? 'Show Video' : 'Show Get Started'}
              </button>
            </div>
          </div>
        </div>

        <aside className="home-media__board">
          <h4 className="sf-section-title">Community Board</h4>
          <div className="sf-stack">
            {loading ? (
              <div className="sf-card-subtle">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="sf-card-subtle">
                <div className="sf-subtitle">No messages yet. Be the first to post!</div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message._id} className="sf-card-subtle" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {message.user?.username || 'User'}
                      </div>
                      <div className="sf-subtitle">{message.text}</div>
                    </div>
                    {user && message.user_id === user.id && (
                      <button
                        onClick={() => handleDeleteMessage(message._id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px',
                          padding: '4px 8px',
                          marginLeft: '8px'
                        }}
                        title="Delete message"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {!showMessageForm ? (
              <button 
                className="sf-btn sf-btn-outline sf-post-btn"
                onClick={() => setShowMessageForm(true)}
                disabled={!user}
              >
                Post a message
              </button>
            ) : (
              <div className="sf-card-subtle" style={{ padding: '12px' }}>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Share something with the community..."
                  maxLength={500}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    className="sf-btn sf-btn-ghost sf-btn-sm"
                    onClick={() => {
                      setShowMessageForm(false);
                      setMessageText('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="sf-btn sf-btn-primary sf-btn-sm"
                    onClick={handlePostMessage}
                    disabled={!messageText.trim() || posting}
                  >
                    {posting ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </section>

      {/* Bottom CTA */}
      <div style={{ marginTop: "auto" }}>
        <button className="sf-btn sf-btn-full" onClick={handleContinue}>
          Go to My Closet →
        </button>
      </div>

      {/* Style Analytics Modal */}
      {showAnalytics && (
        <StyleAnalytics onClose={() => setShowAnalytics(false)} />
      )}

      {/* Welcome Modal */}
      {showWelcomeVideo && (
        <div className="welcome-video-modal" onClick={handleCloseWelcome}>
          <div className="welcome-compact-content" onClick={(e) => e.stopPropagation()}>
            <div className="welcome-compact-header">
              <img src="/SnapFit-.png" alt="SnapFit" className="welcome-logo-img" />
              <h2>Welcome to SnapFit</h2>
            </div>

            <WelcomeSteps variant="compact" />

            <button 
              className="sf-btn sf-btn-primary welcome-continue-btn"
              onClick={handleCloseWelcome}
            >
              Continue to SnapFit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomeScreen;
