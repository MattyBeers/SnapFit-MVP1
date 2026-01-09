/**
 * Community Posts CRUD Operations
 * Handles public outfit posts, likes, and comments
 */

import { getDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';

const COLLECTION = 'community_posts';

/**
 * Create a community post
 * @param {Object} postData - Post data
 * @param {string} userId - User's Supabase UID
 * @returns {Object} Created post
 */
export async function createPost(postData, userId) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const post = {
      user_id: userId,
      outfit_id: postData.outfit_id ? new ObjectId(postData.outfit_id) : null,
      caption: postData.caption || '',
      image_url: postData.image_url || '',
      tags: postData.tags || [],
      likes: [],
      comments: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await collection.insertOne(post);
    return { _id: result.insertedId, ...post };
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
}

/**
 * Get community posts with pagination
 * @param {Object} options - Query options
 * @param {number} options.limit - Results per page (default 20)
 * @param {number} options.skip - Results to skip (default 0)
 * @param {string} options.sortBy - Sort field (default 'created_at')
 * @param {string} options.userId - Filter by user ID
 * @param {Array<string>} options.tags - Filter by tags
 * @returns {Array<Object>} Posts with user details
 */
export async function getPosts(options = {}) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const {
      limit = 20,
      skip = 0,
      sortBy = 'created_at',
      userId = null,
      tags = null,
    } = options;

    const query = {};
    if (userId) query.user_id = userId;
    if (tags && tags.length > 0) query.tags = { $in: tags };

    const posts = await collection
      .aggregate([
        { $match: query },
        { $sort: { [sortBy]: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: 'supabase_uid',
            as: 'user_details',
          },
        },
        {
          $unwind: {
            path: '$user_details',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'outfits',
            localField: 'outfit_id',
            foreignField: '_id',
            as: 'outfit_details',
          },
        },
        {
          $unwind: {
            path: '$outfit_details',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            user_id: 1,
            outfit_id: 1,
            caption: 1,
            image_url: 1,
            tags: 1,
            likes_count: { $size: '$likes' },
            comments_count: { $size: '$comments' },
            created_at: 1,
            'user_details.username': 1,
            'user_details.avatar_url': 1,
            'outfit_details.name': 1,
          },
        },
      ])
      .toArray();

    return posts;
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
}

/**
 * Get a single post by ID with full details
 * @param {string} postId - Post ID
 * @returns {Object|null} Post with user and outfit details
 */
export async function getPostById(postId) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const posts = await collection
      .aggregate([
        { $match: { _id: new ObjectId(postId) } },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: 'supabase_uid',
            as: 'user_details',
          },
        },
        {
          $unwind: {
            path: '$user_details',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'outfits',
            localField: 'outfit_id',
            foreignField: '_id',
            as: 'outfit_details',
          },
        },
        {
          $unwind: {
            path: '$outfit_details',
            preserveNullAndEmptyArrays: true,
          },
        },
      ])
      .toArray();

    return posts[0] || null;
  } catch (error) {
    console.error('Error fetching post by ID:', error);
    throw error;
  }
}

/**
 * Like/unlike a post
 * @param {string} postId - Post ID
 * @param {string} userId - User's Supabase UID
 * @returns {Object} Updated post
 */
export async function toggleLike(postId, userId) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    // Check if user already liked the post
    const post = await collection.findOne({ _id: new ObjectId(postId) });
    if (!post) throw new Error('Post not found');

    const hasLiked = post.likes.includes(userId);

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(postId) },
      hasLiked ? { $pull: { likes: userId } } : { $push: { likes: userId } },
      { returnDocument: 'after' }
    );

    return result.value;
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
}

/**
 * Add a comment to a post
 * @param {string} postId - Post ID
 * @param {string} userId - User's Supabase UID
 * @param {string} text - Comment text
 * @returns {Object} Updated post
 */
export async function addComment(postId, userId, text) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const comment = {
      _id: new ObjectId(),
      user_id: userId,
      text: text,
      created_at: new Date(),
    };

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(postId) },
      {
        $push: { comments: comment },
        $set: { updated_at: new Date() },
      },
      { returnDocument: 'after' }
    );

    return result.value;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

/**
 * Delete a comment from a post
 * @param {string} postId - Post ID
 * @param {string} commentId - Comment ID
 * @param {string} userId - User's Supabase UID (for ownership check)
 * @returns {Object} Updated post
 */
export async function deleteComment(postId, commentId, userId) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const result = await collection.findOneAndUpdate(
      {
        _id: new ObjectId(postId),
        'comments._id': new ObjectId(commentId),
        'comments.user_id': userId,
      },
      {
        $pull: { comments: { _id: new ObjectId(commentId) } },
        $set: { updated_at: new Date() },
      },
      { returnDocument: 'after' }
    );

    return result.value;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

/**
 * Delete a post (owner only)
 * @param {string} postId - Post ID
 * @param {string} userId - User's Supabase UID
 * @returns {boolean} Success status
 */
export async function deletePost(postId, userId) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const result = await collection.deleteOne({
      _id: new ObjectId(postId),
      user_id: userId,
    });

    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
}

/**
 * Update post caption or tags
 * @param {string} postId - Post ID
 * @param {string} userId - User's Supabase UID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated post
 */
export async function updatePost(postId, userId, updates) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const allowedUpdates = {};
    if (updates.caption !== undefined) allowedUpdates.caption = updates.caption;
    if (updates.tags !== undefined) allowedUpdates.tags = updates.tags;

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(postId), user_id: userId },
      {
        $set: {
          ...allowedUpdates,
          updated_at: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return result.value;
  } catch (error) {
    console.error('Error updating post:', error);
    throw error;
  }
}
