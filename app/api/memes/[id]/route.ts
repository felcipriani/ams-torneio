import { NextRequest, NextResponse } from 'next/server';
import { getRepositoryInstance } from '@/server/repository-singleton';
import fs from 'fs/promises';
import path from 'path';

/**
 * DELETE /api/memes/[id]
 * Deletes a meme from the repository and removes the associated file
 */
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;

    // Get singleton repository instance
    const repository = getRepositoryInstance();

    // Retrieve the meme to get the file path
    const meme = await repository.getMemeById(id);

    if (!meme) {
      return NextResponse.json(
        { error: 'Meme not found' },
        { status: 404 }
      );
    }

    // Delete the meme from repository
    await repository.deleteMeme(id);

    // Delete the associated file from /public/uploads
    try {
      const filePath = path.join(process.cwd(), 'public', meme.imageUrl);
      await fs.unlink(filePath);
    } catch (fileError: any) {
      // Log the error but don't fail the request if file doesn't exist
      console.warn(`Failed to delete file for meme ${id}:`, fileError.message);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Meme deleted successfully',
      deletedMemeId: id
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error deleting meme:', error);
    
    return NextResponse.json(
      { error: 'Failed to delete meme', details: error.message },
      { status: 500 }
    );
  }
}
