import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/session - Generate or regenerate session token
 * 
 * This endpoint generates a new session token and sets it as a cookie.
 * Used for:
 * 1. Initial page load (clear any existing token)
 * 2. Tournament start (generate fresh token)
 * 3. Recovery from invalid token errors
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'generate';

    if (action === 'clear') {
      // Clear the session cookie
      const cookieStore = await cookies();
      cookieStore.delete('meme_session');

      return NextResponse.json({ 
        success: true, 
        action: 'cleared',
        message: 'Session token cleared' 
      });
    }

    if (action === 'generate') {
      // Generate a new random session token
      // This is a client-side token that will be validated/replaced by server
      const randomToken = generateRandomToken();

      // Set cookie with the new token
      const cookieStore = await cookies();
      cookieStore.set('meme_session', randomToken, {
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });

      return NextResponse.json({ 
        success: true, 
        action: 'generated',
        token: randomToken,
        message: 'New session token generated' 
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error managing session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to manage session' },
      { status: 500 }
    );
  }
}

/**
 * Generate a random session token
 * This is a temporary token that will be replaced by the server
 * with a deterministic token based on IP address
 */
function generateRandomToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
