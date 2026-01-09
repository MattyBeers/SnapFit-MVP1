/**
 * Wishlist Items CRUD Operations
 * Calls the Express backend API
 */

import { apiGet, apiPost, apiPut, apiDelete } from '../api-client';

/**
 * Create a new wishlist item
 * @param {Object} itemData - Item details
 * @returns {Object} Created item with _id
 */
export async function createWishlistItem(itemData) {
  try {
    return await apiPost('/wishlist', itemData);
  } catch (error) {
    console.error('Error creating wishlist item:', error);
    throw error;
  }
}

/**
 * Get all wishlist items for a user
 * @param {Object} filters - Optional filters (type, priority, purchased)
 * @returns {Array} Array of wishlist items
 */
export async function getWishlistItems(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.purchased !== undefined) params.append('purchased', filters.purchased);

    const queryString = params.toString();
    const endpoint = queryString ? `/wishlist?${queryString}` : '/wishlist';
    
    console.log('Getting wishlist items from:', endpoint);
    const items = await apiGet(endpoint);
    console.log('Received wishlist items from API:', items?.length || 0);
    return items;
  } catch (error) {
    console.error('Error fetching wishlist items:', error);
    throw error;
  }
}

/**
 * Get wishlist statistics
 * @returns {Object} Stats object with total, totalValue, purchased counts
 */
export async function getWishlistStats() {
  try {
    return await apiGet('/wishlist/stats');
  } catch (error) {
    console.error('Error fetching wishlist stats:', error);
    throw error;
  }
}

/**
 * Get a single wishlist item by ID
 * @param {string} itemId - MongoDB ObjectId as string
 * @returns {Object|null} Wishlist item or null
 */
export async function getWishlistItemById(itemId) {
  try {
    return await apiGet(`/wishlist/${itemId}`);
  } catch (error) {
    console.error('Error fetching wishlist item:', error);
    throw error;
  }
}

/**
 * Update a wishlist item
 * @param {string} itemId - MongoDB ObjectId as string
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated item
 */
export async function updateWishlistItem(itemId, updates) {
  try {
    return await apiPut(`/wishlist/${itemId}`, updates);
  } catch (error) {
    console.error('Error updating wishlist item:', error);
    throw error;
  }
}

/**
 * Delete a wishlist item
 * @param {string} itemId - MongoDB ObjectId as string
 * @returns {Object} Success response
 */
export async function deleteWishlistItem(itemId) {
  try {
    return await apiDelete(`/wishlist/${itemId}`);
  } catch (error) {
    console.error('Error deleting wishlist item:', error);
    throw error;
  }
}

/**
 * Reorder wishlist items
 * @param {Array} items - Array of { id, customOrder }
 * @returns {Object} Success response
 */
export async function reorderWishlistItems(items) {
  try {
    return await apiPut('/wishlist/batch/reorder', { items });
  } catch (error) {
    console.error('Error reordering wishlist items:', error);
    throw error;
  }
}
