import express from 'express';
import { ObjectId } from 'mongodb';

export default function communityRoutes(db) {
  const router = express.Router();
  const outfitsCollection = db.collection('outfits');
  const usersCollection = db.collection('users');

  // GET /api/community/feed - Get community feed (public outfits)
  router.get('/feed', async (req, res) => {
    try {
      const { limit = 20, skip = 0, occasion, weather } = req.query;

      const matchFilter = { is_public: true };
      if (occasion) matchFilter.occasion = occasion;
      if (weather) matchFilter.weather = weather;

      const feed = await outfitsCollection
        .aggregate([
          { $match: matchFilter },
          { $sort: { created_at: -1 } },
          { $skip: parseInt(skip) },
          { $limit: parseInt(limit) },
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: 'auth_id',
              as: 'user'
            }
          },
          {
            $unwind: {
              path: '$user',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $addFields: {
              likes_count: { $size: { $ifNull: ['$likes', []] } },
              comments_count: { $size: { $ifNull: ['$comments', []] } },
              is_liked: { $in: [req.user.id, { $ifNull: ['$likes', []] }] }
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              items: 1,
              occasion: 1,
              weather: 1,
              notes: 1,
              likes_count: 1,
              comments_count: 1,
              is_liked: 1,
              created_at: 1,
              user: {
                username: 1,
                avatar_url: 1
              }
            }
          }
        ])
        .toArray();

      res.json(feed);
    } catch (error) {
      console.error('Error fetching community feed:', error);
      res.status(500).json({ error: 'Failed to fetch community feed' });
    }
  });

  // GET /api/community/trending - Get trending outfits (most liked in past week)
  router.get('/trending', async (req, res) => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const trending = await outfitsCollection
        .aggregate([
          {
            $match: {
              is_public: true,
              created_at: { $gte: oneWeekAgo }
            }
          },
          {
            $addFields: {
              likes_count: { $size: { $ifNull: ['$likes', []] } }
            }
          },
          { $sort: { likes_count: -1, created_at: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: 'auth_id',
              as: 'user'
            }
          },
          {
            $unwind: {
              path: '$user',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              items: 1,
              occasion: 1,
              weather: 1,
              likes_count: 1,
              comments_count: { $size: { $ifNull: ['$comments', []] } },
              created_at: 1,
              user: {
                username: 1,
                avatar_url: 1
              }
            }
          }
        ])
        .toArray();

      res.json(trending);
    } catch (error) {
      console.error('Error fetching trending outfits:', error);
      res.status(500).json({ error: 'Failed to fetch trending outfits' });
    }
  });

  // GET /api/community/outfits/:id/comments - Get comments for outfit
  router.get('/outfits/:id/comments', async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid outfit ID' });
      }

      const outfit = await outfitsCollection.findOne({ _id: new ObjectId(id) });

      if (!outfit) {
        return res.status(404).json({ error: 'Outfit not found' });
      }

      // Populate user info for each comment
      const comments = outfit.comments || [];
      const userIds = [...new Set(comments.map(c => c.user_id))];
      
      const users = await usersCollection
        .find({ auth_id: { $in: userIds } })
        .project({ auth_id: 1, username: 1, avatar_url: 1 })
        .toArray();

      const userMap = {};
      users.forEach(u => {
        userMap[u.auth_id] = { username: u.username, avatar_url: u.avatar_url };
      });

      const commentsWithUsers = comments.map(c => ({
        ...c,
        user: userMap[c.user_id] || { username: 'Unknown', avatar_url: '' }
      }));

      res.json(commentsWithUsers);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  });

  // GET /api/community/messages - Get all message board posts
  router.get('/messages', async (req, res) => {
    try {
      const messagesCollection = db.collection('messages');
      const limit = parseInt(req.query.limit) || 50;
      
      const messages = await messagesCollection
        .aggregate([
          { $sort: { created_at: -1 } },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: 'auth_id',
              as: 'user'
            }
          },
          {
            $unwind: {
              path: '$user',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $project: {
              _id: 1,
              text: 1,
              user_id: 1,
              created_at: 1,
              'user.username': 1,
              'user.avatar_url': 1
            }
          }
        ])
        .toArray();

      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // POST /api/community/messages - Post a new message
  router.post('/messages', async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: 'Message text is required' });
      }

      if (text.length > 500) {
        return res.status(400).json({ error: 'Message is too long (max 500 characters)' });
      }

      const messagesCollection = db.collection('messages');
      const message = {
        user_id: req.user.id,
        text: text.trim(),
        created_at: new Date()
      };

      const result = await messagesCollection.insertOne(message);
      
      // Fetch user info to return complete message
      const user = await usersCollection.findOne(
        { auth_id: req.user.id },
        { projection: { username: 1, avatar_url: 1 } }
      );

      const completeMessage = {
        _id: result.insertedId,
        ...message,
        user: {
          username: user?.username || 'User',
          avatar_url: user?.avatar_url || ''
        }
      };

      res.status(201).json(completeMessage);
    } catch (error) {
      console.error('Error posting message:', error);
      res.status(500).json({ error: 'Failed to post message' });
    }
  });

  // DELETE /api/community/messages/:id - Delete a message
  router.delete('/messages/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid message ID' });
      }

      const messagesCollection = db.collection('messages');
      const result = await messagesCollection.deleteOne({
        _id: new ObjectId(id),
        user_id: req.user.id // Only allow users to delete their own messages
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Message not found or not authorized' });
      }

      res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  });

  return router;
}
