/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { InMemoryTournamentRepository } from './in-memory-repository';
import { TournamentState, Meme, Match, Round, MatchStatus, TournamentStatus } from '../types';

/**
 * **Feature: meme-championship, Property 28: Repository Method Substitutability**
 * 
 * For any valid tournament state, storing it via any ITournamentRepository implementation
 * and then retrieving it should return an equivalent state object.
 * 
 * **Validates: Requirements 10.4**
 */

describe('InMemoryTournamentRepository - Property-Based Tests', () => {
  let repository: InMemoryTournamentRepository;

  beforeEach(() => {
    repository = new InMemoryTournamentRepository();
  });

  // ============================================================================
  // Arbitraries (Generators) for fast-check
  // ============================================================================

  /**
   * Generate a random Meme
   */
  const memeArbitrary = fc.record({
    id: fc.uuid(),
    imageUrl: fc.webUrl(),
    caption: fc.string({ minLength: 1, maxLength: 100 }),
    uploadedAt: fc.date(),
  });

  /**
   * Generate a random MatchStatus
   */
  const matchStatusArbitrary: fc.Arbitrary<MatchStatus> = fc.constantFrom(
    'PENDING' as const,
    'IN_PROGRESS' as const,
    'COMPLETED' as const
  );

  /**
   * Generate a random Match
   */
  const matchArbitrary = (memes: Meme[]): fc.Arbitrary<Match> => {
    if (memes.length < 2) {
      throw new Error('Need at least 2 memes to create a match');
    }

    return fc.record({
      id: fc.uuid(),
      roundIndex: fc.nat({ max: 10 }),
      matchIndex: fc.nat({ max: 10 }),
      leftMeme: fc.constantFrom(...memes),
      rightMeme: fc.constantFrom(...memes),
      votes: fc.record({
        left: fc.nat({ max: 1000 }),
        right: fc.nat({ max: 1000 }),
      }),
      timeRemaining: fc.nat({ max: 300 }),
      totalTime: fc.integer({ min: 10, max: 300 }),
      status: matchStatusArbitrary,
      winner: fc.oneof(
        fc.constant(null),
        fc.constantFrom(...memes)
      ),
      startedAt: fc.oneof(fc.constant(null), fc.date()),
      completedAt: fc.oneof(fc.constant(null), fc.date()),
    });
  };

  /**
   * Generate a random Round
   */
  const roundArbitrary = (memes: Meme[], roundIndex: number): fc.Arbitrary<Round> => {
    return fc.record({
      roundIndex: fc.constant(roundIndex),
      matches: fc.array(matchArbitrary(memes), { minLength: 1, maxLength: 4 }),
      completed: fc.boolean(),
    });
  };

  /**
   * Generate a random TournamentStatus
   */
  const tournamentStatusArbitrary: fc.Arbitrary<TournamentStatus> = fc.constantFrom(
    'WAITING' as const,
    'DUEL_IN_PROGRESS' as const,
    'TOURNAMENT_FINISHED' as const
  );

  /**
   * Generate a random TournamentState
   */
  const tournamentStateArbitrary: fc.Arbitrary<TournamentState> = fc
    .array(memeArbitrary, { minLength: 2, maxLength: 16 })
    .chain((memes) => {
      return fc.record({
        status: tournamentStatusArbitrary,
        memes: fc.constant(memes),
        bracket: fc.array(
          fc.nat({ max: 5 }).chain((roundIndex) => roundArbitrary(memes, roundIndex)),
          { minLength: 0, maxLength: 5 }
        ),
        currentMatch: fc.oneof(
          fc.constant(null),
          matchArbitrary(memes)
        ),
        winner: fc.oneof(
          fc.constant(null),
          fc.constantFrom(...memes)
        ),
        config: fc.record({
          votingTimeSeconds: fc.nat({ min: 5, max: 300 }),
        }),
      });
    });

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('should preserve tournament state through save and load (round-trip)', async () => {
    await fc.assert(
      fc.asyncProperty(tournamentStateArbitrary, async (state) => {
        // Save the state
        await repository.setState(state);

        // Load the state back
        const loadedState = await repository.getState();

        // Verify the loaded state matches the original
        expect(loadedState).not.toBeNull();
        expect(loadedState).toEqual(state);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve individual meme operations', async () => {
    await fc.assert(
      fc.asyncProperty(memeArbitrary, async (meme) => {
        // Add a meme
        await repository.addMeme(meme);

        // Retrieve it by ID
        const retrievedMeme = await repository.getMemeById(meme.id);

        // Verify it matches
        expect(retrievedMeme).toEqual(meme);

        // Verify it appears in the list
        const allMemes = await repository.getMemes();
        expect(allMemes).toContainEqual(meme);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve match updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(memeArbitrary, { minLength: 2, maxLength: 8 }).chain((memes) =>
          fc.tuple(fc.constant(memes), matchArbitrary(memes))
        ),
        async ([memes, match]) => {
          // Create a tournament state with matches
          const state: TournamentState = {
            status: 'DUEL_IN_PROGRESS',
            memes,
            bracket: [
              {
                roundIndex: 0,
                matches: [match],
                completed: false,
              },
            ],
            currentMatch: match,
            winner: null,
            config: {
              votingTimeSeconds: 30,
            },
          };

          // Set the state
          await repository.setState(state);

          // Update the match
          const updatedMatch: Match = {
            ...match,
            votes: {
              left: match.votes.left + 10,
              right: match.votes.right + 5,
            },
          };
          await repository.updateMatch(updatedMatch);

          // Retrieve the match
          const retrievedMatch = await repository.getMatchById(match.id);

          // Verify the update was preserved
          expect(retrievedMatch).toEqual(updatedMatch);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle clearState correctly', async () => {
    await fc.assert(
      fc.asyncProperty(tournamentStateArbitrary, async (state) => {
        // Set a state
        await repository.setState(state);

        // Clear it
        await repository.clearState();

        // Verify state is null
        const clearedState = await repository.getState();
        expect(clearedState).toBeNull();

        // Verify memes are cleared
        const memes = await repository.getMemes();
        expect(memes).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle deleteMeme correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(memeArbitrary, { minLength: 2, maxLength: 8 }),
        async (memes) => {
          // Create a state with memes
          const state: TournamentState = {
            status: 'WAITING',
            memes,
            bracket: [],
            currentMatch: null,
            winner: null,
            config: {
              votingTimeSeconds: 30,
            },
          };

          await repository.setState(state);

          // Delete the first meme
          const memeToDelete = memes[0];
          await repository.deleteMeme(memeToDelete.id);

          // Verify it's deleted
          const deletedMeme = await repository.getMemeById(memeToDelete.id);
          expect(deletedMeme).toBeNull();

          // Verify it's not in the list
          const remainingMemes = await repository.getMemes();
          expect(remainingMemes).not.toContainEqual(memeToDelete);
          expect(remainingMemes.length).toBe(memes.length - 1);

          // Verify state is updated
          const updatedState = await repository.getState();
          expect(updatedState?.memes).not.toContainEqual(memeToDelete);
        }
      ),
      { numRuns: 100 }
    );
  });
});
