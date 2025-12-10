/**
 * Connection Map Manager
 * 
 * Manages bidirectional mapping between session tokens and WebSocket socket IDs.
 * Allows efficient lookup in both directions and handles connection lifecycle.
 */

export class ConnectionMapManager {
  // Map: sessionToken → Set<socketId>
  private tokenToSockets: Map<string, Set<string>>;
  
  // Map: socketId → sessionToken (reverse lookup)
  private socketToToken: Map<string, string>;

  constructor() {
    this.tokenToSockets = new Map();
    this.socketToToken = new Map();
  }

  /**
   * Add a socket connection for a session token
   * @param sessionToken - User's session token
   * @param socketId - Socket.IO socket ID
   */
  addConnection(sessionToken: string, socketId: string): void {
    // Add to tokenToSockets map
    if (!this.tokenToSockets.has(sessionToken)) {
      this.tokenToSockets.set(sessionToken, new Set());
    }
    this.tokenToSockets.get(sessionToken)!.add(socketId);

    // Add to socketToToken map (reverse lookup)
    this.socketToToken.set(socketId, sessionToken);
  }

  /**
   * Remove a socket connection
   * @param socketId - Socket.IO socket ID to remove
   */
  removeConnection(socketId: string): void {
    // Get the session token for this socket
    const sessionToken = this.socketToToken.get(socketId);
    
    if (sessionToken) {
      // Remove from tokenToSockets map
      const sockets = this.tokenToSockets.get(sessionToken);
      if (sockets) {
        sockets.delete(socketId);
        
        // If no more sockets for this token, remove the token entry
        if (sockets.size === 0) {
          this.tokenToSockets.delete(sessionToken);
        }
      }
      
      // Remove from socketToToken map
      this.socketToToken.delete(socketId);
    }
  }

  /**
   * Get all socket IDs for a session token
   * @param sessionToken - User's session token
   * @returns Array of active socket IDs
   */
  getSocketIds(sessionToken: string): string[] {
    const sockets = this.tokenToSockets.get(sessionToken);
    return sockets ? Array.from(sockets) : [];
  }

  /**
   * Get session token for a socket ID
   * @param socketId - Socket.IO socket ID
   * @returns Session token or null if not found
   */
  getSessionToken(socketId: string): string | null {
    return this.socketToToken.get(socketId) ?? null;
  }

  /**
   * Clean up stale connections (optional maintenance)
   * This method can be called periodically to ensure data structure consistency
   */
  cleanup(): void {
    // Remove any empty socket sets from tokenToSockets
    for (const [token, sockets] of this.tokenToSockets.entries()) {
      if (sockets.size === 0) {
        this.tokenToSockets.delete(token);
      }
    }

    // Verify bidirectional consistency
    // Remove any socketToToken entries that don't have corresponding tokenToSockets entries
    for (const [socketId, token] of this.socketToToken.entries()) {
      const sockets = this.tokenToSockets.get(token);
      if (!sockets || !sockets.has(socketId)) {
        this.socketToToken.delete(socketId);
      }
    }
  }

  /**
   * Get the total number of active connections
   * @returns Total number of socket connections
   */
  getConnectionCount(): number {
    return this.socketToToken.size;
  }

  /**
   * Get the number of unique session tokens
   * @returns Number of unique users/sessions
   */
  getSessionCount(): number {
    return this.tokenToSockets.size;
  }

  /**
   * Clear all connections (useful for testing or reset)
   */
  clear(): void {
    this.tokenToSockets.clear();
    this.socketToToken.clear();
  }
}
