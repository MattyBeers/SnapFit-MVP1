import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, updateUserProfile } from "../lib/api/users";
import { uploadImage } from "../lib/storage";
import { removeClothingBackground } from "../lib/backgroundRemoval";
import { isFounder, isAdmin } from "../lib/adminUtils";

export default function Settings() {
  const { user, signOut, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    height: '',
    bodyType: 'average',
    bodyPhotoUrl: '',
    // Multi-angle body photos for optimized VFR
    bodyPhotoFront: '',
    bodyPhotoBack: '',
    bodyPhotoLeft: '',
    bodyPhotoRight: '',
    // Enhanced body measurements for VFR
    shoulderWidth: '',
    chestCircumference: '',
    waistCircumference: '',
    hipCircumference: '',
    inseam: '',
    armLength: '',
    neckCircumference: '',
    torsoLength: '',
  });
  
  // Track which angle is currently being uploaded
  const [uploadingAngle, setUploadingAngle] = useState(null);

  const [preferences, setPreferences] = useState({
    fittingRoomBackground: 'neutral',
    defaultPrivacy: 'private',
    notifications: true,
    // Privacy Mode Settings
    enableFitScoring: true,
    enableAnalytics: true,
    enableSocialFeatures: true,
    trackUsageData: true,
    showRecommendations: true,
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      console.log('📥 Loading user profile...');
      const data = await getUserProfile();
      console.log('✅ Profile loaded:', data);
      console.log('📸 Body Photo URL in profile:', data.body_photo_url);
      console.log('📏 All measurements:', {
        height: data.height,
        shoulder_width: data.shoulder_width,
        chest_circumference: data.chest_circumference,
        waist_circumference: data.waist_circumference,
        hip_circumference: data.hip_circumference,
        inseam: data.inseam,
        arm_length: data.arm_length,
        neck_circumference: data.neck_circumference,
        torso_length: data.torso_length
      });
      
      setProfile(data);
      setFormData({
        username: data.username || '',
        bio: data.bio || '',
        height: data.height || '',
        bodyType: data.body_type || 'average',
        bodyPhotoUrl: data.body_photo_url || '',
        // Multi-angle body photos
        bodyPhotoFront: data.body_photo_front || data.body_photo_url || '',
        bodyPhotoBack: data.body_photo_back || '',
        bodyPhotoLeft: data.body_photo_left || '',
        bodyPhotoRight: data.body_photo_right || '',
        // Enhanced body measurements
        shoulderWidth: data.shoulder_width || '',
        chestCircumference: data.chest_circumference || '',
        waistCircumference: data.waist_circumference || '',
        hipCircumference: data.hip_circumference || '',
        inseam: data.inseam || '',
        armLength: data.arm_length || '',
        neckCircumference: data.neck_circumference || '',
        torsoLength: data.torso_length || '',
      });
      
      console.log('📋 Form data set:', {
        username: data.username || '',
        bio: data.bio || '',
        height: data.height || '',
        bodyType: data.body_type || 'average',
        bodyPhotoUrl: data.body_photo_url || '',
      });
      
      // Load preferences from localStorage
      const savedPrefs = localStorage.getItem('snapfit_preferences');
      if (savedPrefs) {
        const parsedPrefs = JSON.parse(savedPrefs);
        console.log('✅ Preferences loaded from localStorage:', parsedPrefs);
        setPreferences(parsedPrefs);
      } else {
        console.log('ℹ️ No saved preferences found, using defaults');
      }
    } catch (error) {
      console.error('❌ Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBodyPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Automatically remove background for seamless VFR integration
      console.log('🎨 Removing background from body photo...');
      const result = await removeClothingBackground(file, {
        provider: 'auto',
        quality: 'high',
        neutralBackground: true,
        backgroundColor: 'transparent'
      });

      console.log(`✅ Background removed using: ${result.method}`);
      
      // Upload the transparent version
      const url = await uploadImage(result.blob, user.id, 'body-photos');
      setFormData({ ...formData, bodyPhotoUrl: url, bodyPhotoFront: url });
      
      if (result.method === 'removebg') {
        alert('✅ Body photo uploaded with transparent background! Save settings to apply.');
      } else {
        alert(`✅ Body photo uploaded (${result.method})! Save settings to apply.`);
      }
    } catch (error) {
      console.error('Error uploading body photo:', error);
      alert('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  // Multi-angle body photo upload handler
  const handleMultiAnglePhotoUpload = async (e, angle) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAngle(angle);
    try {
      console.log(`🎨 Processing ${angle} view body photo...`);
      const result = await removeClothingBackground(file, {
        provider: 'auto',
        quality: 'high',
        neutralBackground: true,
        backgroundColor: 'transparent'
      });

      console.log(`✅ Background removed for ${angle} view using: ${result.method}`);
      
      const url = await uploadImage(result.blob, user.id, `body-photos/${angle}`);
      
      // Update the correct field based on angle
      const fieldMap = {
        front: 'bodyPhotoFront',
        back: 'bodyPhotoBack',
        left: 'bodyPhotoLeft',
        right: 'bodyPhotoRight'
      };
      
      setFormData(prev => ({
        ...prev,
        [fieldMap[angle]]: url,
        // Also set main bodyPhotoUrl if this is front view
        ...(angle === 'front' ? { bodyPhotoUrl: url } : {})
      }));
      
      console.log(`✅ ${angle} view photo uploaded successfully`);
    } catch (error) {
      console.error(`Error uploading ${angle} view photo:`, error);
      alert(`Failed to upload ${angle} view photo`);
    } finally {
      setUploadingAngle(null);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      console.log('💾 Saving profile:', {
        username: formData.username,
        bio: formData.bio,
        height: formData.height,
        body_type: formData.bodyType,
        body_photo_url: formData.bodyPhotoUrl,
        body_photo_front: formData.bodyPhotoFront,
        body_photo_back: formData.bodyPhotoBack,
        body_photo_left: formData.bodyPhotoLeft,
        body_photo_right: formData.bodyPhotoRight,
        shoulder_width: formData.shoulderWidth,
        chest_circumference: formData.chestCircumference,
        waist_circumference: formData.waistCircumference,
        hip_circumference: formData.hipCircumference,
        inseam: formData.inseam,
        arm_length: formData.armLength,
        neck_circumference: formData.neckCircumference,
        torso_length: formData.torsoLength,
      });
      
      const result = await updateUserProfile(user.id, {
        username: formData.username,
        bio: formData.bio,
        height: formData.height,
        body_type: formData.bodyType,
        body_photo_url: formData.bodyPhotoUrl || formData.bodyPhotoFront,
        body_photo_front: formData.bodyPhotoFront,
        body_photo_back: formData.bodyPhotoBack,
        body_photo_left: formData.bodyPhotoLeft,
        body_photo_right: formData.bodyPhotoRight,
        shoulder_width: formData.shoulderWidth,
        chest_circumference: formData.chestCircumference,
        waist_circumference: formData.waistCircumference,
        hip_circumference: formData.hipCircumference,
        inseam: formData.inseam,
        arm_length: formData.armLength,
        neck_circumference: formData.neckCircumference,
        torso_length: formData.torsoLength,
      });
      
      console.log('✅ Profile saved:', result);
      alert('✅ Profile updated successfully!');
      
      // Refresh the profile in AuthContext so it's available everywhere
      if (refreshUserProfile) {
        await refreshUserProfile();
      }
      
      await loadProfile();
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      alert('Failed to update profile: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = () => {
    try {
      console.log('🎨 Saving preferences:', preferences);
      localStorage.setItem('snapfit_preferences', JSON.stringify(preferences));
      console.log('✅ Preferences saved to localStorage');
      // Persist to backend so preferences sync across devices
      (async () => {
        try {
          if (user) {
            await updateUserProfile(user.id, { style_preferences: preferences });
            console.log('✅ Preferences persisted to backend');
          }
        } catch (err) {
          console.error('❌ Failed to persist preferences to backend:', err);
        }
      })();

      // Dispatch a global event so other components (Home) can refresh without reload
      try {
        window.dispatchEvent(new CustomEvent('snapfit_prefs_updated', { detail: preferences }));
      } catch (e) {
        console.warn('Could not dispatch prefs update event', e);
      }

      // Small toast confirmation instead of blocking alert
      setToast({ type: 'success', message: 'Preferences saved — hero updated' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('❌ Error saving preferences:', error);
      alert('Failed to save preferences: ' + error.message);
    }
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
      navigate('/login');
    }
  };

  if (!user) {
    return (
      <div className="sf-card sf-fade-in">
        <p>Please log in to access settings.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="sf-card sf-fade-in">Loading settings...</div>;
  }

  return (
    <div className="settings-page sf-fade-in">
      <div className="settings-header">
        <h2 className="sf-title-lg">⚙️ Settings</h2>
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profile
        </button>
        <button
          className={`settings-tab ${activeTab === 'silhouette' ? 'active' : ''}`}
          onClick={() => setActiveTab('silhouette')}
        >
          🧍 Body Silhouette
        </button>
        <button
          className={`settings-tab ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          🎨 Preferences
        </button>
        <button
          className={`settings-tab ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          🔒 Account
        </button>
        {isFounder(user) && (
          <button
            className={`settings-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => navigate('/admin')}
            style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              color: 'white',
              border: 'none'
            }}
          >
            🛡️ Admin Panel
          </button>
        )}
      </div>

      <div className="settings-content">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <section className="settings-section" aria-labelledby="settings-profile-heading">
            <h3 id="settings-profile-heading">Profile Information</h3>
            <p className="sf-subtitle">Manage your public profile details</p>

            <form className="settings-form" onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} aria-describedby="profile-help">
              <p id="profile-help" className="sf-sr-only">Update your username and bio. Changes are saved to your profile.</p>

              <fieldset className="form-field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Choose a username"
                  aria-required="true"
                />
              </fieldset>

              <fieldset className="form-field">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about your style..."
                  rows={4}
                />
              </fieldset>

              <div className="settings-actions">
                <button
                  className="sf-btn sf-btn-primary"
                  type="submit"
                  disabled={saving}
                  aria-disabled={saving}
                >
                  {saving ? 'Saving...' : '💾 Save Profile'}
                </button>
                <button
                  type="button"
                  className="sf-btn sf-btn-outline"
                  onClick={() => { setFormData(prev => ({ ...prev, username: profile?.username || '', bio: profile?.bio || '' })); }}
                >
                  Reset
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Body Silhouette Tab */}
        {activeTab === 'silhouette' && (
          <section className="settings-section" aria-labelledby="settings-silhouette-heading">
            <h3 id="settings-silhouette-heading">Body Silhouette & Virtual Fitting Room</h3>
            <p className="sf-subtitle">Upload full-body photos from multiple angles for the best virtual fitting experience</p>

            {/* Multi-Angle Photo Guide */}
            <div className="multi-angle-guide" role="region" aria-label="Photo guide" style={{
              background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              border: '1px solid #d1d9e6'
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#1a1a1a' }}>📸 Photo Guide for Best Results</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div className="guide-item">
                  <span style={{ fontSize: '24px' }}>👕</span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Wear minimal clothing (underwear, swimsuit, or tight base layers)</p>
                </div>
                <div className="guide-item">
                  <span style={{ fontSize: '24px' }}>🧍</span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Stand straight with arms slightly away from body</p>
                </div>
                <div className="guide-item">
                  <span style={{ fontSize: '24px' }}>💡</span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Use good, even lighting with plain background</p>
                </div>
                <div className="guide-item">
                  <span style={{ fontSize: '24px' }}>✨</span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Background will be automatically removed</p>
                </div>
              </div>
            </div>

            {/* Multi-Angle Photo Upload Grid */}
            <div className="multi-angle-photos" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {/* Front View */}
              <div className="angle-photo-card" style={{
                background: 'white',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: formData.bodyPhotoFront ? '2px solid #10b981' : '2px dashed #d1d5db',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '20px' }}>👤</span>
                  <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Front View</h5>
                  {formData.bodyPhotoFront && <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>}
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#f59e0b', fontWeight: '600' }}>REQUIRED</span>
                </div>
                {formData.bodyPhotoFront ? (
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={formData.bodyPhotoFront} 
                      alt="Front view" 
                      style={{ 
                        width: '100%', 
                        height: '200px', 
                        objectFit: 'contain',
                        borderRadius: '8px',
                        background: '#f5f5f5'
                      }} 
                    />
                    <button
                      onClick={() => setFormData({ ...formData, bodyPhotoFront: '', bodyPhotoUrl: '' })}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >×</button>
                  </div>
                ) : (
                  <div style={{ 
                    height: '200px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: '#f9fafb',
                    borderRadius: '8px'
                  }}>
                    <span style={{ fontSize: '48px', opacity: 0.3 }}>👤</span>
                  </div>
                )}
                <label className="sf-btn sf-btn-outline" style={{ 
                  width: '100%', 
                  marginTop: '12px',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleMultiAnglePhotoUpload(e, 'front')}
                    style={{ display: 'none' }}
                    disabled={uploadingAngle === 'front'}
                  />
                  {uploadingAngle === 'front' ? '⏳ Uploading...' : formData.bodyPhotoFront ? '📷 Change' : '📸 Upload Front'}
                </label>
              </div>

              {/* Back View */}
              <div className="angle-photo-card" style={{
                background: 'white',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: formData.bodyPhotoBack ? '2px solid #10b981' : '2px dashed #d1d5db',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '20px' }}>🔄</span>
                  <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Back View</h5>
                  {formData.bodyPhotoBack && <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>}
                </div>
                {formData.bodyPhotoBack ? (
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={formData.bodyPhotoBack} 
                      alt="Back view" 
                      style={{ 
                        width: '100%', 
                        height: '200px', 
                        objectFit: 'contain',
                        borderRadius: '8px',
                        background: '#f5f5f5'
                      }} 
                    />
                    <button
                      onClick={() => setFormData({ ...formData, bodyPhotoBack: '' })}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >×</button>
                  </div>
                ) : (
                  <div style={{ 
                    height: '200px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: '#f9fafb',
                    borderRadius: '8px'
                  }}>
                    <span style={{ fontSize: '48px', opacity: 0.3 }}>🔄</span>
                  </div>
                )}
                <label className="sf-btn sf-btn-outline" style={{ 
                  width: '100%', 
                  marginTop: '12px',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleMultiAnglePhotoUpload(e, 'back')}
                    style={{ display: 'none' }}
                    disabled={uploadingAngle === 'back'}
                  />
                  {uploadingAngle === 'back' ? '⏳ Uploading...' : formData.bodyPhotoBack ? '📷 Change' : '📸 Upload Back'}
                </label>
              </div>

              {/* Left View */}
              <div className="angle-photo-card" style={{
                background: 'white',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: formData.bodyPhotoLeft ? '2px solid #10b981' : '2px dashed #d1d5db',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '20px' }}>⬅️</span>
                  <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Left Side</h5>
                  {formData.bodyPhotoLeft && <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>}
                </div>
                {formData.bodyPhotoLeft ? (
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={formData.bodyPhotoLeft} 
                      alt="Left view" 
                      style={{ 
                        width: '100%', 
                        height: '200px', 
                        objectFit: 'contain',
                        borderRadius: '8px',
                        background: '#f5f5f5'
                      }} 
                    />
                    <button
                      onClick={() => setFormData({ ...formData, bodyPhotoLeft: '' })}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >×</button>
                  </div>
                ) : (
                  <div style={{ 
                    height: '200px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: '#f9fafb',
                    borderRadius: '8px'
                  }}>
                    <span style={{ fontSize: '48px', opacity: 0.3 }}>⬅️</span>
                  </div>
                )}
                <label className="sf-btn sf-btn-outline" style={{ 
                  width: '100%', 
                  marginTop: '12px',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleMultiAnglePhotoUpload(e, 'left')}
                    style={{ display: 'none' }}
                    disabled={uploadingAngle === 'left'}
                  />
                  {uploadingAngle === 'left' ? '⏳ Uploading...' : formData.bodyPhotoLeft ? '📷 Change' : '📸 Upload Left'}
                </label>
              </div>

              {/* Right View */}
              <div className="angle-photo-card" style={{
                background: 'white',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: formData.bodyPhotoRight ? '2px solid #10b981' : '2px dashed #d1d5db',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '20px' }}>➡️</span>
                  <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Right Side</h5>
                  {formData.bodyPhotoRight && <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>}
                </div>
                {formData.bodyPhotoRight ? (
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={formData.bodyPhotoRight} 
                      alt="Right view" 
                      style={{ 
                        width: '100%', 
                        height: '200px', 
                        objectFit: 'contain',
                        borderRadius: '8px',
                        background: '#f5f5f5'
                      }} 
                    />
                    <button
                      onClick={() => setFormData({ ...formData, bodyPhotoRight: '' })}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >×</button>
                  </div>
                ) : (
                  <div style={{ 
                    height: '200px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: '#f9fafb',
                    borderRadius: '8px'
                  }}>
                    <span style={{ fontSize: '48px', opacity: 0.3 }}>➡️</span>
                  </div>
                )}
                <label className="sf-btn sf-btn-outline" style={{ 
                  width: '100%', 
                  marginTop: '12px',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleMultiAnglePhotoUpload(e, 'right')}
                    style={{ display: 'none' }}
                    disabled={uploadingAngle === 'right'}
                  />
                  {uploadingAngle === 'right' ? '⏳ Uploading...' : formData.bodyPhotoRight ? '📷 Change' : '📸 Upload Right'}
                </label>
              </div>
            </div>

            {/* Completion Status */}
            <div style={{
              background: (formData.bodyPhotoFront && formData.bodyPhotoBack && formData.bodyPhotoLeft && formData.bodyPhotoRight) 
                ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' 
                : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              {(formData.bodyPhotoFront && formData.bodyPhotoBack && formData.bodyPhotoLeft && formData.bodyPhotoRight) ? (
                <>
                  <span style={{ fontSize: '24px' }}>🎉</span>
                  <p style={{ margin: '8px 0 0 0', fontWeight: '600', color: '#065f46' }}>
                    All angles uploaded! Your Virtual Fitting Room is optimized for 360° viewing.
                  </p>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '24px' }}>📸</span>
                  <p style={{ margin: '8px 0 0 0', fontWeight: '500', color: '#92400e' }}>
                    {formData.bodyPhotoFront ? (
                      `${[formData.bodyPhotoFront, formData.bodyPhotoBack, formData.bodyPhotoLeft, formData.bodyPhotoRight].filter(Boolean).length}/4 angles uploaded. Add more for better 360° experience!`
                    ) : (
                      'Upload at least your Front view to use the Virtual Fitting Room'
                    )}
                  </p>
                </>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="height">Height</label>
              <input
                id="height"
                type="text"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                placeholder="e.g., 5'10&quot; or 178cm"
              />
              <small className="field-hint">Optional but helps with outfit recommendations</small>
            </div>

            <div className="form-field">
              <label htmlFor="bodyType">Body Type</label>
              <select
                id="bodyType"
                value={formData.bodyType}
                onChange={(e) => setFormData({ ...formData, bodyType: e.target.value })}
              >
                <option value="slim">Slim</option>
                <option value="average">Average</option>
                <option value="athletic">Athletic</option>
                <option value="curvy">Curvy</option>
                <option value="plus">Plus Size</option>
              </select>
              <small className="field-hint">Helps AI generate better outfit recommendations</small>
            </div>

            <hr style={{ margin: '32px 0', border: 'none', borderTop: '2px solid #e5e7eb' }} />

            <h4>📏 Detailed Body Measurements</h4>
            <p className="sf-subtitle">Add precise measurements for a more accurate virtual fit</p>

            <div className="measurements-grid">
              <div className="form-field">
                <label htmlFor="shoulderWidth">Shoulder Width <span className="required">*</span></label>
                <input
                  id="shoulderWidth"
                  type="text"
                  value={formData.shoulderWidth}
                  onChange={(e) => setFormData({ ...formData, shoulderWidth: e.target.value })}
                  placeholder="e.g., 18in or 45cm"
                />
                <small className="field-hint">📐 Improves sleeve alignment and shirt drape</small>
              </div>

              <div className="form-field">
                <label htmlFor="chestCircumference">Chest Circumference <span className="required">*</span></label>
                <input
                  id="chestCircumference"
                  type="text"
                  value={formData.chestCircumference}
                  onChange={(e) => setFormData({ ...formData, chestCircumference: e.target.value })}
                  placeholder="e.g., 38in or 96cm"
                />
                <small className="field-hint">👔 Better fit for t-shirts, hoodies, jackets</small>
              </div>

              <div className="form-field">
                <label htmlFor="waistCircumference">Waist Circumference <span className="required">*</span></label>
                <input
                  id="waistCircumference"
                  type="text"
                  value={formData.waistCircumference}
                  onChange={(e) => setFormData({ ...formData, waistCircumference: e.target.value })}
                  placeholder="e.g., 32in or 81cm"
                />
                <small className="field-hint">👖 Accurate pants and shirt length/taper</small>
              </div>

              <div className="form-field">
                <label htmlFor="hipCircumference">Hip Circumference <span className="required">*</span></label>
                <input
                  id="hipCircumference"
                  type="text"
                  value={formData.hipCircumference}
                  onChange={(e) => setFormData({ ...formData, hipCircumference: e.target.value })}
                  placeholder="e.g., 40in or 101cm"
                />
                <small className="field-hint">👗 Essential for pants and skirts</small>
              </div>

              <div className="form-field">
                <label htmlFor="inseam">Inseam / Leg Length</label>
                <input
                  id="inseam"
                  type="text"
                  value={formData.inseam}
                  onChange={(e) => setFormData({ ...formData, inseam: e.target.value })}
                  placeholder="e.g., 32in or 81cm"
                />
                <small className="field-hint">👖 Perfect pant leg length</small>
              </div>

              <div className="form-field">
                <label htmlFor="armLength">Arm Length</label>
                <input
                  id="armLength"
                  type="text"
                  value={formData.armLength}
                  onChange={(e) => setFormData({ ...formData, armLength: e.target.value })}
                  placeholder="e.g., 24in or 61cm"
                />
                <small className="field-hint">👔 Sleeve end positioning</small>
              </div>

              <div className="form-field">
                <label htmlFor="neckCircumference">Neck Circumference</label>
                <input
                  id="neckCircumference"
                  type="text"
                  value={formData.neckCircumference}
                  onChange={(e) => setFormData({ ...formData, neckCircumference: e.target.value })}
                  placeholder="e.g., 15in or 38cm"
                />
                <small className="field-hint">👔 Collar and hoodie fit</small>
              </div>

              <div className="form-field">
                <label htmlFor="torsoLength">Torso Length</label>
                <input
                  id="torsoLength"
                  type="text"
                  value={formData.torsoLength}
                  onChange={(e) => setFormData({ ...formData, torsoLength: e.target.value })}
                  placeholder="e.g., 26in or 66cm"
                />
                <small className="field-hint">👕 Crop tops, jackets, tucked items</small>
              </div>
            </div>

            <div className="measurement-tips">
              <h5>📝 Measurement Tips:</h5>
              <ul>
                <li><strong>Required (*) measurements</strong> give the best fit results</li>
                <li>Use a fabric tape measure for accuracy</li>
                <li>Measure over light clothing for most accurate results</li>
                <li>Shoulder width: Measure from one shoulder point to the other across your back</li>
                <li>Circumferences: Measure around the fullest part of each area</li>
                <li>Torso length: From shoulder to natural waist</li>
              </ul>
            </div>

            <button
              className="sf-btn sf-btn-primary"
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? 'Saving...' : '💾 Save Settings'}
            </button>
          </section>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <section className="settings-section" aria-labelledby="settings-preferences-heading">
            <h3 id="settings-preferences-heading">App Preferences</h3>
            <p className="sf-subtitle">Customize your SnapFit experience</p>
            
            {/* Privacy Mode Section */}
            <div className="privacy-mode-section" role="region" aria-label="Privacy and data control">
              <div className="privacy-mode-header">
                <h4>🔒 Privacy & Data Control</h4>
                <p className="privacy-subtitle">Control what features are enabled and what data is tracked</p>
              </div>

              <div className="privacy-options">
                <div className="privacy-option">
                  <div className="privacy-option-header">
                    <input
                      type="checkbox"
                      id="enableFitScoring"
                      checked={preferences.enableFitScoring}
                      onChange={(e) => {
                        console.log('🎯 AI Fit Scoring:', e.target.checked ? 'ON' : 'OFF');
                        setPreferences({ ...preferences, enableFitScoring: e.target.checked });
                      }}
                    />
                    <label htmlFor="enableFitScoring">
                      <strong>AI Fit Scoring</strong>
                    </label>
                  </div>
                  <p className="privacy-option-desc">
                    Show AI-powered fit scores in Virtual Fitting Room (0-100% ratings)
                  </p>
                </div>

                <div className="privacy-option">
                  <div className="privacy-option-header">
                    <input
                      type="checkbox"
                      id="enableAnalytics"
                      checked={preferences.enableAnalytics}
                      onChange={(e) => {
                        console.log('📊 Style Analytics:', e.target.checked ? 'ON' : 'OFF');
                        setPreferences({ ...preferences, enableAnalytics: e.target.checked });
                      }}
                    />
                    <label htmlFor="enableAnalytics">
                      <strong>Style Analytics Dashboard</strong>
                    </label>
                  </div>
                  <p className="privacy-option-desc">
                    Access your style insights, metrics, and performance data
                  </p>
                </div>

                <div className="privacy-option">
                  <div className="privacy-option-header">
                    <input
                      type="checkbox"
                      id="enableSocialFeatures"
                      checked={preferences.enableSocialFeatures}
                      onChange={(e) => {
                        console.log('👥 Social Features:', e.target.checked ? 'ON' : 'OFF');
                        setPreferences({ ...preferences, enableSocialFeatures: e.target.checked });
                      }}
                    />
                    <label htmlFor="enableSocialFeatures">
                      <strong>Social Features</strong>
                    </label>
                  </div>
                  <p className="privacy-option-desc">
                    Enable Explore feed, likes, comments, and sharing (can still keep outfits private)
                  </p>
                </div>

                <div className="privacy-option">
                  <div className="privacy-option-header">
                    <input
                      type="checkbox"
                      id="trackUsageData"
                      checked={preferences.trackUsageData}
                      onChange={(e) => {
                        console.log('📈 Usage Data Tracking:', e.target.checked ? 'ON' : 'OFF');
                        setPreferences({ ...preferences, trackUsageData: e.target.checked });
                      }}
                    />
                    <label htmlFor="trackUsageData">
                      <strong>Usage Data Tracking</strong>
                    </label>
                  </div>
                  <p className="privacy-option-desc">
                    Track try-ons, views, and worn dates for personal insights (stored locally)
                  </p>
                </div>

                <div className="privacy-option">
                  <div className="privacy-option-header">
                    <input
                      type="checkbox"
                      id="showRecommendations"
                      checked={preferences.showRecommendations}
                      onChange={(e) => {
                        console.log('🤖 AI Recommendations:', e.target.checked ? 'ON' : 'OFF');
                        setPreferences({ ...preferences, showRecommendations: e.target.checked });
                      }}
                    />
                    <label htmlFor="showRecommendations">
                      <strong>AI Recommendations</strong>
                    </label>
                  </div>
                  <p className="privacy-option-desc">
                    Show AI-powered outfit suggestions and style tips
                  </p>
                </div>
              </div>

              <div className="privacy-mode-presets">
                <p><strong>Quick Presets:</strong></p>
                <div className="preset-buttons">
                  <button
                    className="preset-btn"
                    onClick={() => {
                      console.log('🔒 Setting Private Mode preset');
                      setPreferences({
                        ...preferences,
                        enableFitScoring: false,
                        enableAnalytics: false,
                        enableSocialFeatures: false,
                        trackUsageData: false,
                        showRecommendations: false,
                      });
                    }}
                  >
                    🔒 Private Mode (All Off)
                  </button>
                  <button
                    className="preset-btn"
                    onClick={() => {
                      console.log('🎯 Setting Personal Mode preset');
                      setPreferences({
                        ...preferences,
                        enableFitScoring: true,
                        enableAnalytics: true,
                        enableSocialFeatures: false,
                        trackUsageData: true,
                        showRecommendations: true,
                      });
                    }}
                  >
                    🎯 Personal Mode (No Social)
                  </button>
                  <button
                    className="preset-btn"
                    onClick={() => {
                      console.log('✨ Setting Full Experience preset');
                      setPreferences({
                        ...preferences,
                        enableFitScoring: true,
                        enableAnalytics: true,
                        enableSocialFeatures: true,
                        trackUsageData: true,
                        showRecommendations: true,
                      });
                    }}
                  >
                    ✨ Full Experience (All On)
                  </button>
                </div>
              </div>
            </div>

            <hr style={{ margin: '32px 0', border: 'none', borderTop: '2px solid #e5e7eb' }} />

            {/* Display Preferences */}
            <h4>🎨 Display Preferences</h4>
            
            <div className="form-field">
              <label htmlFor="fittingRoomBg">Virtual Fitting Room Background</label>
              <select
                id="fittingRoomBg"
                value={preferences.fittingRoomBackground}
                onChange={(e) => {
                  console.log('🎨 VFR Background changed to:', e.target.value);
                  setPreferences({ ...preferences, fittingRoomBackground: e.target.value });
                }}
              >
                <option value="neutral">Neutral Gray</option>
                <option value="studio">Photo Studio</option>
                <option value="bedroom">Bedroom</option>
                <option value="beach">Beach</option>
                <option value="woods">Woods</option>
                <option value="city">City</option>
                <option value="closet">Walk-in Closet</option>
                <option value="mirror">Full Mirror</option>
                <option value="outdoor">Outdoor Scene</option>
              </select>
              <small className="field-hint">Choose a background for the virtual fitting room</small>
            </div>

            {/* Admin-only: Force onboarding card in hero (overrides video) */}
            {isAdmin(user) && (
              <div className="form-field checkbox-field" style={{ marginTop: 12 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!preferences.forceOnboarding}
                    onChange={(e) => setPreferences({ ...preferences, forceOnboarding: e.target.checked })}
                  />
                  <span style={{ marginLeft: 8 }}><strong>Force show Get Started card in hero</strong></span>
                </label>
                <small className="field-hint">Admin-only: when enabled the onboarding card will display in the home hero area instead of any promo video.</small>
              </div>
            )}

            <div className="form-field">
              <label htmlFor="defaultPrivacy">Default Outfit Privacy</label>
              <select
                id="defaultPrivacy"
                value={preferences.defaultPrivacy}
                onChange={(e) => {
                  console.log('🔒 Default Privacy changed to:', e.target.value);
                  setPreferences({ ...preferences, defaultPrivacy: e.target.value });
                }}
              >
                <option value="private">Private (Only me)</option>
                <option value="public">Public (Everyone can see)</option>
              </select>
              <small className="field-hint">Default privacy setting when creating outfits</small>
            </div>

            <div className="form-field checkbox-field">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.notifications}
                  onChange={(e) => {
                    console.log('🔔 Notifications:', e.target.checked ? 'ON' : 'OFF');
                    setPreferences({ ...preferences, notifications: e.target.checked });
                  }}
                />
                <span>Enable notifications</span>
              </label>
              <small className="field-hint">Get notified about likes and comments</small>
            </div>

            <button
              className="sf-btn sf-btn-primary"
              onClick={handleSavePreferences}
              aria-label="Save preferences"
            >
              💾 Save Preferences
            </button>
            {toast && (
              <div className={`settings-toast settings-toast-${toast.type}`} role="status" aria-live="polite" style={{ position: 'fixed', right: 20, top: 80, zIndex: 9999, background: toast.type === 'success' ? '#10b981' : '#ef4444', color: '#fff', padding: '10px 16px', borderRadius: 8, boxShadow: '0 6px 20px rgba(2,6,23,0.2)' }}>
                {toast.message}
              </div>
            )}
          </section>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <section className="settings-section" aria-labelledby="settings-account-heading">
            <h3 id="settings-account-heading">Account Settings</h3>
            <p className="sf-subtitle">Manage your account and security</p>
            
            <div className="account-info">
              <div className="info-row">
                <strong>Email:</strong>
                <span>{user.email}</span>
              </div>
              <div className="info-row">
                <strong>Account created:</strong>
                <span>{new Date(user.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="danger-zone" role="region" aria-label="Account actions and danger zone">
              <h4>⚠️ Danger Zone</h4>
              <button
                className="sf-btn sf-btn-outline danger"
                onClick={handleSignOut}
              >
                🚪 Sign Out
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
