/**
 * User Profile CRUD Operations
 * Calls the Express backend API
 */

import { apiGet, apiPut } from '../api-client';

/**
 * Create or update user profile
 * Call this after Supabase auth to sync user data
 * @param {string} supabaseUid - Supabase user ID (not needed, backend gets from token)
 * @param {Object} userData - User profile data
 * @returns {Object} User profile
 */
export async function upsertUserProfile(supabaseUid, userData) {
  try {
    return await apiPut('/users/me', userData);
  } catch (error) {
    console.error('Error upserting user profile:', error);
    throw error;
  }
}

/**
 * Get user profile by Supabase UID
 * @param {string} supabaseUid - Supabase user ID (not needed, backend gets from token)
 * @returns {Object|null} User profile
 */
export async function getUserProfile(supabaseUid) {
  try {
    return await apiGet('/users/me');
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Update user profile
 * @param {string} supabaseUid - Supabase user ID (not needed, backend gets from token)
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated profile
 */
export async function updateUserProfile(supabaseUid, updates) {
  try {
    return await apiPut('/users/me', updates);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Update user style preferences
 * @param {string} supabaseUid - Supabase user ID
 * @param {Object} preferences - Style preferences object
 * @returns {Object} Updated profile
 */
export async function updateStylePreferences(supabaseUid, preferences) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const result = await collection.findOneAndUpdate(
      { supabase_uid: supabaseUid },
      {
        $set: {
          style_preferences: preferences,
          updated_at: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return result.value;
  } catch (error) {
    console.error('Error updating style preferences:', error);
    throw error;
  }
}

/**
 * Delete user profile
 * @param {string} supabaseUid - Supabase user ID (not needed, backend gets from token)
 * @returns {boolean} Success status
 */
export async function deleteUserProfile(supabaseUid) {
  try {
    // Note: This would need a DELETE /users/me endpoint on the server
    console.warn('Delete user profile not yet implemented on backend');
    return false;
  } catch (error) {
    console.error('Error deleting user profile:', error);
    throw error;
  }
}

/**
 * Get public user profile by username
 * @param {string} username - Username to look up
 * @returns {Object|null} Public user profile
 */
export async function getUserByUsername(username) {
  try {
    return await apiGet(`/users/${username}`);
  } catch (error) {
    console.error('Error fetching user by username:', error);
    throw error;
  }
}

/**
 * Check if username is available
 * @param {string} username - Username to check
 * @returns {Object} {available: boolean, reason: string|null}
 */
export async function checkUsernameAvailability(username) {
  try {
    return await apiGet(`/users/check-username/${username}`);
  } catch (error) {
    console.error('Error checking username:', error);
    throw error;
  }
}
