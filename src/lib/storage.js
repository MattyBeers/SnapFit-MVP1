/**
 * Supabase Storage Utilities
 * Handles image uploads to Supabase Storage buckets
 */

import { supabase } from './supabaseClient';

const BUCKET_NAME = 'closet-items';

/**
 * Upload image to Supabase Storage
 * @param {File} file - Image file
 * @param {string} userId - User's Supabase UID
 * @param {string} folder - Optional subfolder (default: root of user folder)
 * @returns {Promise<string>} Public URL of uploaded image
 */
export async function uploadImage(file, userId, folder = '') {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    // Generate unique filename
    // Handle both File objects and Blobs (Blobs may not have .name property)
    const fileExt = file.name ? file.name.split('.').pop() : 'png';
    const folderPath = folder ? `${folder}/` : '';
    const fileName = `${userId}/${folderPath}${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Delete image from Supabase Storage
 * @param {string} imageUrl - Public URL of image to delete
 * @param {string} userId - User's Supabase UID (for verification)
 * @returns {Promise<boolean>} Success status
 */
export async function deleteImage(imageUrl, userId) {
  if (!supabase) return false;

  try {
    // Extract file path from public URL
    const urlParts = imageUrl.split(`${BUCKET_NAME}/`);
    if (urlParts.length < 2) return false;

    const filePath = urlParts[1];

    // Verify file belongs to user
    if (!filePath.startsWith(userId)) {
      console.error('Cannot delete image: not owned by user');
      return false;
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}

/**
 * Compress image before upload
 * @param {File} file - Original image file
 * @param {number} maxWidth - Max width in pixels (default 1200)
 * @param {number} maxHeight - Max height in pixels (default 1200)
 * @param {number} quality - JPEG quality 0-1 (default 0.8)
 * @returns {Promise<File>} Compressed image file
 */
export async function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to Blob then to File
        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
