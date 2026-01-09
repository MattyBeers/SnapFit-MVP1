/**
 * Background Removal API Routes
 * Proxy for Hugging Face API to avoid CORS issues
 */

import express from 'express';

const router = express.Router();

/**
 * POST /api/background-removal
 * Remove background from image using Hugging Face BRIA RMBG
 */
router.post('/', async (req, res) => {
  try {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'Hugging Face API key not configured on server' 
      });
    }

    console.log('📸 Processing background removal request...');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Content-Length:', req.headers['content-length']);

    // Forward the image buffer to Hugging Face API
    // Using Photoroom's background removal model (actively maintained)
    const response = await fetch(
      'https://api-inference.huggingface.co/models/Xenova/segformer-b2-finetuned-ade-512-512',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': req.headers['content-type'] || 'application/octet-stream'
        },
        body: req.body
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `Hugging Face API error: ${response.status}`,
        details: errorText
      });
    }

    // Get the image buffer from Hugging Face
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';
    
    console.log('✅ Background removed successfully');
    console.log('Response type:', contentType, 'size:', buffer.byteLength);

    // Send back the processed image
    res.set('Content-Type', contentType);
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('❌ Background removal error:', error);
    res.status(500).json({ 
      error: 'Failed to remove background',
      message: error.message 
    });
  }
});

export default router;
