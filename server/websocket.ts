import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { TournamentManager } from './tournament-manager';
import { getRepositoryInstance } from './repository-singleton';
import { 
  TournamentState, 
  VoteCastMessage, 
  StartTournamentMessage,
  ErrorMessage 
} from '../types';

/**
 * WebSocket server for real-time tournament communication
 * Handles connection/disconnection events and tracks connected clients
 */
export class WebSocketServer {
  private io: SocketIOServer;
  private tournamentManager: TournamentManager;
  private connectedClients: Set<string> = new Set();

  /**
   * Initialize WebSocket server with HTTP server
   * @param httpServer - HTTP server instance to attach Socket.IO to
   */
  constructor(httpServer: HTTPServer) {
    // Create Socket.IO server
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*', // In production, configure this properly
        methods: ['GET', 'POST']
      }
    });

    // Initialize tournament manager with singleton repository and state change callback
    const repository = getRepositoryInstance();
    this.tournamentManager = new TournamentManager(
      repository,
      (state: TournamentState) => this.broadcastState(state)
    );

    // Initialize empty tournament state
    this.tournamentManager.initializeEmptyState();

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Set up Socket.IO event handlers for connection and disconnection
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Track connected client
      this.connectedClients.add(socket.id);

      // Send current state to newly connected client
      this.sendStateToClient(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      // Register event handlers for this socket
      this.registerSocketHandlers(socket);
    });
  }

  /**
   * Register event handlers for a specific socket
   * @param socket - Socket instance to register handlers for
   */
  private registerSocketHandlers(socket: Socket): void {
    // Vote cast handler
    socket.on('vote:cast', async (message: VoteCastMessage['payload']) => {
      await this.handleVoteCast(socket, message);
    });

    // Admin start tournament handler
    socket.on('admin:start', async (message: StartTournamentMessage['payload']) => {
      await this.handleAdminStart(socket, message);
    });
  }

  /**
   * Send current tournament state to a specific client
   * @param socket - Socket to send state to
   */
  private async sendStateToClient(socket: Socket): Promise<void> {
    try {
      const state = await this.tournamentManager.getState();
      if (state) {
        socket.emit('state:update', state);
      }
    } catch (error) {
      console.error('Error sending state to client:', error);
      this.sendError(socket, 'Failed to retrieve tournament state', 'STATE_ERROR');
    }
  }

  /**
   * Broadcast tournament state to all connected clients
   * Called whenever tournament state changes
   * @param state - Tournament state to broadcast
   */
  private broadcastState(state: TournamentState): void {
    console.log(`Broadcasting state to ${this.connectedClients.size} clients`);
    this.io.emit('state:update', state);
  }

  /**
   * Handle vote:cast event from client
   * Parses vote message, calls TournamentManager.processVote, broadcasts updated state
   * @param socket - Socket that sent the vote
   * @param payload - Vote payload containing matchId and choice
   */
  private async handleVoteCast(
    socket: Socket, 
    payload: VoteCastMessage['payload']
  ): Promise<void> {
    try {
      const { matchId, choice } = payload;

      // Validate payload
      if (!matchId || !choice) {
        this.sendError(socket, 'Invalid vote payload', 'INVALID_VOTE');
        return;
      }

      if (choice !== 'LEFT' && choice !== 'RIGHT') {
        this.sendError(socket, 'Invalid vote choice', 'INVALID_CHOICE');
        return;
      }

      // Process vote through tournament manager
      await this.tournamentManager.processVote(matchId, choice);

      // State will be broadcast automatically via onStateChange callback
      console.log(`Vote processed: ${choice} for match ${matchId}`);
    } catch (error) {
      console.error('Error processing vote:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process vote';
      this.sendError(socket, errorMessage, 'VOTE_ERROR');
    }
  }

  /**
   * Handle admin:start event from client
   * Parses start message, calls TournamentManager.initializeTournament, broadcasts initial state
   * @param socket - Socket that sent the start command
   * @param payload - Start payload containing votingTimeSeconds
   */
  private async handleAdminStart(
    socket: Socket,
    payload: StartTournamentMessage['payload']
  ): Promise<void> {
    try {
      const { votingTimeSeconds } = payload;

      // Validate payload
      if (!votingTimeSeconds || votingTimeSeconds <= 0) {
        this.sendError(socket, 'Invalid voting time', 'INVALID_TIME');
        return;
      }

      // Get memes from repository
      const state = await this.tournamentManager.getState();
      if (!state) {
        this.sendError(socket, 'No tournament state found', 'STATE_ERROR');
        return;
      }

      const memes = state.memes;

      // Validate we have enough memes
      if (memes.length < 2) {
        this.sendError(socket, 'At least 2 memes required to start tournament', 'INSUFFICIENT_MEMES');
        return;
      }

      // Initialize tournament
      await this.tournamentManager.initializeTournament(memes, votingTimeSeconds);

      // State will be broadcast automatically via onStateChange callback
      console.log(`Tournament started with ${memes.length} memes, ${votingTimeSeconds}s voting time`);
    } catch (error) {
      console.error('Error starting tournament:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start tournament';
      this.sendError(socket, errorMessage, 'START_ERROR');
    }
  }

  /**
   * Send error message to a specific client
   * @param socket - Socket to send error to
   * @param message - Error message
   * @param code - Error code
   */
  private sendError(socket: Socket, message: string, code: string): void {
    const errorMessage: ErrorMessage = {
      type: 'error',
      payload: {
        message,
        code
      }
    };
    socket.emit('error', errorMessage.payload);
  }

  /**
   * Get the Socket.IO server instance
   * @returns Socket.IO server instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Get the tournament manager instance
   * @returns Tournament manager instance
   */
  public getTournamentManager(): TournamentManager {
    return this.tournamentManager;
  }

  /**
   * Get count of connected clients
   * @returns Number of connected clients
   */
  public getConnectedClientCount(): number {
    return this.connectedClients.size;
  }
}
