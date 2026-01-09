import express from 'express';
import { ObjectId } from 'mongodb';

export default function closetRoutes(db) {
  const router = express.Router();
  const closetCollection = db.collection('closet_items');

  // GET /api/closet - Get all closet items for user
  router.get('/', async (req, res) => {
    try {
      const { type, color, season, brand } = req.query;
      const filter = { user_id: req.user.id };

      if (type) filter.type = type;
      if (color) filter.color = color;
      if (season) filter.season = season;
      if (brand) filter.brand = brand;

      console.log('Fetching closet items for user:', req.user.id, 'with filter:', filter);

      const items = await closetCollection
        .find(filter)
        .sort({ created_at: -1 })
        .toArray();

      console.log(`Found ${items.length} items for user ${req.user.id}`);

      res.json(items);
    } catch (error) {
      console.error('Error fetching closet items:', error);
      res.status(500).json({ error: 'Failed to fetch closet items' });
    }
  });

  // GET /api/closet/stats - Get closet statistics (must be before /:id route)
  router.get('/stats', async (req, res) => {
    try {
      const stats = await closetCollection.aggregate([
        { $match: { user_id: req.user.id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            byType: {
              $push: { type: '$type' }
            }
          }
        }
      ]).toArray();

      const typeCount = {};
      if (stats[0]?.byType) {
        stats[0].byType.forEach(item => {
          typeCount[item.type] = (typeCount[item.type] || 0) + 1;
        });
      }

      res.json({
        total: stats[0]?.total || 0,
        byType: typeCount
      });
    } catch (error) {
      console.error('Error fetching closet stats:', error);
      res.status(500).json({ error: 'Failed to fetch closet stats' });
    }
  });

  // POST /api/closet - Create new closet item
  router.post('/', async (req, res) => {
    try {
      const { type, brand, color, size, season, tags, image_url, notes } = req.body;

      if (!type || !image_url) {
        return res.status(400).json({ error: 'Type and image_url are required' });
      }

      const newItem = {
        user_id: req.user.id,
        type,
        brand: brand || '',
        color: color || '',
        size: size || '',
        season: season || '',
        tags: tags || [],
        image_url,
        notes: notes || '',
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = await closetCollection.insertOne(newItem);
      const createdItem = { ...newItem, _id: result.insertedId };

      res.status(201).json(createdItem);
    } catch (error) {
      console.error('Error creating closet item:', error);
      res.status(500).json({ error: 'Failed to create closet item' });
    }
  });

  // GET /api/closet/:id - Get single closet item
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid item ID' });
      }

      const item = await closetCollection.findOne({
        _id: new ObjectId(id),
        user_id: req.user.id
      });

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      res.json(item);
    } catch (error) {
      console.error('Error fetching closet item:', error);
      res.status(500).json({ error: 'Failed to fetch closet item' });
    }
  });

  // PUT /api/closet/:id - Update closet item
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { type, brand, color, size, season, tags, notes } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid item ID' });
      }

      const updateData = {
        updated_at: new Date()
      };

      if (type !== undefined) updateData.type = type;
      if (brand !== undefined) updateData.brand = brand;
      if (color !== undefined) updateData.color = color;
      if (size !== undefined) updateData.size = size;
      if (season !== undefined) updateData.season = season;
      if (tags !== undefined) updateData.tags = tags;
      if (notes !== undefined) updateData.notes = notes;

      const result = await closetCollection.findOneAndUpdate(
        { _id: new ObjectId(id), user_id: req.user.id },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        return res.status(404).json({ error: 'Item not found' });
      }

      res.json(result.value);
    } catch (error) {
      console.error('Error updating closet item:', error);
      res.status(500).json({ error: 'Failed to update closet item' });
    }
  });

  // DELETE /api/closet/:id - Delete closet item
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid item ID' });
      }

      const result = await closetCollection.deleteOne({
        _id: new ObjectId(id),
        user_id: req.user.id
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }

      res.json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
      console.error('Error deleting closet item:', error);
      res.status(500).json({ error: 'Failed to delete closet item' });
    }
  });

  return router;
}
