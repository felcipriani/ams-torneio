import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { TournamentManager } from './tournament-manager';
import { getRepositoryInstance } from './repository-singleton';
import { ConnectionMapManager } from './connection-map';
import { VoteLockManager } from './vote-lock-manager';
import { SessionTokenGenerator } from './session-token';
import { 
  TournamentState, 
  VoteCastMessage, 
  StartTournamentMessage,
  ErrorMessage,
  VoteLockedMessage,
  VoteRejectedMessage
} from '../types';

/**
 * WebSocket server for real-time tournament communication
 * Handles connection/disconnection events and tracks connected clients
 */
export class WebSocketServer {
  private io: SocketIOServer;
  private tournamentManager: TournamentManager;
  private connectedClients: Set<string> = new Set();
  private connectionMap: ConnectionMapManager;
  private voteLockManager: VoteLockManager;
  private sessionTokenGenerator: SessionTokenGenerator;

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

    // Initialize session tracking components
    this.connectionMap = new ConnectionMapManager();
    this.voteLockManager = new VoteLockManager();
    this.sessionTokenGenerator = new SessionTokenGenerator();

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
      
      // Extract or generate session token
      const sessionToken = this.getSessionTokenFromSocket(socket);
      console.log(`Session token for ${socket.id}: ${sessionToken.substring(0, 8)}...`);
      
      // Add socket to connection map
      this.connectionMap.addConnection(sessionToken, socket.id);
      
      // Track connected client
      this.connectedClients.add(socket.id);

      // Send current state to newly connected client
      this.sendStateToClient(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        
        // Remove socket from connection map
        this.connectionMap.removeConnection(socket.id);
        
        this.connectedClients.delete(socket.id);
      });

      // Register event handlers for this socket
      this.registerSocketHandlers(socket);
    });
  }

  /**
   * Get session token from socket
   * First tries to get from socket auth, then generates from IPv4
   * @param socket - Socket instance
   * @returns Session token
   */
  private getSessionTokenFromSocket(socket: Socket): string {
    // Try to get session token from auth (sent by client)
    const auth = socket.handshake.auth;
    if (auth && auth.sessionToken && typeof auth.sessionToken === 'string') {
      return auth.sessionToken;
    }
    
    // Generate from IPv4 if not provided
    return this.sessionTokenGenerator.generateTokenFromSocket(socket);
  }

  /**
   * Emit event to all sockets belonging to a session token
   * @param sessionToken - Target user's session token
   * @param event - Event name
   * @param data - Event payload
   */
  private emitToUser(sessionToken: string, event: string, data: any): void {
    const socketIds = this.connectionMap.getSocketIds(sessionToken);
    
    socketIds.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(event, data);
      }
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
   * Checks vote locks before processing, emits vote:rejected if already voted,
   * records vote lock and emits vote:locked after successful vote
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

      // Extract session token from socket
      const sessionToken = this.getSessionTokenFromSocket(socket);

      // Check if user has already voted in this match
      if (this.voteLockManager.hasVoted(sessionToken, matchId)) {
        console.log(`Vote rejected: User ${sessionToken.substring(0, 8)}... already voted in match ${matchId}`);
        
        // Emit vote:rejected error to user only
        const rejectedMessage: VoteRejectedMessage = {
          type: 'vote:rejected',
          payload: {
            matchId,
            reason: 'ALREADY_VOTED'
          }
        };
        this.emitToUser(sessionToken, 'vote:rejected', rejectedMessage.payload);
        return;
      }

      // Process vote through tournament manager
      await this.tournamentManager.processVote(matchId, choice);

      // Record vote lock for this user
      this.voteLockManager.recordVote(sessionToken, matchId);

      // Emit vote:locked event to user's sockets only
      const lockedMessage: VoteLockedMessage = {
        type: 'vote:locked',
        payload: {
          matchId
        }
      };
      this.emitToUser(sessionToken, 'vote:locked', lockedMessage.payload);

      // State will be broadcast automatically via onStateChange callback
      console.log(`Vote processed: ${choice} for match ${matchId} by user ${sessionToken.substring(0, 8)}...`);
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

  /**
   * Get the connection map manager instance
   * @returns Connection map manager instance
   */
  public getConnectionMapManager(): ConnectionMapManager {
    return this.connectionMap;
  }

  /**
   * Get the vote lock manager instance
   * @returns Vote lock manager instance
   */
  public getVoteLockManager(): VoteLockManager {
    return this.voteLockManager;
  }

  /**
   * Get the session token generator instance
   * @returns Session token generator instance
   */
  public getSessionTokenGenerator(): SessionTokenGenerator {
    return this.sessionTokenGenerator;
  }
}
