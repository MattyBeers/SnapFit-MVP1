import express from 'express';
import { ObjectId } from 'mongodb';

export default function outfitsRoutes(db) {
  const router = express.Router();
  const outfitsCollection = db.collection('outfits');

  // GET /api/outfits - Get all outfits for user
  router.get('/', async (req, res) => {
    console.log('📦 GET /api/outfits - Fetching outfits for user:', req.user.id);
    try {
      // First, get raw outfits to see the item IDs
      const rawOutfits = await outfitsCollection
        .find({ user_id: req.user.id })
        .sort({ created_at: -1 })
        .toArray();
      
      console.log('📦 Raw outfit items (before lookup):', rawOutfits[0]?.items);
      
      const outfits = await outfitsCollection
        .aggregate([
          { $match: { user_id: req.user.id } },
          { $sort: { created_at: -1 } },
          {
            $addFields: {
              items: {
                $map: {
                  input: { $ifNull: ['$items', []] },
                  as: 'item',
                  in: {
                    $cond: {
                      if: { $eq: [{ $type: '$$item' }, 'objectId'] },
                      then: '$$item',
                      else: {
                        $cond: {
                          // Only process strings - check type first before regexMatch
                          if: { $eq: [{ $type: '$$item' }, 'string'] },
                          then: {
                            $cond: {
                              // Only convert strings that look like a 24-hex ObjectId
                              if: { $regexMatch: { input: '$$item', regex: '^[0-9a-fA-F]{24}$' } },
                              then: { $toObjectId: '$$item' },
                              else: '$$item'
                            }
                          },
                          else: '$$item'
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          {
            $lookup: {
              from: 'closet_items',
              localField: 'items',
              foreignField: '_id',
              as: 'items'
            }
          }
        ])
        .toArray();

      console.log('📦 Found', outfits.length, 'outfits for user:', req.user.id);
      if (outfits.length > 0) {
        console.log('📦 Sample outfit items:', outfits[0].items?.length || 0, 'items populated');
        console.log('📦 First item image_url:', outfits[0].items?.[0]?.image_url);
      }
      res.json(outfits);
    } catch (error) {
      console.error('❌ Error fetching outfits:', error);
      res.status(500).json({ error: 'Failed to fetch outfits' });
    }
  });

  // GET /api/outfits/public - Get public outfits (for community feed)
  router.get('/public', async (req, res) => {
    try {
      const { limit = 50, skip = 0 } = req.query;

      const outfits = await outfitsCollection
        .aggregate([
          { $match: { is_public: true } },
          { $sort: { created_at: -1 } },
          { $skip: parseInt(skip) },
          { $limit: parseInt(limit) },
          {
            $addFields: {
              items: {
                $map: {
                  input: { $ifNull: ['$items', []] },
                  as: 'item',
                  in: {
                    $cond: {
                      if: { $eq: [{ $type: '$$item' }, 'objectId'] },
                      then: '$$item',
                      else: {
                        $cond: {
                          // Only process strings - check type first before regexMatch
                          if: { $eq: [{ $type: '$$item' }, 'string'] },
                          then: {
                            $cond: {
                              if: { $regexMatch: { input: '$$item', regex: '^[0-9a-fA-F]{24}$' } },
                              then: { $toObjectId: '$$item' },
                              else: '$$item'
                            }
                          },
                          else: '$$item'
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          {
            $lookup: {
              from: 'closet_items',
              localField: 'items',
              foreignField: '_id',
              as: 'items'
            }
          },
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
              notes: 1,
              likes_count: { $size: { $ifNull: ['$likes', []] } },
              comments_count: { $size: { $ifNull: ['$comments', []] } },
              created_at: 1,
              'user.username': 1,
              'user.avatar_url': 1
            }
          }
        ])
        .toArray();

      res.json(outfits);
    } catch (error) {
      console.error('Error fetching public outfits:', error);
      res.status(500).json({ error: 'Failed to fetch public outfits' });
    }
  });

  // POST /api/outfits - Create new outfit
  router.post('/', async (req, res) => {
    try {
      const { name, items, occasion, weather, notes, is_public } = req.body;

      if (!name || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Name and items array are required' });
      }

      // Normalize items: accept either full item objects, ObjectId strings, or ObjectId instances
      let normalizedItems = [];
      try {
        if (Array.isArray(items)) {
          normalizedItems = items.map(i => {
            if (!i) return null;
            // If item is an object with _id or id, prefer that
            if (typeof i === 'object') {
              const id = i._id || i.id || null;
              if (id && ObjectId.isValid(id)) return new ObjectId(id);
              // If item is a full object (not an id), try to keep only its id if present
              return id || null;
            }
            // If item is a string, convert when it's a valid ObjectId hex
            if (typeof i === 'string') {
              return ObjectId.isValid(i) ? new ObjectId(i) : i;
            }
            return null;
          }).filter(Boolean);
        }

      } catch (normErr) {
        console.warn('Warning: could not normalize items array:', normErr);
        normalizedItems = Array.isArray(items) ? items : [];
      }

      const newOutfit = {
        user_id: req.user.id,
        name,
        items: normalizedItems,
        occasion: occasion || '',
        weather: weather || '',
        notes: notes || '',
        is_public: is_public || false,
        likes: [],
        comments: [],
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = await outfitsCollection.insertOne(newOutfit);
      const createdOutfit = { ...newOutfit, _id: result.insertedId };

      res.status(201).json(createdOutfit);
    } catch (error) {
      console.error('Error creating outfit:', error);
      res.status(500).json({ error: 'Failed to create outfit' });
    }
  });

  // GET /api/outfits/:id - Get single outfit
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid outfit ID' });
      }

      const outfits = await outfitsCollection
        .aggregate([
          { $match: { _id: new ObjectId(id) } },
          {
            $addFields: {
              items: {
                $map: {
                  input: { $ifNull: ['$items', []] },
                  as: 'item',
                  in: {
                    $cond: {
                      if: { $eq: [{ $type: '$$item' }, 'objectId'] },
                      then: '$$item',
                      else: {
                        $cond: {
                          // Only process strings - check type first before regexMatch
                          if: { $eq: [{ $type: '$$item' }, 'string'] },
                          then: {
                            $cond: {
                              if: { $regexMatch: { input: '$$item', regex: '^[0-9a-fA-F]{24}$' } },
                              then: { $toObjectId: '$$item' },
                              else: '$$item'
                            }
                          },
                          else: '$$item'
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          {
            $lookup: {
              from: 'closet_items',
              localField: 'items',
              foreignField: '_id',
              as: 'items'
            }
          }
        ])
        .toArray();

      const outfit = outfits[0];

      if (!outfit) {
        return res.status(404).json({ error: 'Outfit not found' });
      }

      // Only owner or public outfits can be viewed
      if (outfit.user_id !== req.user.id && !outfit.is_public) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(outfit);
    } catch (error) {
      console.error('Error fetching outfit:', error);
      res.status(500).json({ error: 'Failed to fetch outfit' });
    }
  });

  // PUT /api/outfits/:id - Update outfit
  router.put('/:id', async (req, res) => {
    console.log('📝 PUT /api/outfits/:id - Updating outfit:', req.params.id, 'for user:', req.user.id);
    try {
      const { id } = req.params;
      const { name, items, occasion, weather, notes, is_public } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid outfit ID' });
      }

      const updateData = {
        updated_at: new Date()
      };

      if (name !== undefined) updateData.name = name;
      if (items !== undefined) {
        // Normalize items on update as well
        try {
          const normalized = Array.isArray(items) ? items.map(i => {
            if (!i) return null;
            if (typeof i === 'object') {
              const id = i._id || i.id || null;
              if (id && ObjectId.isValid(id)) return new ObjectId(id);
              return id || null;
            }
            if (typeof i === 'string') return ObjectId.isValid(i) ? new ObjectId(i) : i;
            return null;
          }).filter(Boolean) : [];
          updateData.items = normalized;
        } catch (e) {
          updateData.items = items;
        }
      }
      if (occasion !== undefined) updateData.occasion = occasion;
      if (weather !== undefined) updateData.weather = weather;
      if (notes !== undefined) updateData.notes = notes;
      if (is_public !== undefined) updateData.is_public = is_public;

      console.log('📝 Update data:', updateData);

      const result = await outfitsCollection.findOneAndUpdate(
        { _id: new ObjectId(id), user_id: req.user.id },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      console.log('📝 Update result:', result);

      if (!result) {
        console.log('❌ Outfit not found or user mismatch');
        return res.status(404).json({ error: 'Outfit not found' });
      }

      res.json(result);
    } catch (error) {
      console.error('❌ Error updating outfit:', error);
      res.status(500).json({ error: 'Failed to update outfit' });
    }
  });

  // DELETE /api/outfits/:id - Delete outfit
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid outfit ID' });
      }

      const result = await outfitsCollection.deleteOne({
        _id: new ObjectId(id),
        user_id: req.user.id
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Outfit not found' });
      }

      res.json({ success: true, message: 'Outfit deleted successfully' });
    } catch (error) {
      console.error('Error deleting outfit:', error);
      res.status(500).json({ error: 'Failed to delete outfit' });
    }
  });

  // POST /api/outfits/:id/like - Like/unlike outfit
  router.post('/:id/like', async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid outfit ID' });
      }

      const outfit = await outfitsCollection.findOne({ _id: new ObjectId(id) });

      if (!outfit) {
        return res.status(404).json({ error: 'Outfit not found' });
      }

      const likes = outfit.likes || [];
      const hasLiked = likes.includes(req.user.id);

      const update = hasLiked
        ? { $pull: { likes: req.user.id } }
        : { $addToSet: { likes: req.user.id } };

      const result = await outfitsCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        update,
        { returnDocument: 'after' }
      );

      res.json({
        success: true,
        liked: !hasLiked,
        likes_count: result.value.likes?.length || 0
      });
    } catch (error) {
      console.error('Error liking outfit:', error);
      res.status(500).json({ error: 'Failed to like outfit' });
    }
  });

  // POST /api/outfits/:id/comments - Add comment to outfit
  router.post('/:id/comments', async (req, res) => {
    try {
      const { id } = req.params;
      const { text } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid outfit ID' });
      }

      if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: 'Comment text is required' });
      }

      const comment = {
        _id: new ObjectId(),
        user_id: req.user.id,
        text: text.trim(),
        created_at: new Date()
      };

      const result = await outfitsCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $push: { comments: comment } },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        return res.status(404).json({ error: 'Outfit not found' });
      }

      res.status(201).json(comment);
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  });

  return router;
}
