import express from 'express';

export default function usersRoutes(db) {
  const router = express.Router();
  const usersCollection = db.collection('users');

  // GET /api/users/me - Get current user's profile
  router.get('/me', async (req, res) => {
    try {
      const user = await usersCollection.findOne({ auth_id: req.user.id });

      if (!user) {
        // Create profile if doesn't exist
        const newUser = {
          auth_id: req.user.id,
          email: req.user.email,
          username: req.user.email?.split('@')[0] || 'user',
          avatar_url: '',
          bio: '',
          created_at: new Date(),
          updated_at: new Date()
        };

        await usersCollection.insertOne(newUser);
        return res.json(newUser);
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  // PUT /api/users/me - Update current user's profile
  router.put('/me', async (req, res) => {
    try {
      const { 
        username, 
        bio, 
        avatar_url, 
        height, 
        body_type, 
        body_photo_url,
        // Multi-angle body photos for VFR 1.0 optimization
        body_photo_front,
        body_photo_back,
        body_photo_left,
        body_photo_right,
        // Enhanced body measurements
        shoulder_width,
        chest_circumference,
        waist_circumference,
        hip_circumference,
        inseam,
        arm_length,
        neck_circumference,
        torso_length
      } = req.body;

      console.log('📝 Updating user profile:', req.body);

      const updateData = {
        updated_at: new Date()
      };

      if (username !== undefined) {
        // Check if username is already taken
        const existingUser = await usersCollection.findOne({
          username: username.toLowerCase(),
          auth_id: { $ne: req.user.id }
        });

        if (existingUser) {
          return res.status(400).json({ error: 'Username is already taken' });
        }

        updateData.username = username;
      }

      if (bio !== undefined) updateData.bio = bio;
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
      if (height !== undefined) updateData.height = height;
      if (body_type !== undefined) updateData.body_type = body_type;
      if (body_photo_url !== undefined) updateData.body_photo_url = body_photo_url;
      
      // Multi-angle body photos for optimized VFR
      if (body_photo_front !== undefined) updateData.body_photo_front = body_photo_front;
      if (body_photo_back !== undefined) updateData.body_photo_back = body_photo_back;
      if (body_photo_left !== undefined) updateData.body_photo_left = body_photo_left;
      if (body_photo_right !== undefined) updateData.body_photo_right = body_photo_right;
      
      // Add enhanced body measurements
      if (shoulder_width !== undefined) updateData.shoulder_width = shoulder_width;
      if (chest_circumference !== undefined) updateData.chest_circumference = chest_circumference;
      if (waist_circumference !== undefined) updateData.waist_circumference = waist_circumference;
      if (hip_circumference !== undefined) updateData.hip_circumference = hip_circumference;
      if (inseam !== undefined) updateData.inseam = inseam;
      if (arm_length !== undefined) updateData.arm_length = arm_length;
      if (neck_circumference !== undefined) updateData.neck_circumference = neck_circumference;
      if (torso_length !== undefined) updateData.torso_length = torso_length;

      const result = await usersCollection.findOneAndUpdate(
        { auth_id: req.user.id },
        { $set: updateData },
        { returnDocument: 'after', upsert: true }
      );

      if (!result.value) {
        // If upsert created a new document, fetch it
        const user = await usersCollection.findOne({ auth_id: req.user.id });
        return res.json(user);
      }

      res.json(result.value);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  });

  // GET /api/users/:username - Get user profile by username (public)
  router.get('/:username', async (req, res) => {
    try {
      const { username } = req.params;

      const user = await usersCollection.findOne(
        { username: username.toLowerCase() },
        { projection: { auth_id: 0, email: 0 } } // Hide sensitive fields
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching user by username:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // GET /api/users/check-username/:username - Check if username is available
  router.get('/check-username/:username', async (req, res) => {
    try {
      const { username } = req.params;

      if (!username || username.length < 3) {
        return res.json({ available: false, reason: 'Username must be at least 3 characters' });
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.json({ available: false, reason: 'Username can only contain letters, numbers, and underscores' });
      }

      const existingUser = await usersCollection.findOne({
        username: username.toLowerCase()
      });

      res.json({
        available: !existingUser,
        reason: existingUser ? 'Username is already taken' : null
      });
    } catch (error) {
      console.error('Error checking username:', error);
      res.status(500).json({ error: 'Failed to check username availability' });
    }
  });

  return router;
}
