import express from 'express';
import { ObjectId } from 'mongodb';

export default function wishlistRoutes(db) {
  const router = express.Router();
  const wishlistCollection = db.collection('wishlist_items');

  // GET /api/wishlist - Get all wishlist items for user
  router.get('/', async (req, res) => {
    try {
      const { type, priority, purchased } = req.query;
      const filter = { user_id: req.user.id };

      if (type) filter.type = type;
      if (priority) filter.priority = priority;
      if (purchased !== undefined) filter.purchased = purchased === 'true';

      console.log('Fetching wishlist items for user:', req.user.id, 'with filter:', filter);

      const items = await wishlistCollection
        .find(filter)
        .sort({ customOrder: 1, created_at: -1 })
        .toArray();

      console.log(`Found ${items.length} wishlist items for user ${req.user.id}`);

      res.json(items);
    } catch (error) {
      console.error('Error fetching wishlist items:', error);
      res.status(500).json({ error: 'Failed to fetch wishlist items' });
    }
  });

  // GET /api/wishlist/stats - Get wishlist statistics
  router.get('/stats', async (req, res) => {
    try {
      const stats = await wishlistCollection.aggregate([
        { $match: { user_id: req.user.id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalValue: { $sum: '$estimatedPrice' },
            purchased: { $sum: { $cond: ['$purchased', 1, 0] } },
            byPriority: { $push: { priority: '$priority' } },
            byType: { $push: { type: '$type' } }
          }
        }
      ]).toArray();

      const priorityCount = {};
      const typeCount = {};
      
      if (stats[0]?.byPriority) {
        stats[0].byPriority.forEach(item => {
          priorityCount[item.priority] = (priorityCount[item.priority] || 0) + 1;
        });
      }
      
      if (stats[0]?.byType) {
        stats[0].byType.forEach(item => {
          typeCount[item.type] = (typeCount[item.type] || 0) + 1;
        });
      }

      res.json({
        total: stats[0]?.total || 0,
        totalValue: stats[0]?.totalValue || 0,
        purchased: stats[0]?.purchased || 0,
        byPriority: priorityCount,
        byType: typeCount
      });
    } catch (error) {
      console.error('Error fetching wishlist stats:', error);
      res.status(500).json({ error: 'Failed to fetch wishlist stats' });
    }
  });

  // POST /api/wishlist - Create new wishlist item
  router.post('/', async (req, res) => {
    try {
      const { 
        name, type, brand, color, size, season, tags, image_url, notes,
        purchaseUrl, estimatedPrice, priority, purchased
      } = req.body;

      if (!name || !image_url) {
        return res.status(400).json({ error: 'Name and image_url are required' });
      }

      // Get current item count for custom order
      const count = await wishlistCollection.countDocuments({ user_id: req.user.id });

      const newItem = {
        user_id: req.user.id,
        name,
        type: type || '',
        brand: brand || '',
        color: color || '',
        size: size || '',
        season: season || '',
        tags: tags || [],
        image_url,
        notes: notes || '',
        purchaseUrl: purchaseUrl || '',
        estimatedPrice: parseFloat(estimatedPrice) || 0,
        originalPrice: parseFloat(estimatedPrice) || 0,
        priority: priority || 'medium',
        purchased: purchased || false,
        purchaseDate: null,
        priceHistory: [{ price: parseFloat(estimatedPrice) || 0, date: new Date().toISOString() }],
        lastChecked: new Date().toISOString(),
        customOrder: count,
        isWishlist: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = await wishlistCollection.insertOne(newItem);
      const createdItem = { ...newItem, _id: result.insertedId };

      console.log('Created wishlist item:', createdItem._id);
      res.status(201).json(createdItem);
    } catch (error) {
      console.error('Error creating wishlist item:', error);
      res.status(500).json({ error: 'Failed to create wishlist item' });
    }
  });

  // GET /api/wishlist/:id - Get single wishlist item
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid item ID' });
      }

      const item = await wishlistCollection.findOne({
        _id: new ObjectId(id),
        user_id: req.user.id
      });

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      res.json(item);
    } catch (error) {
      console.error('Error fetching wishlist item:', error);
      res.status(500).json({ error: 'Failed to fetch wishlist item' });
    }
  });

  // PUT /api/wishlist/:id - Update wishlist item
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        name, type, brand, color, size, season, tags, notes,
        purchaseUrl, estimatedPrice, priority, purchased, purchaseDate,
        priceHistory, lastChecked, customOrder
      } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid item ID' });
      }

      const updateData = {
        updated_at: new Date()
      };

      if (name !== undefined) updateData.name = name;
      if (type !== undefined) updateData.type = type;
      if (brand !== undefined) updateData.brand = brand;
      if (color !== undefined) updateData.color = color;
      if (size !== undefined) updateData.size = size;
      if (season !== undefined) updateData.season = season;
      if (tags !== undefined) updateData.tags = tags;
      if (notes !== undefined) updateData.notes = notes;
      if (purchaseUrl !== undefined) updateData.purchaseUrl = purchaseUrl;
      if (estimatedPrice !== undefined) updateData.estimatedPrice = parseFloat(estimatedPrice);
      if (priority !== undefined) updateData.priority = priority;
      if (purchased !== undefined) updateData.purchased = purchased;
      if (purchaseDate !== undefined) updateData.purchaseDate = purchaseDate;
      if (priceHistory !== undefined) updateData.priceHistory = priceHistory;
      if (lastChecked !== undefined) updateData.lastChecked = lastChecked;
      if (customOrder !== undefined) updateData.customOrder = customOrder;

      const result = await wishlistCollection.findOneAndUpdate(
        { _id: new ObjectId(id), user_id: req.user.id },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return res.status(404).json({ error: 'Item not found' });
      }

      console.log('Updated wishlist item:', id);
      res.json(result);
    } catch (error) {
      console.error('Error updating wishlist item:', error);
      res.status(500).json({ error: 'Failed to update wishlist item' });
    }
  });

  // DELETE /api/wishlist/:id - Delete wishlist item
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid item ID' });
      }

      const result = await wishlistCollection.deleteOne({
        _id: new ObjectId(id),
        user_id: req.user.id
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }

      console.log('Deleted wishlist item:', id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting wishlist item:', error);
      res.status(500).json({ error: 'Failed to delete wishlist item' });
    }
  });

  // PUT /api/wishlist/reorder - Reorder wishlist items
  router.put('/batch/reorder', async (req, res) => {
    try {
      const { items } = req.body; // Array of { id, customOrder }

      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Items array is required' });
      }

      const bulkOps = items.map(item => ({
        updateOne: {
          filter: { _id: new ObjectId(item.id), user_id: req.user.id },
          update: { $set: { customOrder: item.customOrder, updated_at: new Date() } }
        }
      }));

      await wishlistCollection.bulkWrite(bulkOps);

      console.log('Reordered wishlist items for user:', req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error reordering wishlist items:', error);
      res.status(500).json({ error: 'Failed to reorder wishlist items' });
    }
  });

  return router;
}
