import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { TournamentState, VoteChoice } from '../types';

/**
 * Configuration for exponential backoff reconnection
 */
const RECONNECT_CONFIG = {
  initialDelay: 1000,      // 1 second
  maxDelay: 30000,         // 30 seconds
  multiplier: 2,           // Double delay each attempt
  maxAttempts: 10          // Maximum reconnection attempts
};

/**
 * Get session token from cookie
 * @returns Session token string or null if not found
 */
function getSessionToken(): string | null {
  if (typeof document === 'undefined') {
    return null; // Server-side rendering
  }

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'meme_session') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Custom hook for WebSocket connection to tournament server
 * Handles connection, disconnection, reconnection with exponential backoff
 * Subscribes to state:update events and provides methods to emit events
 * 
 * @returns Object containing tournament state and methods to interact with server
 */
export function useWebSocket() {
  const [tournamentState, setTournamentState] = useState<TournamentState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasVotedInCurrentMatch, setHasVotedInCurrentMatch] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentMatchIdRef = useRef<string | null>(null);

  /**
   * Calculate exponential backoff delay
   * @param attempt - Current reconnection attempt number
   * @returns Delay in milliseconds
   */
  const getReconnectDelay = useCallback((attempt: number): number => {
    const delay = Math.min(
      RECONNECT_CONFIG.initialDelay * Math.pow(RECONNECT_CONFIG.multiplier, attempt),
      RECONNECT_CONFIG.maxDelay
    );
    return delay;
  }, []);

  /**
   * Attempt to reconnect with exponential backoff
   */
  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptRef.current >= RECONNECT_CONFIG.maxAttempts) {
      setError('Maximum reconnection attempts reached. Please refresh the page.');
      return;
    }

    const delay = getReconnectDelay(reconnectAttemptRef.current);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptRef.current += 1;
      
      if (socketRef.current) {
        socketRef.current.connect();
      }
    }, delay);
  }, [getReconnectDelay]);

  /**
   * Initialize WebSocket connection
   */
  const initializeSocket = useCallback(() => {
    // Get session token from cookie
    const sessionToken = getSessionToken();
    
    // Create socket connection with session token in auth
    const socket = io({
      reconnection: false, // We handle reconnection manually with exponential backoff
      transports: ['websocket', 'polling'],
      auth: {
        sessionToken: sessionToken || undefined
      }
    });

    socketRef.current = socket;

    // Connection event
    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      reconnectAttemptRef.current = 0; // Reset reconnection counter on successful connection
      
      // Clear any pending reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    // Disconnection event
    socket.on('disconnect', (reason) => {
      setIsConnected(false);

      // Attempt reconnection if disconnection was not intentional
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect automatically
        setError('Disconnected by server');
      } else {
        // Network issue or other reason, attempt reconnection
        attemptReconnect();
      }
    });

    // Connection error event
    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      setIsConnected(false);
      setError('Connection error. Retrying...');
      attemptReconnect();
    });

    // State update event
    socket.on('state:update', (state: TournamentState) => {
      setTournamentState(state);
      
      // Check if match has changed
      const newMatchId = state.currentMatch?.id || null;
      const matchChanged = newMatchId !== currentMatchIdRef.current;
      currentMatchIdRef.current = newMatchId;
      
      // Update vote state based on server information
      if (state.userVotedInCurrentMatch !== undefined) {
        // Server provided personalized voting information (e.g., on reconnect)
        setHasVotedInCurrentMatch(state.userVotedInCurrentMatch);
      } else if (matchChanged) {
        // Match changed but no personalized info - reset vote state
        setHasVotedInCurrentMatch(false);
      }
    });

    // Vote locked event - user successfully voted
    socket.on('vote:locked', (payload: { matchId: string }) => {
      setHasVotedInCurrentMatch(true);
    });

    // Vote rejected event - duplicate vote attempt
    socket.on('vote:rejected', (payload: { matchId: string; reason: string }) => {
      console.error('Vote rejected:', payload.reason);
      const errorMessage = payload.reason === 'ALREADY_VOTED' 
        ? 'You have already voted in this match' 
        : 'Match is not active';
      setError(`Vote rejected: ${errorMessage}`);
      setHasVotedInCurrentMatch(true);
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    });

    // Tournament reset event - clear all local state
    socket.on('tournament:reset', (payload: { timestamp: Date }) => {
      // Clear tournament state (returns to waiting screen)
      setTournamentState(null);
      
      // Clear vote tracking
      setHasVotedInCurrentMatch(false);
      currentMatchIdRef.current = null;
      
      // Clear any error messages
      setError(null);
    });

    // Error event
    socket.on('error', (errorPayload: { message: string; code: string }) => {
      console.error('Server error:', errorPayload);
      setError(errorPayload.message);
    });

    return socket;
  }, [attemptReconnect]);

  /**
   * Regenerate session token and reconnect
   * Used for recovery from invalid token errors
   */
  const regenerateSessionToken = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[Security] Regenerating session token...');
      
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' })
      });

      if (!response.ok) {
        console.error('[Security] Failed to regenerate session token');
        return false;
      }

      const data = await response.json();
      console.log('[Security] Session token regenerated:', data.token?.substring(0, 8) + '...');

      // Reconnect with new token
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.auth = { sessionToken: data.token };
        socketRef.current.connect();
      }

      return true;
    } catch (error) {
      console.error('[Security] Error regenerating session token:', error);
      return false;
    }
  }, []);

  /**
   * Cast a vote for a meme in the current match
   * Security Layer 3: Automatically regenerates token and retries if vote fails due to missing token
   * @param matchId - ID of the match to vote in
   * @param choice - Vote choice ('LEFT' or 'RIGHT')
   */
  const castVote = useCallback(async (matchId: string, choice: VoteChoice) => {
    if (!socketRef.current || !isConnected) {
      console.error('Cannot cast vote: not connected');
      setError('Not connected to server');
      return;
    }

    console.log(`Casting vote: ${choice} for match ${matchId}`);
    
    // Set up one-time error handler for this vote
    const voteErrorHandler = async (errorPayload: { message: string; code: string }) => {
      // Check if error is due to missing/invalid session token
      if (errorPayload.code === 'INVALID_SESSION' || errorPayload.code === 'MISSING_SESSION') {
        console.log('[Security] Vote failed due to invalid session, regenerating token...');
        
        // Regenerate token
        const success = await regenerateSessionToken();
        
        if (success) {
          // Retry vote after short delay to allow reconnection
          setTimeout(() => {
            console.log('[Security] Retrying vote with new session token...');
            if (socketRef.current && isConnected) {
              socketRef.current.emit('vote:cast', { matchId, choice });
            }
          }, 500);
        } else {
          setError('Failed to authenticate. Please refresh the page.');
        }
      }
    };

    // Attach error handler for this vote
    socketRef.current.once('error', voteErrorHandler);

    // Emit vote
    socketRef.current.emit('vote:cast', {
      matchId,
      choice
    });

    // Clean up error handler after 5 seconds if no error occurred
    setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.off('error', voteErrorHandler);
      }
    }, 5000);
  }, [isConnected, regenerateSessionToken]);

  /**
   * Start the tournament (admin only)
   * @param votingTimeSeconds - Duration of each match in seconds
   */
  const startTournament = useCallback((votingTimeSeconds: number) => {
    if (!socketRef.current || !isConnected) {
      console.error('Cannot start tournament: not connected');
      setError('Not connected to server');
      return;
    }

    console.log(`Starting tournament with ${votingTimeSeconds}s voting time`);
    socketRef.current.emit('admin:start', {
      votingTimeSeconds
    });
  }, [isConnected]);

  /**
   * Reset the tournament (admin only)
   * Clears all state and returns all clients to waiting screen
   * @returns Promise that resolves with success details or rejects with error
   */
  const resetTournament = useCallback((): Promise<{ deletedFiles: number; errors: any[] }> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !isConnected) {
        console.error('Cannot reset tournament: not connected');
        const errorMsg = 'Not connected to server';
        setError(errorMsg);
        reject(new Error(errorMsg));
        return;
      }

      // Set up one-time listeners for success/error responses
      const successHandler = (response: { message: string; deletedFiles: number; errors: any[] }) => {
        socketRef.current?.off('error', errorHandler);
        resolve(response);
      };

      const errorHandler = (errorPayload: { message: string; code: string }) => {
        console.error('Reset failed:', errorPayload);
        socketRef.current?.off('admin:reset:success', successHandler);
        setError(errorPayload.message);
        reject(new Error(errorPayload.message));
      };

      socketRef.current.once('admin:reset:success', successHandler);
      socketRef.current.once('error', errorHandler);

      // Emit reset request
      socketRef.current.emit('admin:reset', {});
    });
  }, [isConnected]);

  /**
   * Manually reconnect to the server
   */
  const reconnect = useCallback(() => {
    reconnectAttemptRef.current = 0; // Reset attempt counter
    setError(null);
    
    if (socketRef.current) {
      socketRef.current.connect();
    }
  }, []);

  // Initialize socket on mount and cleanup on unmount
  useEffect(() => {
    const socket = initializeSocket();

    // Cleanup function
    return () => {
      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Disconnect socket
      if (socket) {
        socket.disconnect();
      }
    };
  }, [initializeSocket]);

  return {
    tournamentState,
    isConnected,
    error,
    hasVotedInCurrentMatch,
    castVote,
    startTournament,
    resetTournament,
    reconnect
  };
}
