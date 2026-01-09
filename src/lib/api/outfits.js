/**
 * Outfits CRUD Operations
 * Calls the Express backend API
 */

import { apiGet, apiPost, apiPut, apiDelete } from '../api-client';

/**
 * Create a new outfit
 * @param {Object} outfitData - Outfit details
 * @param {string} userId - Supabase user ID (not needed, backend gets from token)
 * @returns {Object} Created outfit with _id
 */
export async function createOutfit(outfitData, userId) {
  try {
    return await apiPost('/outfits', outfitData);
  } catch (error) {
    console.error('Error creating outfit:', error);
    throw error;
  }
}

/**
 * Get all outfits for a user
 * @param {string} userId - Supabase user ID (not needed, backend gets from token)
 * @param {Object} filters - Optional filters (occasion, weather)
 * @returns {Array} Array of outfits
 */
export async function getOutfits(userId, filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.occasion) params.append('occasion', filters.occasion);
    if (filters.weather) params.append('weather', filters.weather);

    const queryString = params.toString();
    const endpoint = queryString ? `/outfits?${queryString}` : '/outfits';
    
    return await apiGet(endpoint);
  } catch (error) {
    console.error('Error fetching outfits:', error);
    throw error;
  }
}

/**
 * Get a single outfit by ID with populated item details
 * @param {string} outfitId - MongoDB ObjectId as string
 * @param {string} userId - Supabase user ID (not needed, backend verifies ownership)
 * @returns {Object|null} Outfit with populated items
 */
export async function getOutfitById(outfitId, userId) {
  try {
    return await apiGet(`/outfits/${outfitId}`);
  } catch (error) {
    console.error('Error fetching outfit:', error);
    throw error;
  }
}

/**
 * Update an outfit
 * @param {string} outfitId - MongoDB ObjectId as string
 * @param {Object} updates - Fields to update
 * @param {string} userId - Supabase user ID (not needed, backend verifies ownership)
 * @returns {Object} Updated outfit
 */
export async function updateOutfit(outfitId, updates, userId) {
  try {
    return await apiPut(`/outfits/${outfitId}`, updates);
  } catch (error) {
    console.error('Error updating outfit:', error);
    throw error;
  }
}

/**
 * Delete an outfit
 * @param {string} outfitId - MongoDB ObjectId as string
 * @param {string} userId - Supabase user ID (not needed, backend verifies ownership)
 * @returns {boolean} Success status
 */
export async function deleteOutfit(outfitId, userId) {
  try {
    const result = await apiDelete(`/outfits/${outfitId}`);
    return result.success;
  } catch (error) {
    console.error('Error deleting outfit:', error);
    throw error;
  }
}

/**
 * Get public outfits from community (Explore feed)
 * @param {number} limit - Max number of outfits to return
 * @param {number} skip - Number to skip for pagination
 * @returns {Array} Array of public outfits
 */
export async function getPublicOutfits(limit = 20, skip = 0) {
  try {
    return await apiGet(`/outfits/public?limit=${limit}&skip=${skip}`);
  } catch (error) {
    console.error('Error fetching public outfits:', error);
    throw error;
  }
}

/**
 * Like/unlike an outfit
 * @param {string} outfitId - MongoDB ObjectId as string
 * @returns {Object} Like result with liked status
 */
export async function likeOutfit(outfitId) {
  try {
    return await apiPost(`/outfits/${outfitId}/like`, {});
  } catch (error) {
    console.error('Error liking outfit:', error);
    throw error;
  }
}

/**
 * Add a comment to an outfit
 * @param {string} outfitId - MongoDB ObjectId as string
 * @param {string} text - Comment text
 * @returns {Object} Created comment
 */
export async function addComment(outfitId, text) {
  try {
    return await apiPost(`/outfits/${outfitId}/comments`, { text });
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}
