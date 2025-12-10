/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createServer, Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket as ServerSocket } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { ConnectionMapManager } from './connection-map';

/**
 * **Feature: vote-once-per-user, Property 4: Targeted Broadcast Isolation**
 * 
 * For any session token and event emission, only sockets belonging to that session 
 * token should receive the event, and no sockets belonging to other session tokens 
 * should receive it.
 * 
 * **Validates: Requirements 4.2, 4.3**
 */

describe('WebSocket Targeted Broadcast - Property-Based Tests', () => {
  let httpServer: HTTPServer;
  let ioServer: SocketIOServer;
  let connectionMap: ConnectionMapManager;
  let port: number;

  beforeEach(async () => {
    // Create HTTP server
    httpServer = createServer();
    
    // Create Socket.IO server
    ioServer = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Initialize connection map
    connectionMap = new ConnectionMapManager();

    // Find available port and start server
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        if (address && typeof address === 'object') {
          port = address.port;
          resolve();
        }
      });
    });
  });

  afterEach(async () => {
    // Close all connections
    await new Promise<void>((resolve) => {
      ioServer.close(() => {
        httpServer.close(() => {
          resolve();
        });
      });
    });
  });

  /**
   * Helper function to emit event to all sockets belonging to a session token
   * This mimics the emitToUser method in WebSocketServer
   */
  function emitToUser(sessionToken: string, event: string, data: any): void {
    const socketIds = connectionMap.getSocketIds(sessionToken);
    
    socketIds.forEach(socketId => {
      const socket = ioServer.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(event, data);
      }
    });
  }

  /**
   * Helper to create a client connection with a session token
   */
  async function createClient(sessionToken: string): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const client = ioClient(`http://localhost:${port}`, {
        auth: { sessionToken }
      });

      client.on('connect', () => {
        resolve(client);
      });

      client.on('connect_error', (error) => {
        reject(error);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);
    });
  }

  /**
   * Helper to wait for an event with timeout
   */
  function waitForEvent(client: ClientSocket, event: string, timeout: number = 1000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      client.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  /**
   * Helper to check if event is NOT received within timeout
   */
  function expectNoEvent(client: ClientSocket, event: string, timeout: number = 500): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        resolve(); // Success - no event received
      }, timeout);

      client.once(event, (data) => {
        clearTimeout(timer);
        reject(new Error(`Unexpected event received: ${event}`));
      });
    });
  }

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('should emit events only to sockets of the target session token', async () => {
    // Set up server-side connection tracking
    ioServer.on('connection', (socket: ServerSocket) => {
      const auth = socket.handshake.auth;
      const sessionToken = auth.sessionToken || 'default-token';
      connectionMap.addConnection(sessionToken, socket.id);

      socket.on('disconnect', () => {
        connectionMap.removeConnection(socket.id);
      });
    });

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.hexaString({ minLength: 8, maxLength: 16 }),
          fc.hexaString({ minLength: 8, maxLength: 16 })
        ).filter(([token1, token2]) => token1 !== token2),
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 3 }),
        async ([targetToken, otherToken], targetSocketCount, otherSocketCount) => {
          // Create clients for target session
          const targetClients: ClientSocket[] = [];
          const otherClients: ClientSocket[] = [];
          
          try {
            // Create target clients
            for (let i = 0; i < targetSocketCount; i++) {
              const client = await createClient(targetToken);
              targetClients.push(client);
            }

            // Create other clients
            for (let i = 0; i < otherSocketCount; i++) {
              const client = await createClient(otherToken);
              otherClients.push(client);
            }

            // Wait for all connections to be established
            await new Promise(resolve => setTimeout(resolve, 200));

            // Prepare to receive events
            const eventName = 'test:event';
            const eventData = { message: 'test-data', timestamp: Date.now() };

            // Set up listeners for target clients
            const targetPromises = targetClients.map(client => 
              waitForEvent(client, eventName, 3000)
            );

            // Set up listeners for non-target clients (should NOT receive)
            const nonTargetPromises = otherClients.map(client =>
              expectNoEvent(client, eventName, 1500)
            );

            // Emit to target session token only
            emitToUser(targetToken, eventName, eventData);

            // Verify target clients received the event
            const receivedData = await Promise.all(targetPromises);
            for (const data of receivedData) {
              expect(data).toEqual(eventData);
            }

            // Verify non-target clients did NOT receive the event
            await Promise.all(nonTargetPromises);

          } finally {
            // Clean up all clients
            for (const client of targetClients) {
              client.disconnect();
            }
            for (const client of otherClients) {
              client.disconnect();
            }
            // Wait for cleanup
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      ),
      { numRuns: 20 } // Reduced runs due to network overhead
    );
  }, 60000); // 60 second timeout for this test

  it('should handle multiple sockets per session receiving the same event', async () => {
    // Set up server-side connection tracking
    ioServer.on('connection', (socket: ServerSocket) => {
      const auth = socket.handshake.auth;
      const sessionToken = auth.sessionToken || 'default-token';
      connectionMap.addConnection(sessionToken, socket.id);

      socket.on('disconnect', () => {
        connectionMap.removeConnection(socket.id);
      });
    });

    await fc.assert(
      fc.asyncProperty(
        fc.hexaString({ minLength: 8, maxLength: 16 }),
        fc.integer({ min: 2, max: 5 }),
        async (sessionToken, socketCount) => {
          const clients: ClientSocket[] = [];

          try {
            // Create multiple clients with the same session token
            for (let i = 0; i < socketCount; i++) {
              const client = await createClient(sessionToken);
              clients.push(client);
            }

            // Wait for connections to be established
            await new Promise(resolve => setTimeout(resolve, 200));

            // Prepare event
            const eventName = 'test:broadcast';
            const eventData = { value: Math.random() };

            // Set up listeners for all clients
            const promises = clients.map(client => 
              waitForEvent(client, eventName, 3000)
            );

            // Emit to session token
            emitToUser(sessionToken, eventName, eventData);

            // Verify all clients received the event
            const receivedData = await Promise.all(promises);
            for (const data of receivedData) {
              expect(data).toEqual(eventData);
            }

          } finally {
            // Clean up
            for (const client of clients) {
              client.disconnect();
            }
            // Wait for cleanup
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000); // 30 second timeout

  it('should not emit to disconnected sockets', async () => {
    // Set up server-side connection tracking
    ioServer.on('connection', (socket: ServerSocket) => {
      const auth = socket.handshake.auth;
      const sessionToken = auth.sessionToken || 'default-token';
      connectionMap.addConnection(sessionToken, socket.id);

      socket.on('disconnect', () => {
        connectionMap.removeConnection(socket.id);
      });
    });

    await fc.assert(
      fc.asyncProperty(
        fc.hexaString({ minLength: 8, maxLength: 16 }),
        async (sessionToken) => {
          // Create two clients with the same session token
          const client1 = await createClient(sessionToken);
          const client2 = await createClient(sessionToken);

          try {
            // Wait for connections
            await new Promise(resolve => setTimeout(resolve, 200));

            // Disconnect first client
            client1.disconnect();
            await new Promise(resolve => setTimeout(resolve, 200));

            // Prepare event
            const eventName = 'test:after-disconnect';
            const eventData = { test: 'data' };

            // Set up listener for second client only
            const promise = waitForEvent(client2, eventName, 3000);

            // Emit to session token
            emitToUser(sessionToken, eventName, eventData);

            // Verify only the connected client received the event
            const receivedData = await promise;
            expect(receivedData).toEqual(eventData);

          } finally {
            // Clean up
            client2.disconnect();
            // Wait for cleanup
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000); // 30 second timeout

  it('should isolate events between different session tokens with vote:locked scenario', async () => {
    // Set up server-side connection tracking
    ioServer.on('connection', (socket: ServerSocket) => {
      const auth = socket.handshake.auth;
      const sessionToken = auth.sessionToken || 'default-token';
      connectionMap.addConnection(sessionToken, socket.id);

      socket.on('disconnect', () => {
        connectionMap.removeConnection(socket.id);
      });
    });

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.hexaString({ minLength: 8, maxLength: 16 }),
          fc.hexaString({ minLength: 8, maxLength: 16 })
        ).filter(([token1, token2]) => token1 !== token2),
        fc.uuid(),
        async ([voterToken, otherToken], matchId) => {
          // Create clients for two different users
          const voterClient = await createClient(voterToken);
          const otherClient = await createClient(otherToken);

          try {
            // Wait for connections
            await new Promise(resolve => setTimeout(resolve, 200));

            // Prepare vote:locked event (simulating a vote)
            const voteLockedData = { matchId };

            // Set up listeners
            const voterPromise = waitForEvent(voterClient, 'vote:locked', 3000);
            const otherPromise = expectNoEvent(otherClient, 'vote:locked', 1500);

            // Emit vote:locked only to voter
            emitToUser(voterToken, 'vote:locked', voteLockedData);

            // Verify voter received the event
            const receivedData = await voterPromise;
            expect(receivedData).toEqual(voteLockedData);

            // Verify other user did NOT receive the event
            await otherPromise;

          } finally {
            // Clean up
            voterClient.disconnect();
            otherClient.disconnect();
            // Wait for cleanup
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 60000); // 60 second timeout
});
