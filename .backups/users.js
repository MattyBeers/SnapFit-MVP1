/**
 * User Profile CRUD Operations
 * Handles user metadata and preferences
 */

import { getDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';

const COLLECTION = 'users';

/**
 * Create or update user profile
 * Call this after Supabase auth to sync user data
 * @param {string} supabaseUid - Supabase user ID
 * @param {Object} userData - User profile data
 * @returns {Object} User profile
 */
export async function upsertUserProfile(supabaseUid, userData) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const userProfile = {
      supabase_uid: supabaseUid,
      email: userData.email || '',
      username: userData.username || userData.email?.split('@')[0] || 'user',
      avatar_url: userData.avatar_url || '',
      bio: userData.bio || '',
      style_preferences: {
        colors: userData.style_preferences?.colors || [],
        occasions: userData.style_preferences?.occasions || [],
        body_type: userData.style_preferences?.body_type || '',
        favorite_brands: userData.style_preferences?.favorite_brands || [],
      },
      settings: {
        is_public: userData.settings?.is_public || false,
        notifications: userData.settings?.notifications || true,
      },
      updated_at: new Date(),
    };

    const result = await collection.findOneAndUpdate(
      { supabase_uid: supabaseUid },
      {
        $set: userProfile,
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true, returnDocument: 'after' }
    );

    return result.value;
  } catch (error) {
    console.error('Error upserting user profile:', error);
    throw error;
  }
}

/**
 * Get user profile by Supabase UID
 * @param {string} supabaseUid - Supabase user ID
 * @returns {Object|null} User profile
 */
export async function getUserProfile(supabaseUid) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const user = await collection.findOne({ supabase_uid: supabaseUid });
    return user;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Update user profile
 * @param {string} supabaseUid - Supabase user ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated profile
 */
export async function updateUserProfile(supabaseUid, updates) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const result = await collection.findOneAndUpdate(
      { supabase_uid: supabaseUid },
      {
        $set: {
          ...updates,
          updated_at: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return result.value;
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
 * Delete user profile (cascade delete closet/outfits separately)
 * @param {string} supabaseUid - Supabase user ID
 * @returns {boolean} Success status
 */
export async function deleteUserProfile(supabaseUid) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const result = await collection.deleteOne({ supabase_uid: supabaseUid });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting user profile:', error);
    throw error;
  }
}
