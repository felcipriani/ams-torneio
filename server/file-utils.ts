import { unlink } from 'fs/promises';
import { join, normalize } from 'path';

/**
 * Result of deleting uploaded images
 */
export interface DeleteResult {
  deletedCount: number;
  errors: Array<{ url: string; error: string }>;
}

/**
 * Delete uploaded meme images from filesystem
 * 
 * @param imageUrls - Array of image URLs (e.g., ['/uploads/abc.jpg'])
 * @returns Object with success count and errors
 */
export async function deleteUploadedImages(imageUrls: string[]): Promise<DeleteResult> {
  const result: DeleteResult = {
    deletedCount: 0,
    errors: []
  };

  // Delete files in parallel using Promise.all
  const deletePromises = imageUrls.map(async (url) => {
    try {
      // Validate path to prevent directory traversal attacks
      // Extract filename from URL (e.g., '/uploads/abc.jpg' -> 'abc.jpg')
      const filename = url.replace(/^\/uploads\//, '');
      
      // Ensure the filename doesn't contain path traversal sequences
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        throw new Error('Invalid filename: path traversal detected');
      }
      
      // Construct safe path to file in /public/uploads
      const filePath = join(process.cwd(), 'public', 'uploads', filename);
      
      // Normalize path to resolve any remaining path issues
      const normalizedPath = normalize(filePath);
      
      // Ensure the normalized path is still within the uploads directory
      const uploadsDir = normalize(join(process.cwd(), 'public', 'uploads'));
      if (!normalizedPath.startsWith(uploadsDir)) {
        throw new Error('Invalid path: outside uploads directory');
      }
      
      // Delete the file
      await unlink(normalizedPath);
      result.deletedCount++;
    } catch (error: any) {
      // Handle ENOENT (file not found) gracefully
      if (error.code === 'ENOENT') {
        result.errors.push({
          url,
          error: 'File not found'
        });
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        // Handle permission errors
        result.errors.push({
          url,
          error: 'Permission denied'
        });
      } else {
        // Handle other errors
        result.errors.push({
          url,
          error: error.message || 'Unknown error'
        });
      }
    }
  });

  // Wait for all deletions to complete
  await Promise.all(deletePromises);

  return result;
}
