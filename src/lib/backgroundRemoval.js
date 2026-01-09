/**
 * AI-Powered Background Removal for Clothing Items
 * Removes backgrounds to create clean, transparent PNGs for VFR
 */

/**
 * Remove background using multiple AI providers (with fallbacks)
 * Priority: remove.bg API → Hugging Face → Local canvas processing
 */
export async function removeClothingBackground(imageFile, options = {}) {
  const {
    provider = 'auto', // 'removebg', 'huggingface', 'local', 'auto'
    quality = 'high', // 'high', 'medium', 'preview'
    neutralBackground = false, // If true, replaces with neutral color instead of transparent
    backgroundColor = '#000000' // Color for neutral background
  } = options;

  console.log('🎨 Removing background from clothing item...');

  try {
    // Try providers in order based on setting
    if (provider === 'auto' || provider === 'removebg') {
      const result = await tryRemoveBG(imageFile, quality);
      if (result) {
        console.log('✅ Background removed via Remove.bg');
        return await applyBackgroundOption(result, neutralBackground, backgroundColor);
      }
    }

    if (provider === 'auto' || provider === 'huggingface') {
      const result = await tryHuggingFace(imageFile, quality);
      if (result) {
        console.log('✅ Background removed via Hugging Face');
        return await applyBackgroundOption(result, neutralBackground, backgroundColor);
      }
    }

    // Fallback to local processing
    console.log('⚠️ Using local background removal (lower quality)');
    const result = await localBackgroundRemoval(imageFile, quality);
    return await applyBackgroundOption(result, neutralBackground, backgroundColor);

  } catch (error) {
    console.error('❌ Background removal failed:', error);
    // Return original if all methods fail
    return {
      url: URL.createObjectURL(imageFile),
      blob: imageFile,
      method: 'original',
      hasTransparency: false
    };
  }
}

/**
 * Remove.bg API integration (Best quality, but paid)
 */
async function tryRemoveBG(imageFile, quality) {
  const apiKey = import.meta.env.VITE_REMOVEBG_API_KEY;
  
  if (!apiKey) {
    console.log('ℹ️ Remove.bg API key not configured');
    return null;
  }

  try {
    const formData = new FormData();
    formData.append('image_file', imageFile);
    formData.append('size', quality === 'preview' ? 'preview' : 'full');
    formData.append('type', 'product'); // Optimized for product/clothing photos

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Remove.bg API error: ${response.status}`);
    }

    const blob = await response.blob();
    blob.name = imageFile.name || 'processed-image.png';
    return {
      url: URL.createObjectURL(blob),
      blob,
      method: 'removebg',
      hasTransparency: true
    };

  } catch (error) {
    console.warn('Remove.bg failed:', error.message);
    return null;
  }
}

/**
 * Hugging Face BRIA RMBG (Free, open-source, good quality)
 */
async function tryHuggingFace(imageFile, quality) {
  const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    console.log('ℹ️ Hugging Face API key not configured');
    return null;
  }

  try {
    // Call our backend proxy to avoid CORS issues
    const arrayBuffer = await imageFile.arrayBuffer();
    
    // Using our backend proxy which calls Hugging Face BRIA RMBG 1.4
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/background-removal`,
      {
        method: 'POST',
        headers: {
          'Content-Type': imageFile.type || 'image/jpeg'
        },
        body: arrayBuffer
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Background removal error:', errorData);
      throw new Error(`Background removal failed: ${response.status}`);
    }

    const blob = await response.blob();
    blob.name = imageFile.name || 'processed-image.png';
    console.log('Hugging Face response blob type:', blob.type, 'size:', blob.size);
    
    return {
      url: URL.createObjectURL(blob),
      blob,
      method: 'huggingface',
      hasTransparency: true
    };

  } catch (error) {
    console.warn('Hugging Face failed:', error.message);
    return null;
  }
}

/**
 * Local canvas-based background removal (Fallback)
 * Uses color detection and edge smoothing
 */
async function localBackgroundRemoval(imageFile, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Resize for performance if needed
        const maxSize = quality === 'preview' ? 800 : quality === 'medium' ? 1200 : 2400;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // Draw image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Detect background color (sample corners and edges)
        const bgColor = detectBackgroundColor(data, canvas.width, canvas.height);
        
        console.log('🎨 Detected background color:', bgColor);

        // Find the center subject (clothing) using brightness and edge detection
        const subjectMask = detectCenterSubject(data, canvas.width, canvas.height, bgColor);
        
        // Remove background using mask - only remove pixels NOT in the subject
        const threshold = 60; // Moderate threshold
        
        for (let i = 0; i < data.length; i += 4) {
          const pixelIndex = i / 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // If pixel is marked as subject (clothing), keep it
          if (subjectMask[pixelIndex]) {
            continue; // Keep the clothing pixel as-is
          }

          // Calculate color distance for non-subject pixels
          const distance = Math.sqrt(
            Math.pow(r - bgColor.r, 2) +
            Math.pow(g - bgColor.g, 2) +
            Math.pow(b - bgColor.b, 2)
          );

          // Make transparent if close to background
          if (distance < threshold) {
            data[i + 3] = 0; // Fully transparent
          } else if (distance < threshold * 1.5) {
            // Feather edges
            const alpha = ((distance - threshold) / (threshold * 0.5)) * 255;
            data[i + 3] = Math.min(255, Math.max(0, alpha));
          }
        }

        // Apply smoothing to edges
        smoothEdges(imageData, 2);

        // Put back processed data
        ctx.putImageData(imageData, 0, 0);

        // Convert to blob
        canvas.toBlob((blob) => {
          blob.name = imageFile.name || 'processed-image.png';
          resolve({
            url: URL.createObjectURL(blob),
            blob,
            method: 'local',
            hasTransparency: true
          });
        }, 'image/png');

      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    reader.onerror = () => reject(new Error('Failed to read file'));
    
    reader.readAsDataURL(imageFile);
  });
}

