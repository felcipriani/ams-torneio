/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { TournamentManager } from './tournament-manager';
import { InMemoryTournamentRepository } from './in-memory-repository';
import { TournamentState, Meme, Match, Round, MatchStatus, TournamentStatus } from '../types';

describe('TournamentManager - Reset Functionality', () => {
  let repository: InMemoryTournamentRepository;
  let tournamentManager: TournamentManager;

  beforeEach(() => {
    repository = new InMemoryTournamentRepository();
    tournamentManager = new TournamentManager(repository);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ============================================================================
  // Arbitraries (Generators) for fast-check
  // ============================================================================

  /**
   * Generate a random Meme
   */
  const memeArbitrary = fc.record({
    id: fc.uuid(),
    imageUrl: fc.string({ minLength: 1, maxLength: 50 }).map(s => `/uploads/${s}.jpg`),
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
          votingTimeSeconds: fc.integer({ min: 5, max: 300 }),
        }),
      });
    });

  // ============================================================================
  // Property Tests
  // ============================================================================

  // Feature: tournament-reset, Property 1: Repository state clearing
  // Validates: Requirements 1.2, 3.1
  it('should clear all memes and matches from repository after reset', async () => {
    await fc.assert(
      fc.asyncProperty(tournamentStateArbitrary, async (state) => {
        // Ensure state has memes and matches
        fc.pre(state.memes.length > 0);
        
        // Set the state
        await repository.setState(state);

        // Verify state exists before reset
        const stateBefore = await repository.getState();
        expect(stateBefore).not.toBeNull();
        expect(stateBefore!.memes.length).toBeGreaterThan(0);

        // Reset tournament
        await tournamentManager.resetTournament();

        // Verify repository contains zero memes and zero matches
        const stateAfter = await repository.getState();
        expect(stateAfter).toBeNull();

        const memes = await repository.getMemes();
        expect(memes).toEqual([]);
        expect(memes.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: tournament-reset, Property 2: State returns to initial configuration
  // Validates: Requirements 1.3, 3.5
  it('should reset state to initial configuration regardless of current status', async () => {
    await fc.assert(
      fc.asyncProperty(tournamentStateArbitrary, async (state) => {
        // Set the state
        await repository.setState(state);

        // Reset tournament
        await tournamentManager.resetTournament();

        // Verify state matches initial configuration
        const stateAfter = await repository.getState();
        expect(stateAfter).toBeNull();

        // After reset, initializing empty state should give us the initial configuration
        await tournamentManager.initializeEmptyState();
        const initialState = await repository.getState();
        
        expect(initialState).not.toBeNull();
        expect(initialState!.status).toBe('WAITING');
        expect(initialState!.memes).toEqual([]);
        expect(initialState!.bracket).toEqual([]);
        expect(initialState!.currentMatch).toBeNull();
        expect(initialState!.winner).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  // Feature: tournament-reset, Property 7: Bracket structure clearing
  // Validates: Requirements 3.4
  it('should clear bracket structure after reset', async () => {
    await fc.assert(
      fc.asyncProperty(tournamentStateArbitrary, async (state) => {
        // Ensure state has a bracket
        fc.pre(state.bracket.length > 0);
        
        // Set the state
        await repository.setState(state);

        // Verify bracket exists before reset
        const stateBefore = await repository.getState();
        expect(stateBefore!.bracket.length).toBeGreaterThan(0);

        // Reset tournament
        await tournamentManager.resetTournament();

        // Verify bracket array is empty
        const stateAfter = await repository.getState();
        expect(stateAfter).toBeNull();
        
        // After initializing empty state, bracket should be empty
        await tournamentManager.initializeEmptyState();
        const initialState = await repository.getState();
        expect(initialState!.bracket).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: tournament-reset, Property 8: Match history clearing
  // Validates: Requirements 3.2
  it('should clear all match history after reset', async () => {
    await fc.assert(
      fc.asyncProperty(tournamentStateArbitrary, async (state) => {
        // Ensure state has matches in bracket
        fc.pre(state.bracket.length > 0 && state.bracket.some(r => r.matches.length > 0));
        
        // Set the state
        await repository.setState(state);

        // Count matches before reset
        const stateBefore = await repository.getState();
        const matchCountBefore = stateBefore!.bracket.reduce(
          (sum, round) => sum + round.matches.length,
          0
        );
        expect(matchCountBefore).toBeGreaterThan(0);

        // Reset tournament
        await tournamentManager.resetTournament();

        // Verify no matches exist in state
        const stateAfter = await repository.getState();
        expect(stateAfter).toBeNull();
        
        // After initializing empty state, there should be no matches
        await tournamentManager.initializeEmptyState();
        const initialState = await repository.getState();
        const matchCountAfter = initialState!.bracket.reduce(
          (sum, round) => sum + round.matches.length,
          0
        );
        expect(matchCountAfter).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // Unit Tests
  // ============================================================================

  it('should stop timer when reset is called during active match', async () => {
    // Use fake timers
    vi.useFakeTimers();

    // Create a simple tournament state with an active match
    const memes: Meme[] = [
      {
        id: '1',
        imageUrl: '/uploads/meme1.jpg',
        caption: 'Meme 1',
        uploadedAt: new Date(),
      },
      {
        id: '2',
        imageUrl: '/uploads/meme2.jpg',
        caption: 'Meme 2',
        uploadedAt: new Date(),
      },
    ];

    // Initialize tournament
    await tournamentManager.initializeTournament(memes, 30);

    // Verify match is in progress
    const stateBefore = await repository.getState();
    expect(stateBefore!.currentMatch).not.toBeNull();
    expect(stateBefore!.currentMatch!.status).toBe('IN_PROGRESS');

    // Advance time to verify timer is running
    await vi.advanceTimersByTimeAsync(1000);
    const stateAfterTick = await repository.getState();
    expect(stateAfterTick!.currentMatch!.timeRemaining).toBe(29);

    // Reset tournament
    await tournamentManager.resetTournament();

    // Verify state is cleared
    const stateAfter = await repository.getState();
    expect(stateAfter).toBeNull();

    // Advance time to verify timer is stopped (no errors should occur)
    await vi.advanceTimersByTimeAsync(5000);

    // State should still be null (no timer updates)
    const stateFinal = await repository.getState();
    expect(stateFinal).toBeNull();

    vi.useRealTimers();
  });

  it('should not have dangling intervals after reset', async () => {
    // Use fake timers
    vi.useFakeTimers();

    // Create a simple tournament
    const memes: Meme[] = [
      {
        id: '1',
        imageUrl: '/uploads/meme1.jpg',
        caption: 'Meme 1',
        uploadedAt: new Date(),
      },
      {
        id: '2',
        imageUrl: '/uploads/meme2.jpg',
        caption: 'Meme 2',
        uploadedAt: new Date(),
      },
    ];

    // Initialize tournament (starts timer)
    await tournamentManager.initializeTournament(memes, 30);

    // Reset tournament (should stop timer)
    await tournamentManager.resetTournament();

    // Get count of pending timers
    const pendingTimers = vi.getTimerCount();
    expect(pendingTimers).toBe(0);

    vi.useRealTimers();
  });

  it('should reset correctly when no memes are uploaded', async () => {
    // Create empty state
    await tournamentManager.initializeEmptyState();

    const stateBefore = await repository.getState();
    expect(stateBefore!.memes).toEqual([]);

    // Reset should work without errors
    const imageUrls = await tournamentManager.resetTournament();

    expect(imageUrls).toEqual([]);

    const stateAfter = await repository.getState();
    expect(stateAfter).toBeNull();
  });

  it('should return correct image URLs for deletion', async () => {
    // Create state with memes
    const memes: Meme[] = [
      {
        id: '1',
        imageUrl: '/uploads/meme1.jpg',
        caption: 'Meme 1',
        uploadedAt: new Date(),
      },
      {
        id: '2',
        imageUrl: '/uploads/meme2.jpg',
        caption: 'Meme 2',
        uploadedAt: new Date(),
      },
      {
        id: '3',
        imageUrl: '/uploads/meme3.jpg',
        caption: 'Meme 3',
        uploadedAt: new Date(),
      },
    ];

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

    // Reset and get image URLs
    const imageUrls = await tournamentManager.resetTournament();

    // Verify all image URLs are returned
    expect(imageUrls).toHaveLength(3);
    expect(imageUrls).toContain('/uploads/meme1.jpg');
    expect(imageUrls).toContain('/uploads/meme2.jpg');
    expect(imageUrls).toContain('/uploads/meme3.jpg');
  });
});
