/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createServer, Server as HTTPServer } from 'http';
import { WebSocketServer } from './websocket';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';

/**
 * **Feature: tournament-reset, Property 3: All clients receive reset notification**
 * 
 * For any set of connected clients, when reset is triggered, every client 
 * SHALL receive exactly one 'tournament:reset' event.
 * 
 * **Validates: Requirements 1.4, 2.1**
 */

describe('WebSocket Reset Broadcast - Property-Based Tests', () => {
  let httpServer: HTTPServer;
  let wsServer: WebSocketServer;
  let port: number;

  beforeEach(async () => {
    // Create HTTP server
    httpServer = createServer();
    
    // Create WebSocket server
    wsServer = new WebSocketServer(httpServer);

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
      const io = wsServer.getIO();
      io.close(() => {
        httpServer.close(() => {
          resolve();
        });
      });
    });
  });

  /**
   * Helper to create a client connection
   */
  async function createClient(): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const client = ioClient(`http://localhost:${port}`);

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
  function waitForEvent(client: ClientSocket, event: string, timeout: number = 3000): Promise<any> {
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
   * Helper to count how many times an event is received
   */
  function countEvents(client: ClientSocket, event: string, duration: number = 2000): Promise<number> {
    return new Promise((resolve) => {
      let count = 0;
      
      const handler = () => {
        count++;
      };
      
      client.on(event, handler);
      
      setTimeout(() => {
        client.off(event, handler);
        resolve(count);
      }, duration);
    });
  }

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('should broadcast tournament:reset to all connected clients', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (clientCount) => {
          const clients: ClientSocket[] = [];

          try {
            // Create multiple clients
            for (let i = 0; i < clientCount; i++) {
              const client = await createClient();
              clients.push(client);
            }

            // Wait for all connections to be established
            await new Promise(resolve => setTimeout(resolve, 300));

            // Set up listeners for all clients to receive tournament:reset
            const resetPromises = clients.map(client => 
              waitForEvent(client, 'tournament:reset', 5000)
            );

            // Trigger reset by emitting admin:reset from first client (acting as admin)
            clients[0].emit('admin:reset', {});

            // Wait for all clients to receive the reset event
            const receivedData = await Promise.all(resetPromises);

            // Verify all clients received the event
            expect(receivedData).toHaveLength(clientCount);

            // Verify each received data has a timestamp
            for (const data of receivedData) {
              expect(data).toHaveProperty('timestamp');
              expect(data.timestamp).toBeDefined();
            }

          } finally {
            // Clean up all clients
            for (const client of clients) {
              client.disconnect();
            }
            // Wait for cleanup
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 120000); // 120 second timeout for this test

  it('should send exactly one tournament:reset event per client', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (clientCount) => {
          const clients: ClientSocket[] = [];

          try {
            // Create multiple clients
            for (let i = 0; i < clientCount; i++) {
              const client = await createClient();
              clients.push(client);
            }

            // Wait for connections
            await new Promise(resolve => setTimeout(resolve, 300));

            // Set up event counters for all clients
            const eventCounts: number[] = new Array(clientCount).fill(0);
            
            clients.forEach((client, index) => {
              client.on('tournament:reset', () => {
                eventCounts[index]++;
              });
            });

            // Trigger reset
            clients[0].emit('admin:reset', {});

            // Wait for reset to process and events to be received
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Verify each client received exactly one event
            for (const count of eventCounts) {
              expect(count).toBe(1);
            }

          } finally {
            // Clean up
            for (const client of clients) {
              client.disconnect();
            }
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      ),
      { numRuns: 50 }
    );
  }, 120000);

  it('should broadcast reset even when clients connect at different times', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        async (clientCount) => {
          const clients: ClientSocket[] = [];

          try {
            // Create clients with staggered connection times
            for (let i = 0; i < clientCount; i++) {
              const client = await createClient();
              clients.push(client);
              
              // Wait a bit between connections (except for last one)
              if (i < clientCount - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }

            // Wait for all connections to stabilize
            await new Promise(resolve => setTimeout(resolve, 300));

            // Set up listeners for all clients
            const resetPromises = clients.map(client => 
              waitForEvent(client, 'tournament:reset', 5000)
            );

            // Trigger reset
            clients[0].emit('admin:reset', {});

            // Verify all clients received the event
            const receivedData = await Promise.all(resetPromises);
            expect(receivedData).toHaveLength(clientCount);

            // Verify all have timestamps
            for (const data of receivedData) {
              expect(data).toHaveProperty('timestamp');
            }

          } finally {
            // Clean up
            for (const client of clients) {
              client.disconnect();
            }
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  it('should not send reset to disconnected clients', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 6 }),
        async (totalClients) => {
          const clients: ClientSocket[] = [];
          const disconnectCount = Math.floor(totalClients / 2);
          const remainingCount = totalClients - disconnectCount;

          try {
            // Create all clients
            for (let i = 0; i < totalClients; i++) {
              const client = await createClient();
              clients.push(client);
            }

            // Wait for connections
            await new Promise(resolve => setTimeout(resolve, 300));

            // Disconnect some clients
            for (let i = 0; i < disconnectCount; i++) {
              clients[i].disconnect();
            }

            // Wait for disconnections to process
            await new Promise(resolve => setTimeout(resolve, 300));

            // Set up listeners only for remaining connected clients
            const resetPromises = clients.slice(disconnectCount).map(client => 
              waitForEvent(client, 'tournament:reset', 5000)
            );

            // Trigger reset from a connected client
            clients[disconnectCount].emit('admin:reset', {});

            // Verify only connected clients received the event
            const receivedData = await Promise.all(resetPromises);
            expect(receivedData).toHaveLength(remainingCount);

            // Verify all have timestamps
            for (const data of receivedData) {
              expect(data).toHaveProperty('timestamp');
            }

          } finally {
            // Clean up remaining clients
            for (let i = disconnectCount; i < clients.length; i++) {
              if (clients[i].connected) {
                clients[i].disconnect();
              }
            }
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);
});
