/**
 * Admin Panel - Manage admins and moderation (Founder only)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isFounder, isAdmin, getAllAdmins, addAdmin, removeAdmin } from '../lib/adminUtils';

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    // Redirect if not founder
    if (!user || !isFounder(user)) {
      navigate('/');
      return;
    }
    
    loadAdmins();
  }, [user, navigate]);

  const loadAdmins = () => {
    const currentAdmins = getAllAdmins();
    setAdmins(currentAdmins);
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      // In a real app, this would search the user database
      // For now, we'll simulate with a mock search
      // You can integrate with your actual user search API
      
      // Mock search - replace with actual API call
      setTimeout(() => {
        setSearchResults([
          // This would come from your user database
          // Example: { id: '123', username: 'testuser', email: 'test@example.com' }
        ]);
        setSearching(false);
      }, 500);
      
    } catch (error) {
      console.error('Error searching users:', error);
      setSearching(false);
    }
  };

  const handleAddAdmin = (userToAdd) => {
    const result = addAdmin(user, userToAdd);
    
    if (result.success) {
      loadAdmins();
      setSearchQuery('');
      setSearchResults([]);
      alert(`✅ ${result.message}`);
    } else {
      alert(`❌ ${result.message}`);
    }
  };

  const handleRemoveAdmin = (adminId) => {
    if (!confirm('Remove this admin? They will lose all admin privileges.')) {
      return;
    }
    
    const result = removeAdmin(user, adminId);
    
    if (result.success) {
      loadAdmins();
      alert(`✅ ${result.message}`);
    } else {
      alert(`❌ ${result.message}`);
    }
  };

  const handleAddByUsername = () => {
    const username = prompt('Enter username to add as admin:');
    if (!username) return;
    
    // In production, fetch user from database by username
    // For now, create a mock user object
    const mockUser = {
      id: Date.now().toString(),
      username: username.trim(),
      email: `${username.trim()}@example.com`
    };
    
    handleAddAdmin(mockUser);
  };

  if (!user || !isFounder(user)) {
    return null;
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div>
          <h1>🛡️ Admin Panel</h1>
          <p className="admin-subtitle">Manage administrators and team members</p>
        </div>
        <div className="founder-badge">
          👑 Founder
        </div>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-value">{admins.length}</span>
          <span className="stat-label">Total Admins</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{admins.filter(a => a.role === 'admin').length}</span>
          <span className="stat-label">Team Members</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">1</span>
          <span className="stat-label">Founder</span>
        </div>
      </div>

      {/* Add Admin Section */}
      <div className="add-admin-section">
        <h2>➕ Add New Admin</h2>
        <p style={{ color: '#6b7280', marginBottom: '16px' }}>
          Grant admin privileges to trusted team members to help manage SnapFit
        </p>
        
        <button
          className="sf-btn sf-btn-primary"
          onClick={handleAddByUsername}
        >
          Add Admin by Username
        </button>
        
        <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '12px' }}>
          💡 Admins can delete any post, moderate content, and help maintain the community
        </p>
      </div>

      {/* Current Admins List */}
      <div className="admins-list-section">
        <h2>👥 Current Administrators</h2>
        
        <div className="admins-grid">
          {admins.map((admin) => (
            <div key={admin.id} className={`admin-card ${admin.role}`}>
              <div className="admin-card-header">
                <div className="admin-avatar">
                  {admin.username?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="admin-info">
                  <div className="admin-username">
                    {admin.username}
                    {admin.role === 'founder' && <span className="founder-crown">👑</span>}
                  </div>
                  <div className="admin-email">{admin.email}</div>
                  <div className="admin-role-badge">
                    {admin.role === 'founder' ? '👑 Founder' : '🛡️ Admin'}
                  </div>
                </div>
              </div>
              
              <div className="admin-card-meta">
                {admin.addedDate && (
                  <div className="admin-added-date">
                    Added: {new Date(admin.addedDate).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              {admin.role !== 'founder' && (
                <div className="admin-card-actions">
                  <button
                    className="remove-admin-btn"
                    onClick={() => handleRemoveAdmin(admin.id)}
                  >
                    Remove Admin
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .admin-panel {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }

        .admin-header h1 {
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 8px 0;
        }

        .admin-subtitle {
          color: #6b7280;
          font-size: 16px;
          margin: 0;
        }

        .founder-badge {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: white;
          padding: 8px 20px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
        }

        .admin-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 32px;
          font-weight: 700;
          color: #667eea;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 13px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .add-admin-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 32px;
        }

        .add-admin-section h2 {
          margin: 0 0 8px 0;
          font-size: 20px;
        }

        .admins-list-section h2 {
          font-size: 20px;
          margin: 0 0 20px 0;
        }

        .admins-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .admin-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s;
        }

        .admin-card.founder {
          border-color: #fbbf24;
          background: linear-gradient(135deg, #fffbeb 0%, white 100%);
        }

        .admin-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }

        .admin-card-header {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }

        .admin-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: 700;
        }

        .admin-card.founder .admin-avatar {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        }

        .admin-info {
          flex: 1;
        }

        .admin-username {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .founder-crown {
          font-size: 20px;
        }

        .admin-email {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .admin-role-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          background: #e0e7ff;
          color: #667eea;
        }

        .admin-card.founder .admin-role-badge {
          background: #fef3c7;
          color: #f59e0b;
        }

        .admin-card-meta {
          padding: 12px 0;
          border-top: 1px solid #f3f4f6;
          margin-top: 12px;
        }

        .admin-added-date {
          font-size: 13px;
          color: #9ca3af;
        }

        .admin-card-actions {
          margin-top: 12px;
        }

        .remove-admin-btn {
          width: 100%;
          padding: 8px 16px;
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .remove-admin-btn:hover {
          background: #fecaca;
          border-color: #dc2626;
        }
      `}</style>
    </div>
  );
}
