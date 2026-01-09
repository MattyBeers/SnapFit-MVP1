import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, updateUserProfile } from "../lib/api/users";
import { uploadImage } from "../lib/storage";

export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    height: '',
    bodyType: 'average',
    bodyPhotoUrl: '',
  });

  const isOwnProfile = user && (!username || username === user.user_metadata?.username);

  useEffect(() => {
    if (isOwnProfile && user) {
      loadProfile();
    }
  }, [user, username]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await getUserProfile();
      setProfile(data);
      setFormData({
        username: data.username || '',
        bio: data.bio || '',
        height: data.height || '',
        bodyType: data.body_type || 'average',
        bodyPhotoUrl: data.body_photo_url || '',
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBodyPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file, user.id, 'body-photos');
      setFormData({ ...formData, bodyPhotoUrl: url });
    } catch (error) {
      console.error('Error uploading body photo:', error);
      alert('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateUserProfile({
        username: formData.username,
        bio: formData.bio,
        height: formData.height,
        body_type: formData.bodyType,
        body_photo_url: formData.bodyPhotoUrl,
      });
      alert('✅ Profile updated!');
      setEditing(false);
      loadProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    }
  };

  if (!user) {
    return (
      <div className="sf-card sf-fade-in">
        <p>Please log in to view your profile.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="sf-card sf-fade-in">Loading profile...</div>;
  }

  return (
    <div className="profile-page sf-fade-in">
      <div className="profile-header">
        <h2 className="sf-title-lg">My Profile</h2>
        {!editing && (
          <button className="sf-btn sf-btn-outline" onClick={() => setEditing(true)}>
            Edit Profile
          </button>
        )}
      </div>

      <div className="profile-content">
        {/* Body Photo Section */}
        <div className="profile-section">
          <h3>Virtual Fitting Room Settings</h3>
          <p className="sf-subtitle">Upload a full-body photo to try on outfits virtually</p>
          
          <div className="body-photo-section">
            {formData.bodyPhotoUrl ? (
              <div className="body-photo-preview">
                <img src={formData.bodyPhotoUrl} alt="Body reference" />
                {editing && (
                  <button
                    className="remove-photo-btn"
                    onClick={() => setFormData({ ...formData, bodyPhotoUrl: '' })}
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            ) : (
              <div className="body-photo-placeholder">
                <span className="placeholder-icon">🧍</span>
                <p>No body photo uploaded</p>
                {editing && (
                  <label className="upload-photo-btn">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBodyPhotoUpload}
                      style={{ display: 'none' }}
                      disabled={uploading}
                    />
                    {uploading ? 'Uploading...' : '📸 Upload Photo'}
                  </label>
                )}
              </div>
            )}
          </div>

          {editing && (
            <>
              <div className="form-field">
                <label htmlFor="height">Height (optional)</label>
                <input
                  id="height"
                  type="text"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  placeholder="e.g., 5'10&quot; or 178cm"
                />
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
              </div>
            </>
          )}
        </div>

        {/* Basic Info Section */}
        <div className="profile-section">
          <h3>Basic Information</h3>
          
          <div className="form-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              disabled={!editing}
            />
          </div>

          <div className="form-field">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about your style..."
              rows="4"
              disabled={!editing}
            />
          </div>
        </div>

        {editing && (
          <div className="profile-actions">
            <button className="sf-btn sf-btn-outline" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button className="sf-btn sf-btn-primary" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        )}
      </div>

      <style>{`
        .profile-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .profile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .profile-content {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .profile-section {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .profile-section h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
        }

        .body-photo-section {
          margin-top: 20px;
        }

        .body-photo-preview {
          position: relative;
          max-width: 300px;
          margin: 0 auto;
        }

        .body-photo-preview img {
          width: 100%;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .remove-photo-btn {
          margin-top: 12px;
          width: 100%;
          padding: 8px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .body-photo-placeholder {
          text-align: center;
          padding: 60px 20px;
          border: 2px dashed #e0e0e0;
          border-radius: 12px;
        }

        .placeholder-icon {
          font-size: 64px;
          display: block;
          margin-bottom: 16px;
        }

        .upload-photo-btn {
          display: inline-block;
          margin-top: 16px;
          padding: 12px 24px;
          background: var(--sf-primary, #0b6bdc);
          color: white;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }

        .upload-photo-btn:hover {
          opacity: 0.9;
        }

        .form-field {
          margin-top: 20px;
        }

        .form-field label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: var(--sf-text, #1a1a1a);
        }

        .form-field input,
        .form-field textarea,
        .form-field select {
          width: 100%;
          padding: 12px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 16px;
        }

        .form-field input:disabled,
        .form-field textarea:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .profile-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding-top: 20px;
        }
      `}</style>
    </div>
  );
}
