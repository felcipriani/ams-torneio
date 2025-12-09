import { NextResponse } from 'next/server';
import { InMemoryTournamentRepository } from '@/server/in-memory-repository';

// Create a singleton repository instance
const repository = new InMemoryTournamentRepository();

/**
 * GET /api/memes
 * Retrieves all uploaded memes from the repository
 */
export async function GET() {
  try {
    // Retrieve memes from repository
    const memes = await repository.getMemes();

    // Return JSON array
    return NextResponse.json({
      success: true,
      memes
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error retrieving memes:', error);
    
    return NextResponse.json(
      { error: 'Failed to retrieve memes', details: error.message },
      { status: 500 }
    );
  }
}