/**
 * Detect center subject (clothing item) using brightness and position
 * Returns a boolean mask where true = subject pixel, false = background pixel
 */
function detectCenterSubject(data, width, height, bgColor) {
  const mask = new Array(width * height).fill(false);
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Find pixels that are significantly different from background
  // and closer to center (where clothing usually is)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      // Distance from background color
      const colorDist = Math.sqrt(
        Math.pow(r - bgColor.r, 2) +
        Math.pow(g - bgColor.g, 2) +
        Math.pow(b - bgColor.b, 2)
      );
      
      // Distance from center (normalized)
      const distFromCenter = Math.sqrt(
        Math.pow(x - centerX, 2) + 
        Math.pow(y - centerY, 2)
      ) / Math.sqrt(width * width + height * height);
      
      // Brightness of pixel
      const brightness = (r + g + b) / 3;
      
      // Subject is usually:
      // 1. Different from background color
      // 2. Closer to center
      // 3. Has reasonable brightness (not pure black/white background)
      const isDifferentFromBg = colorDist > 50;
      const isNearCenter = distFromCenter < 0.6; // Within 60% of image
      const hasReasonableBrightness = brightness > 20 && brightness < 235;
      
      if (isDifferentFromBg && isNearCenter && hasReasonableBrightness) {
        mask[y * width + x] = true;
      }
    }
  }
  
  return mask;
}

/**
 * Detect background color by sampling corners and edges
 */
function detectBackgroundColor(data, width, height) {
  const samples = [];
  const sampleSize = 10; // Sample 10x10 pixels from each corner

  // Sample corners
  const corners = [
    { x: 0, y: 0 }, // Top-left
    { x: width - sampleSize, y: 0 }, // Top-right
    { x: 0, y: height - sampleSize }, // Bottom-left
    { x: width - sampleSize, y: height - sampleSize } // Bottom-right
  ];

  corners.forEach(corner => {
    for (let x = corner.x; x < corner.x + sampleSize && x < width; x++) {
      for (let y = corner.y; y < corner.y + sampleSize && y < height; y++) {
        const idx = (y * width + x) * 4;
        samples.push({
          r: data[idx],
          g: data[idx + 1],
          b: data[idx + 2]
        });
      }
    }
  });

  // Calculate average
  const avg = samples.reduce(
    (acc, color) => ({
      r: acc.r + color.r,
      g: acc.g + color.g,
      b: acc.b + color.b
    }),
    { r: 0, g: 0, b: 0 }
  );

  return {
    r: Math.round(avg.r / samples.length),
    g: Math.round(avg.g / samples.length),
    b: Math.round(avg.b / samples.length)
  };
}

/**
 * Smooth edges to reduce jaggedness
 */
function smoothEdges(imageData, radius) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const alphaCopy = new Uint8ClampedArray(width * height);

  // Copy alpha channel
  for (let i = 0; i < data.length; i += 4) {
    alphaCopy[i / 4] = data[i + 3];
  }

  // Apply box blur to alpha channel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            sum += alphaCopy[ny * width + nx];
            count++;
          }
        }
      }

      const idx = (y * width + x) * 4;
      data[idx + 3] = Math.round(sum / count);
    }
  }
}

/**
 * Apply background option (transparent or neutral color)
 */
async function applyBackgroundOption(result, neutralBackground, backgroundColor) {
  if (!neutralBackground || !result.hasTransparency) {
    return result;
  }

  // Replace transparent with solid color
  return new Promise((resolve) => {
    const img = new Image();
    img.src = result.url;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = img.width;
      canvas.height = img.height;

      // Fill with background color
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw transparent image on top
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        // Preserve filename from original blob
        blob.name = result.blob.name || 'processed-image.png';
        resolve({
          url: URL.createObjectURL(blob),
          blob,
          method: result.method,
          hasTransparency: false,
          backgroundColor
        });
      }, 'image/png');
    };
  });
}

/**
 * Quick preview: Fast, low-res background removal for instant feedback
 */
export async function previewBackgroundRemoval(imageFile) {
  return removeClothingBackground(imageFile, {
    provider: 'local',
    quality: 'preview',
    neutralBackground: false
  });
}

/**
 * Batch process multiple images
 */
export async function batchRemoveBackgrounds(imageFiles, options = {}) {
  const results = [];
  
  for (let i = 0; i < imageFiles.length; i++) {
    console.log(`Processing ${i + 1}/${imageFiles.length}...`);
    try {
      const result = await removeClothingBackground(imageFiles[i], options);
      results.push({ success: true, ...result });
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }
  
  return results;
}

/**
 * Check if image has transparent background
 */
export async function hasTransparentBackground(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Check if any pixel has alpha < 255
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          resolve(true);
          return;
        }
      }
      
      resolve(false);
    };
    
    img.onerror = () => resolve(false);
    img.src = imageUrl;
  });
}
