/**
 * Outfits CRUD Operations
 * Handles all database operations for user outfits
 */

import { getDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';

const COLLECTION = 'outfits';

/**
 * Create a new outfit
 * @param {Object} outfitData - Outfit details
 * @param {string} userId - Supabase user ID
 * @returns {Object} Created outfit with _id
 */
export async function createOutfit(outfitData, userId) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const newOutfit = {
      user_id: userId,
      name: outfitData.name || 'Untitled Outfit',
      occasion: outfitData.occasion || 'casual', // 'casual', 'work', 'formal', 'athletic', 'date', 'party'
      items: outfitData.items || [], // Array of closet_items ObjectIds
      image_url: outfitData.image_url || '', // Composite preview image
      is_public: outfitData.is_public || false,
      likes: 0,
      notes: outfitData.notes || '',
      weather: outfitData.weather || null, // 'hot', 'warm', 'cool', 'cold'
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await collection.insertOne(newOutfit);
    return { ...newOutfit, _id: result.insertedId };
  } catch (error) {
    console.error('Error creating outfit:', error);
    throw error;
  }
}

/**
 * Get all outfits for a user
 * @param {string} userId - Supabase user ID
 * @param {Object} filters - Optional filters (occasion, weather)
 * @returns {Array} Array of outfits
 */
export async function getOutfits(userId, filters = {}) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const query = { user_id: userId };

    if (filters.occasion) query.occasion = filters.occasion;
    if (filters.weather) query.weather = filters.weather;

    const outfits = await collection
      .find(query)
      .sort({ created_at: -1 })
      .toArray();

    return outfits;
  } catch (error) {
    console.error('Error fetching outfits:', error);
    throw error;
  }
}

/**
 * Get a single outfit by ID with populated item details
 * @param {string} outfitId - MongoDB ObjectId as string
 * @param {string} userId - Supabase user ID
 * @returns {Object|null} Outfit with populated items
 */
export async function getOutfitById(outfitId, userId) {
  try {
    const db = await getDatabase();
    const outfitsCollection = db.collection(COLLECTION);
    const itemsCollection = db.collection('closet_items');

    const outfit = await outfitsCollection.findOne({
      _id: new ObjectId(outfitId),
      user_id: userId,
    });

    if (!outfit) return null;

    // Populate item details
    if (outfit.items && outfit.items.length > 0) {
      const itemIds = outfit.items.map((id) => new ObjectId(id));
      const items = await itemsCollection
        .find({ _id: { $in: itemIds } })
        .toArray();
      outfit.populated_items = items;
    }

    return outfit;
  } catch (error) {
    console.error('Error fetching outfit:', error);
    throw error;
  }
}

/**
 * Update an outfit
 * @param {string} outfitId - MongoDB ObjectId as string
 * @param {string} userId - Supabase user ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated outfit
 */
export async function updateOutfit(outfitId, userId, updates) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(outfitId), user_id: userId },
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
    console.error('Error updating outfit:', error);
    throw error;
  }
}

/**
 * Delete an outfit
 * @param {string} outfitId - MongoDB ObjectId as string
 * @param {string} userId - Supabase user ID
 * @returns {boolean} Success status
 */
export async function deleteOutfit(outfitId, userId) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const result = await collection.deleteOne({
      _id: new ObjectId(outfitId),
      user_id: userId,
    });

    return result.deletedCount > 0;
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
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const outfits = await collection
      .find({ is_public: true })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return outfits;
  } catch (error) {
    console.error('Error fetching public outfits:', error);
    throw error;
  }
}

/**
 * Increment likes for an outfit
 * @param {string} outfitId - MongoDB ObjectId as string
 * @returns {Object} Updated outfit
 */
export async function likeOutfit(outfitId) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(outfitId) },
      { $inc: { likes: 1 } },
      { returnDocument: 'after' }
    );

    return result.value;
  } catch (error) {
    console.error('Error liking outfit:', error);
    throw error;
  }
}
