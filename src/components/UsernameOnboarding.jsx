/**
 * Username Onboarding
 * Prompts first-time users to choose a unique username
 */

import { useState } from 'react';
import { updateUserProfile, checkUsernameAvailability } from '../lib/api/users';

export default function UsernameOnboarding({ user, onComplete }) {
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const checkUsernameAvailable = async (name) => {
    if (!name || name.length < 3) return false;
    
    try {
      const result = await checkUsernameAvailability(name);
      return result.available;
    } catch (err) {
      console.error('Error checking username:', err);
      return false;
    }
  };

  const handleUsernameChange = async (value) => {
    setUsername(value);
    setError('');

    // Basic validation
    if (value.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    // Check availability
    setChecking(true);
    const available = await checkUsernameAvailable(value);
    setChecking(false);

    if (!available) {
      setError('Username is already taken');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (error || !username) return;

    setLoading(true);
    
    try {
      // Double-check availability
      const available = await checkUsernameAvailable(username);
      
      if (!available) {
        setError('Username is already taken');
        setLoading(false);
        return;
      }

      // Update user profile with username
      await updateUserProfile(user.id, { 
        username: username.toLowerCase() 
      });

      onComplete(username);
    } catch (err) {
      console.error('Error setting username:', err);
      setError('Failed to set username. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="username-onboarding-overlay">
      <div className="username-onboarding-modal">
        <h2>Welcome to SnapFit! 👋</h2>
        <p className="username-onboarding-subtitle">
          Choose a unique username to get started
        </p>

        <form onSubmit={handleSubmit}>
          <div className="username-input-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="johndoe"
              autoComplete="off"
              autoFocus
              maxLength={20}
              disabled={loading}
            />
            {checking && <span className="username-checking">Checking...</span>}
            {error && <span className="username-error">{error}</span>}
            {username && !error && !checking && (
              <span className="username-success">✓ Available</span>
            )}
          </div>

          <button
            type="submit"
            className="sf-btn sf-btn-primary sf-btn-full"
            disabled={loading || checking || !username || !!error}
          >
            {loading ? 'Setting up...' : 'Continue'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .username-onboarding-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 9999;
        }

        .username-onboarding-modal {
          background: var(--sf-surface, #fff);
          border-radius: 16px;
          padding: 32px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        .username-onboarding-modal h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          color: var(--sf-text, #1a1a1a);
        }

        .username-onboarding-subtitle {
          color: var(--sf-muted, #666);
          margin: 0 0 24px 0;
          font-size: 14px;
        }

        .username-input-group {
          margin-bottom: 24px;
        }

        .username-input-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: var(--sf-text, #1a1a1a);
        }

        .username-input-group input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid var(--sf-border, #e0e0e0);
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .username-input-group input:focus {
          outline: none;
          border-color: var(--sf-primary, #0b6bdc);
        }

        .username-input-group input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .username-checking,
        .username-error,
        .username-success {
          display: block;
          margin-top: 6px;
          font-size: 13px;
        }

        .username-checking {
          color: var(--sf-muted, #666);
        }

        .username-error {
          color: #dc2626;
        }

        .username-success {
          color: #16a34a;
        }

        @media (max-width: 480px) {
          .username-onboarding-modal {
            padding: 24px;
          }

          .username-onboarding-modal h2 {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}
