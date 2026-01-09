/**
 * Closet Items CRUD Operations
 * Calls the Express backend API
 */

import { apiGet, apiPost, apiPut, apiDelete } from '../api-client';

/**
 * Create a new closet item
 * @param {Object} itemData - Item details
 * @param {string} userId - Supabase user ID (not needed, backend gets from token)
 * @returns {Object} Created item with _id
 */
export async function createClosetItem(itemData, userId) {
  try {
    return await apiPost('/closet', itemData);
  } catch (error) {
    console.error('Error creating closet item:', error);
    throw error;
  }
}

/**
 * Get all closet items for a user
 * @param {string} userId - Supabase user ID (not needed, backend gets from token)
 * @param {Object} filters - Optional filters (type, color, season)
 * @returns {Array} Array of closet items
 */
export async function getClosetItems(userId, filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.color) params.append('color', filters.color);
    if (filters.season) params.append('season', filters.season);
    if (filters.brand) params.append('brand', filters.brand);

    const queryString = params.toString();
    const endpoint = queryString ? `/closet?${queryString}` : '/closet';
    
    console.log('Getting closet items from:', endpoint);
    const items = await apiGet(endpoint);
    console.log('Received items from API:', items);
    return items;
  } catch (error) {
    console.error('Error fetching closet items:', error);
    throw error;
  }
}

/**
 * Get a single closet item by ID
 * @param {string} itemId - MongoDB ObjectId as string
 * @param {string} userId - Supabase user ID (not needed, backend verifies ownership)
 * @returns {Object|null} Closet item or null
 */
export async function getClosetItemById(itemId, userId) {
  try {
    return await apiGet(`/closet/${itemId}`);
  } catch (error) {
    console.error('Error fetching closet item:', error);
    throw error;
  }
}

/**
 * Update a closet item
 * @param {string} itemId - MongoDB ObjectId as string
 * @param {string} userId - Supabase user ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated item
 */
export async function updateClosetItem(itemId, userId, updates) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(itemId), user_id: userId },
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
    console.error('Error updating closet item:', error);
    throw error;
  }
}

/**
 * Delete a closet item
 * @param {string} itemId - MongoDB ObjectId as string
 * @param {string} userId - Supabase user ID (not needed, backend gets from token)
 * @returns {boolean} Success status
 */
export async function deleteClosetItem(itemId, userId) {
  try {
    await apiDelete(`/closet/${itemId}`);
    return true;
  } catch (error) {
    console.error('Error deleting closet item:', error);
    throw error;
  }
}

/**
 * Increment worn count for an item
 * @param {string} itemId - MongoDB ObjectId as string
 * @param {string} userId - Supabase user ID
 * @returns {Object} Updated item
 */
export async function incrementWornCount(itemId, userId) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(itemId), user_id: userId },
      {
        $inc: { worn_count: 1 },
        $set: { updated_at: new Date() },
      },
      { returnDocument: 'after' }
    );

    return result.value;
  } catch (error) {
    console.error('Error incrementing worn count:', error);
    throw error;
  }
}

/**
 * Get closet statistics for a user
 * @param {string} userId - Supabase user ID
 * @returns {Object} Stats object
 */
export async function getClosetStats(userId) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const stats = await collection
      .aggregate([
        { $match: { user_id: userId } },
        {
          $group: {
            _id: null,
            total_items: { $sum: 1 },
            total_worn: { $sum: '$worn_count' },
            types: { $addToSet: '$type' },
            colors: { $addToSet: '$color' },
          },
        },
      ])
      .toArray();

    return stats[0] || { total_items: 0, total_worn: 0, types: [], colors: [] };
  } catch (error) {
    console.error('Error fetching closet stats:', error);
    throw error;
  }
}
