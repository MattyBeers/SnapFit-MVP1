/**
 * API Configuration and Utilities
 * Centralized API calling with authentication
 */

import { supabase } from './supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Cache the session to avoid repeated getSession calls that can hang
let cachedSession = null;
let sessionPromise = null;

// Listen for auth state changes to update cache
supabase.auth.onAuthStateChange((event, session) => {
  cachedSession = session;
  sessionPromise = null; // Clear any pending promise
});

/**
 * Get the current Supabase session token with timeout protection
 * @returns {Promise<string|null>} Access token or null
 */
async function getAuthToken() {
  try {
    // Check if cached session is still valid (not expired)
    if (cachedSession?.access_token && cachedSession?.expires_at) {
      const expiresAt = cachedSession.expires_at * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      
      // If token expires in more than 5 minutes, use cached
      if (timeUntilExpiry > 5 * 60 * 1000) {
        console.log('🔑 Using cached auth token');
        return cachedSession.access_token;
      }
      
      // If token is about to expire, refresh it
      console.log('♻️ Token expiring soon, refreshing...');
    }

    // Prevent multiple simultaneous getSession calls
    if (!sessionPromise) {
      // Add timeout protection
      sessionPromise = Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
        )
      ]);
    }

    const { data: { session }, error } = await sessionPromise;
    sessionPromise = null;
    
    if (error) {
      console.error('❌ Authentication error:', error);
      cachedSession = null;
      return null;
    }
    
    if (!session) {
      console.error('❌ No active session found');
      cachedSession = null;
      return null;
    }
    
    cachedSession = session;
    console.log('✅ Auth token retrieved');
    return session.access_token;
  } catch (error) {
    console.error('❌ Authentication error:', error);
    sessionPromise = null;
    cachedSession = null;
    return null;
  }
}

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/closet')
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} Response data
 */
export async function apiRequest(endpoint, options = {}) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * GET request
 */
export async function apiGet(endpoint) {
  return apiRequest(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
export async function apiPost(endpoint, data) {
  return apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PUT request
 */
export async function apiPut(endpoint, data) {
  return apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request
 */
export async function apiDelete(endpoint) {
  return apiRequest(endpoint, { method: 'DELETE' });
}
