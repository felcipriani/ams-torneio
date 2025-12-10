/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ConnectionMapManager } from './connection-map';

/**
 * **Feature: vote-once-per-user, Property 3: Connection Map Consistency**
 * 
 * For any session token, the set of socket IDs returned by `getSocketIds` should 
 * exactly match the socket IDs that were added via `addConnection` and not removed 
 * via `removeConnection`.
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */

describe('ConnectionMapManager - Property-Based Tests', () => {
  let connectionMap: ConnectionMapManager;

  beforeEach(() => {
    connectionMap = new ConnectionMapManager();
  });

  // ============================================================================
  // Arbitraries (Generators) for fast-check
  // ============================================================================

  /**
   * Generate a random session token (simulating hashed IPv4)
   */
  const sessionTokenArbitrary = fc.hexaString({ minLength: 64, maxLength: 64 });

  /**
   * Generate a random socket ID (simulating Socket.IO socket IDs)
   */
  const socketIdArbitrary = fc.uuid();

  /**
   * Generate a connection operation (add or remove)
   */
  type ConnectionOperation = 
    | { type: 'add'; sessionToken: string; socketId: string }
    | { type: 'remove'; socketId: string };

  const connectionOperationArbitrary = (
    existingSocketIds: string[]
  ): fc.Arbitrary<ConnectionOperation> => {
    const addOperation = fc.record({
      type: fc.constant('add' as const),
      sessionToken: sessionTokenArbitrary,
      socketId: socketIdArbitrary,
    });

    if (existingSocketIds.length === 0) {
      return addOperation;
    }

    const removeOperation = fc.record({
      type: fc.constant('remove' as const),
      socketId: fc.constantFrom(...existingSocketIds),
    });

    return fc.oneof(addOperation, removeOperation);
  };

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('should maintain consistency between getSocketIds and operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            sessionToken: sessionTokenArbitrary,
            socketId: socketIdArbitrary,
          }),
          { minLength: 1, maxLength: 50 }
        ),
        async (connections) => {
          // Track expected state
          const expectedState = new Map<string, Set<string>>();

          // Perform add operations
          for (const { sessionToken, socketId } of connections) {
            connectionMap.addConnection(sessionToken, socketId);

            // Update expected state
            if (!expectedState.has(sessionToken)) {
              expectedState.set(sessionToken, new Set());
            }
            expectedState.get(sessionToken)!.add(socketId);
          }

          // Verify consistency for each session token
          for (const [sessionToken, expectedSocketIds] of Array.from(expectedState.entries())) {
            const actualSocketIds = connectionMap.getSocketIds(sessionToken);
            const actualSet = new Set(actualSocketIds);

            // Check that all expected socket IDs are present
            for (const socketId of expectedSocketIds) {
              expect(actualSet.has(socketId)).toBe(true);
            }

            // Check that no extra socket IDs are present
            expect(actualSocketIds.length).toBe(expectedSocketIds.size);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain consistency after add and remove operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            sessionToken: sessionTokenArbitrary,
            socketId: socketIdArbitrary,
          }),
          { minLength: 5, maxLength: 30 }
        ),
        fc.array(fc.nat({ max: 100 }), { minLength: 1, maxLength: 10 }),
        async (connections, removeIndices) => {
          // Track expected state
          const expectedState = new Map<string, Set<string>>();
          const socketToToken = new Map<string, string>();

          // Add all connections
          for (const { sessionToken, socketId } of connections) {
            connectionMap.addConnection(sessionToken, socketId);

            if (!expectedState.has(sessionToken)) {
              expectedState.set(sessionToken, new Set());
            }
            expectedState.get(sessionToken)!.add(socketId);
            socketToToken.set(socketId, sessionToken);
          }

          // Remove some connections
          for (const index of removeIndices) {
            if (index < connections.length) {
              const { socketId } = connections[index];
              const sessionToken = socketToToken.get(socketId);

              connectionMap.removeConnection(socketId);

              // Update expected state
              if (sessionToken && expectedState.has(sessionToken)) {
                expectedState.get(sessionToken)!.delete(socketId);
                if (expectedState.get(sessionToken)!.size === 0) {
                  expectedState.delete(sessionToken);
                }
              }
              socketToToken.delete(socketId);
            }
          }

          // Verify consistency for each session token
          for (const [sessionToken, expectedSocketIds] of Array.from(expectedState.entries())) {
            const actualSocketIds = connectionMap.getSocketIds(sessionToken);
            const actualSet = new Set(actualSocketIds);

            // Check that all expected socket IDs are present
            for (const socketId of expectedSocketIds) {
              expect(actualSet.has(socketId)).toBe(true);
            }

            // Check that no extra socket IDs are present
            expect(actualSocketIds.length).toBe(expectedSocketIds.size);
          }

          // Verify removed session tokens return empty arrays
          for (const [sessionToken] of Array.from(expectedState.entries())) {
            if (expectedState.get(sessionToken)!.size === 0) {
              const actualSocketIds = connectionMap.getSocketIds(sessionToken);
              expect(actualSocketIds.length).toBe(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain bidirectional consistency (getSessionToken)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            sessionToken: sessionTokenArbitrary,
            socketId: socketIdArbitrary,
          }),
          { minLength: 1, maxLength: 50 }
        ),
        async (connections) => {
          // Add all connections
          for (const { sessionToken, socketId } of connections) {
            connectionMap.addConnection(sessionToken, socketId);
          }

          // Verify bidirectional consistency
          for (const { sessionToken, socketId } of connections) {
            // Forward lookup: sessionToken -> socketIds
            const socketIds = connectionMap.getSocketIds(sessionToken);
            expect(socketIds).toContain(socketId);

            // Reverse lookup: socketId -> sessionToken
            const retrievedToken = connectionMap.getSessionToken(socketId);
            expect(retrievedToken).toBe(sessionToken);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle multiple sockets per session token', async () => {
    await fc.assert(
      fc.asyncProperty(
        sessionTokenArbitrary,
        fc.array(socketIdArbitrary, { minLength: 1, maxLength: 10 }),
        async (sessionToken, socketIds) => {
          // Add multiple sockets for the same session token
          for (const socketId of socketIds) {
            connectionMap.addConnection(sessionToken, socketId);
          }

          // Verify all sockets are tracked
          const retrievedSocketIds = connectionMap.getSocketIds(sessionToken);
          const retrievedSet = new Set(retrievedSocketIds);

          // Check that all socket IDs are present
          for (const socketId of socketIds) {
            expect(retrievedSet.has(socketId)).toBe(true);
          }

          // Check that no extra socket IDs are present
          expect(retrievedSocketIds.length).toBe(new Set(socketIds).size);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty array for non-existent session tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        sessionTokenArbitrary,
        async (sessionToken) => {
          // Query a session token that was never added
          const socketIds = connectionMap.getSocketIds(sessionToken);
          expect(socketIds).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return null for non-existent socket IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        socketIdArbitrary,
        async (socketId) => {
          // Query a socket ID that was never added
          const sessionToken = connectionMap.getSessionToken(socketId);
          expect(sessionToken).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle removing non-existent socket IDs gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        socketIdArbitrary,
        async (socketId) => {
          // Remove a socket ID that was never added (should not throw)
          expect(() => connectionMap.removeConnection(socketId)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain consistency after cleanup', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            sessionToken: sessionTokenArbitrary,
            socketId: socketIdArbitrary,
          }),
          { minLength: 1, maxLength: 50 }
        ),
        async (connections) => {
          // Add all connections
          for (const { sessionToken, socketId } of connections) {
            connectionMap.addConnection(sessionToken, socketId);
          }

          // Run cleanup
          connectionMap.cleanup();

          // Verify all connections are still accessible
          for (const { sessionToken, socketId } of connections) {
            const socketIds = connectionMap.getSocketIds(sessionToken);
            expect(socketIds).toContain(socketId);

            const retrievedToken = connectionMap.getSessionToken(socketId);
            expect(retrievedToken).toBe(sessionToken);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
