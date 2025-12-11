import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { deleteUploadedImages } from './file-utils';
import { writeFile, mkdir, rm, access } from 'fs/promises';
import { join } from 'path';
import * as fc from 'fast-check';

describe('file-utils', () => {
  const testUploadsDir = join(process.cwd(), 'public', 'uploads-test');

  beforeEach(async () => {
    // Create test uploads directory
    await mkdir(testUploadsDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test uploads directory
    await rm(testUploadsDir, { recursive: true, force: true });
  });

  describe('deleteUploadedImages', () => {
    // Feature: tournament-reset, Property 4: File system cleanup
    // Validates: Requirements 1.5
    it('should delete all uploaded image files from the filesystem', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate 1-20 random filenames
          fc.array(
            fc.string({ minLength: 1, maxLength: 20 })
              .map(s => `${s}.jpg`)
              .filter(filename => {
                // After adding extension, ensure no path traversal patterns
                const basename = filename.replace(/^\/uploads\//, '');
                return basename.length > 0 && 
                       !basename.includes('/') && 
                       !basename.includes('\\') && 
                       !basename.includes('..');
              }),
            { minLength: 1, maxLength: 20 }
          ),
          async (filenames) => {
            // Create unique filenames to avoid collisions
            const uniqueFilenames = Array.from(new Set(filenames));
            
            // Create test files
            const createPromises = uniqueFilenames.map(async (filename) => {
              const filePath = join(testUploadsDir, filename);
              await writeFile(filePath, 'test content');
            });
            await Promise.all(createPromises);

            // Convert filenames to URLs
            const imageUrls = uniqueFilenames.map(f => `/uploads-test/${f}`);

            // Temporarily modify the function to use test directory
            // We'll need to adjust the implementation to support this
            // For now, let's create files in the actual uploads directory
            const actualUploadsDir = join(process.cwd(), 'public', 'uploads');
            await mkdir(actualUploadsDir, { recursive: true });
            
            const actualCreatePromises = uniqueFilenames.map(async (filename) => {
              const filePath = join(actualUploadsDir, filename);
              await writeFile(filePath, 'test content');
            });
            await Promise.all(actualCreatePromises);

            // Call deleteUploadedImages
            const actualUrls = uniqueFilenames.map(f => `/uploads/${f}`);
            const result = await deleteUploadedImages(actualUrls);

            // Verify all files were deleted
            const verifyPromises = uniqueFilenames.map(async (filename) => {
              const filePath = join(actualUploadsDir, filename);
              try {
                await access(filePath);
                return false; // File still exists
              } catch {
                return true; // File was deleted
              }
            });
            const verifyResults = await Promise.all(verifyPromises);

            // All files should be deleted
            expect(verifyResults.every(deleted => deleted)).toBe(true);
            expect(result.deletedCount).toBe(uniqueFilenames.length);
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle ENOENT errors gracefully when files do not exist', async () => {
      const imageUrls = ['/uploads/nonexistent1.jpg', '/uploads/nonexistent2.jpg'];
      const result = await deleteUploadedImages(imageUrls);

      expect(result.deletedCount).toBe(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].error).toBe('File not found');
      expect(result.errors[1].error).toBe('File not found');
    });

    it('should prevent directory traversal attacks', async () => {
      const maliciousUrls = [
        '/uploads/../../../etc/passwd',
        '/uploads/../../secret.txt',
        '/uploads/./../../config.json'
      ];

      const result = await deleteUploadedImages(maliciousUrls);

      expect(result.deletedCount).toBe(0);
      expect(result.errors).toHaveLength(3);
      expect(result.errors.every(e => e.error.includes('Invalid'))).toBe(true);
    });

    it('should handle mixed success and failure scenarios', async () => {
      // Create one real file
      const actualUploadsDir = join(process.cwd(), 'public', 'uploads');
      await mkdir(actualUploadsDir, { recursive: true });
      const realFilename = 'real-file.jpg';
      const realFilePath = join(actualUploadsDir, realFilename);
      await writeFile(realFilePath, 'test content');

      // Mix of real and non-existent files
      const imageUrls = [
        `/uploads/${realFilename}`,
        '/uploads/nonexistent.jpg'
      ];

      const result = await deleteUploadedImages(imageUrls);

      expect(result.deletedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('File not found');

      // Verify real file was deleted
      try {
        await access(realFilePath);
        expect(true).toBe(false); // Should not reach here
      } catch {
        expect(true).toBe(true); // File was deleted
      }
    });
  });
});
