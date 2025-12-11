/**
 * Verification test for upload functionality after tournament reset
 * Feature: tournament-reset, Task 8: Verify upload functionality after reset
 * Validates: Requirements 2.4
 * 
 * This test verifies:
 * 1. Meme upload works after reset
 * 2. New tournament can be started with newly uploaded memes
 * 3. No residual data from previous tournament affects new tournament
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryTournamentRepository } from './in-memory-repository';
import { TournamentManager } from './tournament-manager';
import { Meme } from '@/types';

describe('Upload functionality after reset', () => {
  let repository: InMemoryTournamentRepository;
  let tournamentManager: TournamentManager;

  beforeEach(() => {
    repository = new InMemoryTournamentRepository();
    tournamentManager = new TournamentManager(repository, () => {});
  });

  it('should allow meme uploads after tournament reset', async () => {
    // Setup: Run a complete tournament
    const initialMeme1: Meme = {
      id: 'meme-1',
      imageUrl: '/uploads/initial-1.jpg',
      caption: 'Initial Meme 1',
      uploadedAt: new Date()
    };
    const initialMeme2: Meme = {
      id: 'meme-2',
      imageUrl: '/uploads/initial-2.jpg',
      caption: 'Initial Meme 2',
      uploadedAt: new Date()
    };

    await repository.addMeme(initialMeme1);
    await repository.addMeme(initialMeme2);
    
    // Get memes and initialize tournament
    const memes = await repository.getMemes();
    await tournamentManager.initializeTournament(memes, 30);

    // Verify initial tournament is running
    let state = await repository.getState();
    expect(state?.status).toBe('DUEL_IN_PROGRESS');
    expect(state?.memes).toHaveLength(2);

    // Reset the tournament
    await tournamentManager.resetTournament();

    // Verify state is cleared
    state = await repository.getState();
    expect(state).toBeNull();

    // Test: Upload new memes after reset
    const newMeme1: Meme = {
      id: 'new-meme-1',
      imageUrl: '/uploads/new-1.jpg',
      caption: 'New Meme 1',
      uploadedAt: new Date()
    };
    const newMeme2: Meme = {
      id: 'new-meme-2',
      imageUrl: '/uploads/new-2.jpg',
      caption: 'New Meme 2',
      uploadedAt: new Date()
    };

    // Upload should work without errors
    await repository.addMeme(newMeme1);
    await repository.addMeme(newMeme2);

    // Verify new memes are added
    const newMemes = await repository.getMemes();
    expect(newMemes).toHaveLength(2);
    expect(newMemes[0].id).toBe('new-meme-1');
    expect(newMemes[1].id).toBe('new-meme-2');
    
    // Verify old memes are not present
    expect(newMemes.find(m => m.id === 'meme-1')).toBeUndefined();
    expect(newMemes.find(m => m.id === 'meme-2')).toBeUndefined();
  });

  it('should allow starting new tournament with newly uploaded memes after reset', async () => {
    // Setup: Run and reset a tournament
    const initialMeme1: Meme = {
      id: 'old-meme-1',
      imageUrl: '/uploads/old-1.jpg',
      caption: 'Old Meme 1',
      uploadedAt: new Date()
    };
    const initialMeme2: Meme = {
      id: 'old-meme-2',
      imageUrl: '/uploads/old-2.jpg',
      caption: 'Old Meme 2',
      uploadedAt: new Date()
    };

    await repository.addMeme(initialMeme1);
    await repository.addMeme(initialMeme2);
    let initialMemes = await repository.getMemes();
    await tournamentManager.initializeTournament(initialMemes, 30);
    await tournamentManager.resetTournament();

    // Upload new memes
    const newMeme1: Meme = {
      id: 'new-1',
      imageUrl: '/uploads/new-1.jpg',
      caption: 'New 1',
      uploadedAt: new Date()
    };
    const newMeme2: Meme = {
      id: 'new-2',
      imageUrl: '/uploads/new-2.jpg',
      caption: 'New 2',
      uploadedAt: new Date()
    };
    const newMeme3: Meme = {
      id: 'new-3',
      imageUrl: '/uploads/new-3.jpg',
      caption: 'New 3',
      uploadedAt: new Date()
    };

    await repository.addMeme(newMeme1);
    await repository.addMeme(newMeme2);
    await repository.addMeme(newMeme3);

    // Start new tournament with new memes
    const newMemes = await repository.getMemes();
    await tournamentManager.initializeTournament(newMemes, 30);

    // Verify new tournament started successfully
    const state = await repository.getState();
    expect(state).not.toBeNull();
    expect(state?.status).toBe('DUEL_IN_PROGRESS');
    expect(state?.memes).toHaveLength(3);
    expect(state?.currentMatch).not.toBeNull();
    
    // Verify tournament uses only new memes
    const memeIds = state?.memes.map(m => m.id) || [];
    expect(memeIds).toContain('new-1');
    expect(memeIds).toContain('new-2');
    expect(memeIds).toContain('new-3');
    expect(memeIds).not.toContain('old-meme-1');
    expect(memeIds).not.toContain('old-meme-2');
  });

  it('should ensure no residual data from previous tournament affects new tournament', async () => {
    // Setup: Run a complete tournament with votes
    const oldMeme1: Meme = {
      id: 'old-1',
      imageUrl: '/uploads/old-1.jpg',
      caption: 'Old 1',
      uploadedAt: new Date()
    };
    const oldMeme2: Meme = {
      id: 'old-2',
      imageUrl: '/uploads/old-2.jpg',
      caption: 'Old 2',
      uploadedAt: new Date()
    };

    await repository.addMeme(oldMeme1);
    await repository.addMeme(oldMeme2);
    let oldMemes = await repository.getMemes();
    await tournamentManager.initializeTournament(oldMemes, 30);

    // Cast votes in old tournament
    const oldState = await repository.getState();
    if (oldState?.currentMatch) {
      await tournamentManager.processVote(oldState.currentMatch.id, 'LEFT');
      await tournamentManager.processVote(oldState.currentMatch.id, 'RIGHT');
    }

    // Get old tournament data
    const oldMatchId = oldState?.currentMatch?.id;
    const oldBracket = oldState?.bracket || [];

    // Reset tournament
    await tournamentManager.resetTournament();

    // Upload new memes
    const newMeme1: Meme = {
      id: 'new-1',
      imageUrl: '/uploads/new-1.jpg',
      caption: 'New 1',
      uploadedAt: new Date()
    };
    const newMeme2: Meme = {
      id: 'new-2',
      imageUrl: '/uploads/new-2.jpg',
      caption: 'New 2',
      uploadedAt: new Date()
    };

    await repository.addMeme(newMeme1);
    await repository.addMeme(newMeme2);

    // Start new tournament
    const newMemes = await repository.getMemes();
    await tournamentManager.initializeTournament(newMemes, 30);

    // Verify new tournament has no residual data
    const newState = await repository.getState();
    
    // 1. New match should have different ID
    expect(newState?.currentMatch?.id).not.toBe(oldMatchId);
    
    // 2. Vote counts should start at zero
    expect(newState?.currentMatch?.votes.left).toBe(0);
    expect(newState?.currentMatch?.votes.right).toBe(0);
    
    // 3. Bracket should be fresh (different structure)
    expect(newState?.bracket).not.toEqual(oldBracket);
    
    // 4. Memes should be only new ones
    expect(newState?.memes).toHaveLength(2);
    expect(newState?.memes.find(m => m.id === 'old-1')).toBeUndefined();
    expect(newState?.memes.find(m => m.id === 'old-2')).toBeUndefined();
    expect(newState?.memes.find(m => m.id === 'new-1')).toBeDefined();
    expect(newState?.memes.find(m => m.id === 'new-2')).toBeDefined();
    
    // 5. Winner should be null (tournament just started)
    expect(newState?.winner).toBeNull();
    
    // 6. Status should be fresh tournament state
    expect(newState?.status).toBe('DUEL_IN_PROGRESS');
  });

  it('should handle multiple reset and upload cycles', async () => {
    // Cycle 1
    const cycle1Meme1: Meme = {
      id: 'cycle-1-1',
      imageUrl: '/uploads/cycle-1-1.jpg',
      caption: 'Cycle 1-1',
      uploadedAt: new Date()
    };
    const cycle1Meme2: Meme = {
      id: 'cycle-1-2',
      imageUrl: '/uploads/cycle-1-2.jpg',
      caption: 'Cycle 1-2',
      uploadedAt: new Date()
    };
    await repository.addMeme(cycle1Meme1);
    await repository.addMeme(cycle1Meme2);
    let cycle1Memes = await repository.getMemes();
    await tournamentManager.initializeTournament(cycle1Memes, 30);
    await tournamentManager.resetTournament();

    // Cycle 2
    const cycle2Meme1: Meme = {
      id: 'cycle-2-1',
      imageUrl: '/uploads/cycle-2-1.jpg',
      caption: 'Cycle 2-1',
      uploadedAt: new Date()
    };
    const cycle2Meme2: Meme = {
      id: 'cycle-2-2',
      imageUrl: '/uploads/cycle-2-2.jpg',
      caption: 'Cycle 2-2',
      uploadedAt: new Date()
    };
    await repository.addMeme(cycle2Meme1);
    await repository.addMeme(cycle2Meme2);
    let cycle2Memes = await repository.getMemes();
    await tournamentManager.initializeTournament(cycle2Memes, 30);
    await tournamentManager.resetTournament();

    // Cycle 3
    const cycle3Meme1: Meme = {
      id: 'cycle-3-1',
      imageUrl: '/uploads/cycle-3-1.jpg',
      caption: 'Cycle 3-1',
      uploadedAt: new Date()
    };
    const cycle3Meme2: Meme = {
      id: 'cycle-3-2',
      imageUrl: '/uploads/cycle-3-2.jpg',
      caption: 'Cycle 3-2',
      uploadedAt: new Date()
    };
    await repository.addMeme(cycle3Meme1);
    await repository.addMeme(cycle3Meme2);
    let cycle3Memes = await repository.getMemes();
    await tournamentManager.initializeTournament(cycle3Memes, 30);

    // Verify final cycle works correctly
    const state = await repository.getState();
    expect(state?.status).toBe('DUEL_IN_PROGRESS');
    expect(state?.memes).toHaveLength(2);
    expect(state?.memes.find(m => m.id === 'cycle-1-1')).toBeUndefined();
    expect(state?.memes.find(m => m.id === 'cycle-1-2')).toBeUndefined();
    expect(state?.memes.find(m => m.id === 'cycle-2-1')).toBeUndefined();
    expect(state?.memes.find(m => m.id === 'cycle-2-2')).toBeUndefined();
    expect(state?.memes.find(m => m.id === 'cycle-3-1')).toBeDefined();
    expect(state?.memes.find(m => m.id === 'cycle-3-2')).toBeDefined();
  });

  it('should allow uploads immediately after reset without waiting', async () => {
    // Setup initial tournament
    const initialMeme1: Meme = {
      id: 'initial-1',
      imageUrl: '/uploads/initial-1.jpg',
      caption: 'Initial 1',
      uploadedAt: new Date()
    };
    const initialMeme2: Meme = {
      id: 'initial-2',
      imageUrl: '/uploads/initial-2.jpg',
      caption: 'Initial 2',
      uploadedAt: new Date()
    };
    await repository.addMeme(initialMeme1);
    await repository.addMeme(initialMeme2);
    let initialMemes = await repository.getMemes();
    await tournamentManager.initializeTournament(initialMemes, 30);

    // Reset
    await tournamentManager.resetTournament();

    // Immediately upload without any delay
    const newMeme: Meme = {
      id: 'immediate',
      imageUrl: '/uploads/immediate.jpg',
      caption: 'Immediate',
      uploadedAt: new Date()
    };

    // This should not throw any errors
    await expect(repository.addMeme(newMeme)).resolves.not.toThrow();

    // Verify upload succeeded
    const uploadedMemes = await repository.getMemes();
    expect(uploadedMemes).toHaveLength(1);
    expect(uploadedMemes[0].id).toBe('immediate');
  });
});
