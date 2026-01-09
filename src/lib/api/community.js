/**
 * Community Feed Operations
 * Calls the Express backend API for public outfits
 */

import { apiGet, apiPost } from '../api-client';

/**
 * Get community feed (public outfits)
 * @param {Object} options - Query options
 * @param {number} options.limit - Results per page (default 20)
 * @param {number} options.skip - Results to skip (default 0)
 * @param {string} options.occasion - Filter by occasion
 * @param {string} options.weather - Filter by weather
 * @returns {Array<Object>} Public outfits with user details
 */
export async function getCommunityFeed(options = {}) {
  try {
    const { limit = 20, skip = 0, occasion, weather } = options;
    const params = new URLSearchParams();
    params.append('limit', limit);
    params.append('skip', skip);
    if (occasion) params.append('occasion', occasion);
    if (weather) params.append('weather', weather);

    return await apiGet(`/community/feed?${params.toString()}`);
  } catch (error) {
    console.error('Error fetching community feed:', error);
    throw error;
  }
}

/**
 * Get trending outfits (most liked in past week)
 * @returns {Array<Object>} Trending outfits
 */
export async function getTrendingOutfits() {
  try {
    return await apiGet('/community/trending');
  } catch (error) {
    console.error('Error fetching trending outfits:', error);
    throw error;
  }
}

/**
 * Get comments for an outfit
 * @param {string} outfitId - Outfit ID
 * @returns {Array<Object>} Comments with user details
 */
export async function getOutfitComments(outfitId) {
  try {
    return await apiGet(`/community/outfits/${outfitId}/comments`);
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
}

/**
 * Add a comment to an outfit
 * @param {string} outfitId - Outfit ID
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

/**
 * Like/unlike an outfit
 * @param {string} outfitId - Outfit ID
 * @returns {Object} Like result with liked status
 */
export async function toggleLike(outfitId) {
  try {
    return await apiPost(`/outfits/${outfitId}/like`, {});
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
}

// Legacy function for backward compatibility
export async function getPosts(options = {}) {
  return getCommunityFeed(options);
}

/**
 * Get message board posts
 * @param {number} limit - Number of messages to fetch
 * @returns {Array<Object>} Messages with user details
 */
export async function getMessages(limit = 50) {
  try {
    return await apiGet(`/community/messages?limit=${limit}`);
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

/**
 * Post a new message to the board
 * @param {string} text - Message text
 * @returns {Object} Created message
 */
export async function postMessage(text) {
  try {
    return await apiPost('/community/messages', { text });
  } catch (error) {
    console.error('Error posting message:', error);
    throw error;
  }
}

/**
 * Delete a message
 * @param {string} messageId - Message ID
 * @returns {Object} Success result
 */
export async function deleteMessage(messageId) {
  try {
    const { apiDelete } = await import('../api-client');
    return await apiDelete(`/community/messages/${messageId}`);
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}
