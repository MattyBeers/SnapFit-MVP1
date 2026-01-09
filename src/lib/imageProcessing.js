/**
 * Image Processing Utilities
 * Background removal, image editing, and manipulation
 */

/**
 * Remove background from image using canvas-based processing
 * This is a client-side solution using color similarity detection
 */
export async function removeBackground(imageUrl, options = {}) {
  const {
    threshold = 30, // Color similarity threshold (0-255)
    edgeSmoothing = 2, // Smoothing factor for edges
    targetColor = null // Specific color to remove (default: auto-detect corners)
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Detect background color (sample from corners)
        const bgColor = targetColor || detectBackgroundColor(data, canvas.width, canvas.height);
        
        // Process each pixel
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Calculate color difference
          const diff = Math.sqrt(
            Math.pow(r - bgColor.r, 2) +
            Math.pow(g - bgColor.g, 2) +
            Math.pow(b - bgColor.b, 2)
          );
          
          // Make pixel transparent if it's close to background color
          if (diff < threshold) {
            data[i + 3] = 0; // Set alpha to 0 (transparent)
          } else if (diff < threshold * 1.5) {
            // Smooth edges by reducing alpha gradually
            data[i + 3] = Math.floor((diff - threshold) / (threshold * 0.5) * 255);
          }
        }
        
        // Apply edge smoothing
        if (edgeSmoothing > 0) {
          smoothEdges(imageData, edgeSmoothing);
        }
        
        // Put processed image data back
        ctx.putImageData(imageData, 0, 0);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          resolve({
            url,
            blob,
            width: canvas.width,
            height: canvas.height
          });
        }, 'image/png');
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/**
 * Detect background color by sampling corners
 */
function detectBackgroundColor(data, width, height) {
  const corners = [
    { x: 0, y: 0 }, // Top-left
    { x: width - 1, y: 0 }, // Top-right
    { x: 0, y: height - 1 }, // Bottom-left
    { x: width - 1, y: height - 1 } // Bottom-right
  ];
  
  let totalR = 0, totalG = 0, totalB = 0;
  
  corners.forEach(({ x, y }) => {
    const i = (y * width + x) * 4;
    totalR += data[i];
    totalG += data[i + 1];
    totalB += data[i + 2];
  });
  
  return {
    r: Math.floor(totalR / corners.length),
    g: Math.floor(totalG / corners.length),
    b: Math.floor(totalB / corners.length)
  };
}

/**
 * Smooth edges of transparent areas
 */
function smoothEdges(imageData, radius) {
  const { width, height, data } = imageData;
  const copy = new Uint8ClampedArray(data);
  
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const i = (y * width + x) * 4;
      
      // Only process edge pixels (semi-transparent)
      if (data[i + 3] > 0 && data[i + 3] < 255) {
        let totalAlpha = 0;
        let count = 0;
        
        // Sample surrounding pixels
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ni = ((y + dy) * width + (x + dx)) * 4;
            totalAlpha += copy[ni + 3];
            count++;
          }
        }
        
        // Average alpha
        data[i + 3] = Math.floor(totalAlpha / count);
      }
    }
  }
}

/**
 * Use Remove.bg API for professional background removal
 * Requires API key in .env: VITE_REMOVEBG_API_KEY
 */
export async function removeBgWithAPI(imageFile) {
  const apiKey = import.meta.env.VITE_REMOVEBG_API_KEY;
  
  if (!apiKey) {
    throw new Error('Remove.bg API key not configured');
  }
  
  const formData = new FormData();
  formData.append('image_file', imageFile);
  formData.append('size', 'auto');
  
  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
    },
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Remove.bg API error: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  
  return {
    url,
    blob,
  };
}

/**
 * Manual cutout tool - create a mask from user drawing
 */
export function createManualMask(imageUrl, maskPath) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Create mask from path
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = 'black';
      
      const path = new Path2D(maskPath);
      ctx.fill(path);
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        resolve({ url, blob });
      }, 'image/png');
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/**
 * Crop image to remove excess transparent space
 */
export async function autoCrop(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Find bounds of non-transparent pixels
      let minX = canvas.width, minY = canvas.height;
      let maxX = 0, maxY = 0;
      
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const alpha = data[(y * canvas.width + x) * 4 + 3];
          if (alpha > 0) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }
      
      // Add padding
      const padding = 10;
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(canvas.width, maxX + padding);
      maxY = Math.min(canvas.height, maxY + padding);
      
      // Create cropped canvas
      const croppedWidth = maxX - minX;
      const croppedHeight = maxY - minY;
      const croppedCanvas = document.createElement('canvas');
      const croppedCtx = croppedCanvas.getContext('2d');
      
      croppedCanvas.width = croppedWidth;
      croppedCanvas.height = croppedHeight;
      
      croppedCtx.drawImage(
        canvas,
        minX, minY, croppedWidth, croppedHeight,
        0, 0, croppedWidth, croppedHeight
      );
      
      croppedCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        resolve({ url, blob, width: croppedWidth, height: croppedHeight });
      }, 'image/png');
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/**
 * Adjust brightness and contrast for better visibility
 */
export async function adjustImage(imageUrl, { brightness = 0, contrast = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      
      for (let i = 0; i < data.length; i += 4) {
        // Apply brightness
        data[i] += brightness;
        data[i + 1] += brightness;
        data[i + 2] += brightness;
        
        // Apply contrast
        data[i] = contrastFactor * (data[i] - 128) + 128;
        data[i + 1] = contrastFactor * (data[i + 1] - 128) + 128;
        data[i + 2] = contrastFactor * (data[i + 2] - 128) + 128;
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        resolve({ url, blob });
      }, 'image/png');
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}
