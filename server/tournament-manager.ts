import { randomUUID } from 'crypto';
import { 
  ITournamentRepository, 
  TournamentState, 
  Meme, 
  Match, 
  Round,
  TournamentStatus 
} from '../types';

/**
 * Tournament Manager handles all tournament business logic.
 * Uses dependency injection for repository to support Liskov Substitution Principle.
 */
export class TournamentManager {
  private repository: ITournamentRepository;

  /**
   * Constructor accepts ITournamentRepository for dependency injection
   * @param repository - Any implementation of ITournamentRepository
   */
  constructor(repository: ITournamentRepository) {
    this.repository = repository;
  }

  /**
   * Get the current tournament state
   */
  async getState(): Promise<TournamentState | null> {
    return await this.repository.getState();
  }

  /**
   * Initialize tournament with empty state
   */
  async initializeEmptyState(): Promise<void> {
    const emptyState: TournamentState = {
      status: 'WAITING',
      memes: [],
      bracket: [],
      currentMatch: null,
      winner: null,
      config: {
        votingTimeSeconds: 30 // default
      }
    };
    
    await this.repository.setState(emptyState);
  }

  /**
   * Generate single-elimination bracket for n memes (n≥2)
   * Calculates number of rounds: ceil(log2(n))
   * Creates Match objects with proper pairings
   * Handles odd number of memes with byes
   * 
   * @param memes - Array of memes to create bracket for (must have at least 2)
   * @param votingTimeSeconds - Time allocated for each match
   * @returns Array of rounds forming the bracket
   */
  private generateBracket(memes: Meme[], votingTimeSeconds: number): Round[] {
    if (memes.length < 2) {
      throw new Error('Cannot generate bracket with fewer than 2 memes');
    }

    const bracket: Round[] = [];
    const numRounds = Math.ceil(Math.log2(memes.length));
    
    // For the first round, we need to determine how many matches to create
    // and which memes get byes
    // If n is not a power of 2, some memes get byes to the next round
    
    // The number of memes that need to compete in round 1
    const nextPowerOf2 = Math.pow(2, numRounds - 1);
    const memesNeedingMatches = (memes.length - nextPowerOf2) * 2;
    
    let roundIndex = 0;
    
    // Create first round with actual memes
    const firstRoundMatches: Match[] = [];
    for (let i = 0; i < memesNeedingMatches; i += 2) {
      const match: Match = {
        id: randomUUID(),
        roundIndex: roundIndex,
        matchIndex: firstRoundMatches.length,
        leftMeme: memes[i],
        rightMeme: memes[i + 1],
        votes: { left: 0, right: 0 },
        timeRemaining: votingTimeSeconds,
        totalTime: votingTimeSeconds,
        status: 'PENDING',
        winner: null,
        startedAt: null,
        completedAt: null
      };
      firstRoundMatches.push(match);
    }
    
    if (firstRoundMatches.length > 0) {
      bracket.push({
        roundIndex: roundIndex,
        matches: firstRoundMatches,
        completed: false
      });
      roundIndex++;
    }
    
    // Calculate how many matches in subsequent rounds
    let numMatchesInNextRound = firstRoundMatches.length + (memes.length - memesNeedingMatches);
    
    // Create remaining rounds with placeholder matches
    while (numMatchesInNextRound > 1) {
      const roundMatches: Match[] = [];
      const numMatches = Math.floor(numMatchesInNextRound / 2);
      
      for (let i = 0; i < numMatches; i++) {
        const match: Match = {
          id: randomUUID(),
          roundIndex: roundIndex,
          matchIndex: i,
          leftMeme: null as any, // Will be filled by winners
          rightMeme: null as any, // Will be filled by winners
          votes: { left: 0, right: 0 },
          timeRemaining: votingTimeSeconds,
          totalTime: votingTimeSeconds,
          status: 'PENDING',
          winner: null,
          startedAt: null,
          completedAt: null
        };
        roundMatches.push(match);
      }
      
      bracket.push({
        roundIndex: roundIndex,
        matches: roundMatches,
        completed: false
      });
      
      numMatchesInNextRound = numMatches;
      roundIndex++;
    }
    
    return bracket;
  }

  /**
   * Initialize tournament with memes and voting time
   * Generates bracket, sets initial state to DUEL_IN_PROGRESS, and starts first match
   * 
   * @param memes - Array of memes to compete (must have at least 2)
   * @param votingTimeSeconds - Time allocated for each match in seconds
   */
  async initializeTournament(memes: Meme[], votingTimeSeconds: number): Promise<void> {
    if (memes.length < 2) {
      throw new Error('Tournament requires at least 2 memes');
    }

    // Generate the bracket
    const bracket = this.generateBracket(memes, votingTimeSeconds);
    
    // Handle memes with byes - they advance to round 2 automatically
    const numRounds = Math.ceil(Math.log2(memes.length));
    const nextPowerOf2 = Math.pow(2, numRounds - 1);
    const memesNeedingMatches = (memes.length - nextPowerOf2) * 2;
    const memesWithByes = memes.slice(memesNeedingMatches);
    
    // If there are byes, we need to populate the second round with those memes
    if (memesWithByes.length > 0 && bracket.length > 1) {
      const secondRound = bracket[1];
      let byeIndex = 0;
      
      // Fill in the memes with byes in the second round
      for (let i = 0; i < secondRound.matches.length; i++) {
        const match = secondRound.matches[i];
        
        // Determine how many winners from round 1 feed into this match
        // and how many byes
        const winnersFromRound1 = bracket[0].matches.length;
        const totalSpotsInRound2 = secondRound.matches.length * 2;
        const byesNeeded = totalSpotsInRound2 - winnersFromRound1;
        
        // Distribute byes across matches
        if (byeIndex < memesWithByes.length) {
          // This is a simplified approach - in a real bracket, byes would be
          // distributed more strategically, but for this implementation
          // we'll just fill them in order
          if (i < Math.ceil(byesNeeded / 2)) {
            match.leftMeme = memesWithByes[byeIndex];
            byeIndex++;
          }
          if (byeIndex < memesWithByes.length && i < Math.ceil(byesNeeded / 2)) {
            match.rightMeme = memesWithByes[byeIndex];
            byeIndex++;
          }
        }
      }
    }
    
    // Get the first match to start
    const firstMatch = bracket[0].matches[0];
    firstMatch.status = 'IN_PROGRESS';
    firstMatch.startedAt = new Date();
    
    // Create the tournament state
    const state: TournamentState = {
      status: 'DUEL_IN_PROGRESS',
      memes: memes,
      bracket: bracket,
      currentMatch: firstMatch,
      winner: null,
      config: {
        votingTimeSeconds: votingTimeSeconds
      }
    };
    
    // Store state via repository
    await this.repository.setState(state);
  }
}
