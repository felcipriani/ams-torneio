// Type definitions for the Meme Championship application
// This file will contain all TypeScript interfaces and types

// ============================================================================
// Core Data Models
// ============================================================================

/**
 * Represents a meme participating in the tournament
 */
export interface Meme {
  id: string;              // UUID
  imageUrl: string;        // Relative path: /uploads/[filename]
  caption: string;         // Short text description
  uploadedAt: Date;        // Timestamp
}

/**
 * Status of a match in the tournament
 */
export type MatchStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

/**
 * Represents a single match between two memes
 */
export interface Match {
  id: string;              // UUID
  roundIndex: number;      // 0-based round number
  matchIndex: number;      // Position within round
  leftMeme: Meme;
  rightMeme: Meme;
  votes: {
    left: number;
    right: number;
  };
  timeRemaining: number;   // Seconds
  totalTime: number;       // Seconds
  status: MatchStatus;
  winner: Meme | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * Represents a round in the tournament bracket
 */
export interface Round {
  roundIndex: number;      // 0-based
  matches: Match[];
  completed: boolean;
}

/**
 * Overall status of the tournament
 */
export type TournamentStatus = 'WAITING' | 'DUEL_IN_PROGRESS' | 'TOURNAMENT_FINISHED';

/**
 * Complete state of the tournament
 */
export interface TournamentState {
  status: TournamentStatus;
  memes: Meme[];
  bracket: Round[];
  currentMatch: Match | null;
  winner: Meme | null;
  config: {
    votingTimeSeconds: number;
  };
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

/**
 * State update message sent from server to clients
 */
export interface StateUpdateMessage {
  type: 'state:update';
  payload: TournamentState;
}

/**
 * Vote choice for a match
 */
export type VoteChoice = 'LEFT' | 'RIGHT';

/**
 * Vote cast message sent from client to server
 */
export interface VoteCastMessage {
  type: 'vote:cast';
  payload: {
    matchId: string;
    choice: VoteChoice;
  };
}

/**
 * Start tournament message sent from admin client to server
 */
export interface StartTournamentMessage {
  type: 'admin:start';
  payload: {
    votingTimeSeconds: number;
  };
}

/**
 * Error message sent from server to clients
 */
export interface ErrorMessage {
  type: 'error';
  payload: {
    message: string;
    code: string;
  };
}

/**
 * Vote locked message sent from server to client after successful vote
 * Sent only to the user who voted
 */
export interface VoteLockedMessage {
  type: 'vote:locked';
  payload: {
    matchId: string;
  };
}

/**
 * Vote rejected message sent from server to client when duplicate vote attempted
 * Sent only to the user who attempted the duplicate vote
 */
export interface VoteRejectedMessage {
  type: 'vote:rejected';
  payload: {
    matchId: string;
    reason: 'ALREADY_VOTED' | 'MATCH_NOT_ACTIVE';
  };
}

/**
 * Socket authentication data sent from client to server on connection
 */
export interface SocketAuth {
  sessionToken: string;
}

/**
 * Union type of all WebSocket messages
 */
export type WebSocketMessage = 
  | StateUpdateMessage 
  | VoteCastMessage 
  | StartTournamentMessage 
  | ErrorMessage
  | VoteLockedMessage
  | VoteRejectedMessage;

// ============================================================================
// Repository Interface (for Liskov Substitution Principle)
// ============================================================================

/**
 * Abstract repository interface for tournament data persistence.
 * This interface allows easy substitution of persistence mechanisms
 * (in-memory, database, etc.) without modifying business logic.
 */
export interface ITournamentRepository {
  // State operations
  getState(): Promise<TournamentState | null>;
  setState(state: TournamentState): Promise<void>;
  clearState(): Promise<void>;
  
  // Meme operations
  addMeme(meme: Meme): Promise<void>;
  getMemes(): Promise<Meme[]>;
  getMemeById(id: string): Promise<Meme | null>;
  deleteMeme(id: string): Promise<void>;
  
  // Match operations
  updateMatch(match: Match): Promise<void>;
  getMatchById(id: string): Promise<Match | null>;
}
