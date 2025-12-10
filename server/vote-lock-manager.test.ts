/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { VoteLockManager } from './vote-lock-manager';

/**
 * **Feature: vote-once-per-user, Property 2: Vote Lock Enforcement**
 * 
 * For any session token and match ID, if a vote has been recorded, subsequent 
 * vote attempts for the same match should be rejected.
 * 
 * **Validates: Requirements 1.3**
 */

describe('VoteLockManager - Property-Based Tests', () => {
  let voteLockManager: VoteLockManager;

  beforeEach(() => {
    voteLockManager = new VoteLockManager();
  });

  // ============================================================================
  // Arbitraries (Generators) for fast-check
  // ============================================================================

  /**
   * Generate a random session token (simulating hashed IPv4)
   */
  const sessionTokenArbitrary = fc.hexaString({ minLength: 64, maxLength: 64 });

  /**
   * Generate a random match ID
   */
  const matchIdArbitrary = fc.uuid();

  // ============================================================================
  // Property Tests
  // ============================================================================

  /**
   * Property 2: Vote Lock Enforcement
   * 
   * For any session token and match ID, if a vote has been recorded, 
   * subsequent vote attempts for the same match should be rejected.
   */
  it('should enforce vote locks - hasVoted returns true after recordVote', async () => {
    await fc.assert(
      fc.asyncProperty(
        sessionTokenArbitrary,
        matchIdArbitrary,
        async (sessionToken, matchId) => {
          // Initially, user should not have voted
          expect(voteLockManager.hasVoted(sessionToken, matchId)).toBe(false);

          // Record the vote
          voteLockManager.recordVote(sessionToken, matchId);

          // Now hasVoted should return true
          expect(voteLockManager.hasVoted(sessionToken, matchId)).toBe(true);

          // Calling hasVoted multiple times should still return true
          expect(voteLockManager.hasVoted(sessionToken, matchId)).toBe(true);
          expect(voteLockManager.hasVoted(sessionToken, matchId)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should enforce vote locks across multiple users in the same match', async () => {
    await fc.assert(
      fc.asyncProperty(
        matchIdArbitrary,
        fc.array(sessionTokenArbitrary, { minLength: 1, maxLength: 20 }),
        async (matchId, sessionTokens) => {
          // Record votes for all users
          for (const sessionToken of sessionTokens) {
            expect(voteLockManager.hasVoted(sessionToken, matchId)).toBe(false);
            voteLockManager.recordVote(sessionToken, matchId);
            expect(voteLockManager.hasVoted(sessionToken, matchId)).toBe(true);
          }

          // Verify all users are still marked as having voted
          for (const sessionToken of sessionTokens) {
            expect(voteLockManager.hasVoted(sessionToken, matchId)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should isolate vote locks by match ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        sessionTokenArbitrary,
        matchIdArbitrary,
        matchIdArbitrary,
        async (sessionToken, matchId1, matchId2) => {
          // Skip if match IDs are the same
          fc.pre(matchId1 !== matchId2);

          // Record vote for match 1
          voteLockManager.recordVote(sessionToken, matchId1);

          // User should have voted in match 1 but not match 2
          expect(voteLockManager.hasVoted(sessionToken, matchId1)).toBe(true);
          expect(voteLockManager.hasVoted(sessionToken, matchId2)).toBe(false);

          // Record vote for match 2
          voteLockManager.recordVote(sessionToken, matchId2);

          // User should have voted in both matches
          expect(voteLockManager.hasVoted(sessionToken, matchId1)).toBe(true);
          expect(voteLockManager.hasVoted(sessionToken, matchId2)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle recording the same vote multiple times idempotently', async () => {
    await fc.assert(
      fc.asyncProperty(
        sessionTokenArbitrary,
        matchIdArbitrary,
        fc.integer({ min: 1, max: 10 }),
        async (sessionToken, matchId, recordCount) => {
          // Record the same vote multiple times
          for (let i = 0; i < recordCount; i++) {
            voteLockManager.recordVote(sessionToken, matchId);
          }

          // hasVoted should return true
          expect(voteLockManager.hasVoted(sessionToken, matchId)).toBe(true);

          // getVotersForMatch should only contain the session token once
          const voters = voteLockManager.getVotersForMatch(matchId);
          expect(voters).toContain(sessionToken);
          expect(voters.filter(token => token === sessionToken).length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return correct voters list for a match', async () => {
    await fc.assert(
      fc.asyncProperty(
        matchIdArbitrary,
        fc.array(sessionTokenArbitrary, { minLength: 1, maxLength: 20 }),
        async (matchId, sessionTokens) => {
          // Make session tokens unique
          const uniqueTokens = Array.from(new Set(sessionTokens));

          // Record votes for all users
          for (const sessionToken of uniqueTokens) {
            voteLockManager.recordVote(sessionToken, matchId);
          }

          // Get voters list
          const voters = voteLockManager.getVotersForMatch(matchId);

          // All unique session tokens should be in the voters list
          for (const sessionToken of uniqueTokens) {
            expect(voters).toContain(sessionToken);
          }

          // Voters list should have the same length as unique tokens
          expect(voters.length).toBe(uniqueTokens.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty array for matches with no voters', async () => {
    await fc.assert(
      fc.asyncProperty(
        matchIdArbitrary,
        async (matchId) => {
          // Query a match that has no voters
          const voters = voteLockManager.getVotersForMatch(matchId);
          expect(voters).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return false for non-existent match IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        sessionTokenArbitrary,
        matchIdArbitrary,
        async (sessionToken, matchId) => {
          // Query a match that was never created
          expect(voteLockManager.hasVoted(sessionToken, matchId)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
