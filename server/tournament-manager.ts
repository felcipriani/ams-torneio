import { randomUUID } from 'crypto';
import { 
  ITournamentRepository, 
  TournamentState, 
  Meme, 
  Match, 
  Round,
  TournamentStatus 
} from '../types';
import { VoteLockManager } from './vote-lock-manager';

/**
 * Tournament Manager handles all tournament business logic.
 * Uses dependency injection for repository to support Liskov Substitution Principle.
 */
export class TournamentManager {
  private repository: ITournamentRepository;
  private timerInterval: NodeJS.Timeout | null = null;
  private onStateChange?: (state: TournamentState) => void;
  private voteLockManager?: VoteLockManager;

  /**
   * Constructor accepts ITournamentRepository for dependency injection
   * @param repository - Any implementation of ITournamentRepository
   * @param onStateChange - Optional callback for state changes (used for broadcasting)
   * @param voteLockManager - Optional VoteLockManager for clearing vote locks on match completion
   */
  constructor(
    repository: ITournamentRepository, 
    onStateChange?: (state: TournamentState) => void,
    voteLockManager?: VoteLockManager
  ) {
    this.repository = repository;
    this.onStateChange = onStateChange;
    this.voteLockManager = voteLockManager;
  }

  /**
   * Get the current tournament state
   */
  async getState(): Promise<TournamentState | null> {
    return await this.repository.getState();
  }

  /**
   * Initialize tournament with empty state
   * Only initializes if state doesn't exist yet
   */
  async initializeEmptyState(): Promise<void> {
    // Check if state already exists
    const existingState = await this.repository.getState();
    
    // Only initialize if no state exists
    if (!existingState) {
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
   * Calculate the winner of a match based on vote counts
   * Returns meme with higher votes, or randomly selects winner in case of tie
   * 
   * @param match - The match to calculate winner for
   * @returns The winning meme
   */
  private calculateWinner(match: Match): Meme {
    const leftVotes = match.votes.left;
    const rightVotes = match.votes.right;
    
    // If left has more votes, left wins
    if (leftVotes > rightVotes) {
      return match.leftMeme;
    }
    
    // If right has more votes, right wins
    if (rightVotes > leftVotes) {
      return match.rightMeme;
    }
    
    // Tie: randomly select winner
    // Use Math.random() < 0.5 for 50/50 chance
    return Math.random() < 0.5 ? match.leftMeme : match.rightMeme;
  }

  /**
   * Advance the winner of a match to the next round
   * Places winner in the appropriate match in the next round
   * Updates bracket structure
   * 
   * @param state - Current tournament state
   * @param completedMatch - The match that was just completed
   * @param winner - The winning meme from the completed match
   */
  private advanceWinner(state: TournamentState, completedMatch: Match, winner: Meme): void {
    const currentRoundIndex = completedMatch.roundIndex;
    const nextRoundIndex = currentRoundIndex + 1;
    
    // Check if there is a next round
    if (nextRoundIndex >= state.bracket.length) {
      // This was the final match, no advancement needed
      return;
    }
    
    const nextRound = state.bracket[nextRoundIndex];
    
    // Determine which match in the next round this winner advances to
    // In a single-elimination bracket, match i in round n feeds into match floor(i/2) in round n+1
    const nextMatchIndex = Math.floor(completedMatch.matchIndex / 2);
    const nextMatch = nextRound.matches[nextMatchIndex];
    
    // Determine if winner goes to left or right side of next match
    // Even-indexed matches (0, 2, 4...) feed left side
    // Odd-indexed matches (1, 3, 5...) feed right side
    if (completedMatch.matchIndex % 2 === 0) {
      nextMatch.leftMeme = winner;
    } else {
      nextMatch.rightMeme = winner;
    }
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
    
    // Start the timer for the first match
    this.startTimer();
    
    // Notify listeners of initial state
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  /**
   * Start the timer for the current match
   * Decrements timeRemaining every second and triggers match completion when time reaches 0
   * Cleans up timer on match end
   */
  private startTimer(): void {
    // Clean up any existing timer
    this.stopTimer();
    
    // Create interval that decrements timeRemaining every second
    this.timerInterval = setInterval(async () => {
      try {
        const state = await this.repository.getState();
        
        if (!state || !state.currentMatch || state.currentMatch.status !== 'IN_PROGRESS') {
          this.stopTimer();
          return;
        }
        
        // Decrement time remaining
        state.currentMatch.timeRemaining -= 1;
        
        // Update the match in the bracket as well
        const currentRound = state.bracket[state.currentMatch.roundIndex];
        const matchInBracket = currentRound.matches[state.currentMatch.matchIndex];
        matchInBracket.timeRemaining = state.currentMatch.timeRemaining;
        
        // Save updated state
        await this.repository.setState(state);
        
        // Notify listeners of state change
        if (this.onStateChange) {
          this.onStateChange(state);
        }
        
        // Check if time has expired
        if (state.currentMatch.timeRemaining <= 0) {
          this.stopTimer();
          await this.completeCurrentMatch();
        }
      } catch (error) {
        console.error('Error in timer:', error);
        this.stopTimer();
      }
    }, 1000); // Run every second
  }

  /**
   * Stop the timer and clean up
   */
  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Complete the current match and progress the tournament
   * Calculates winner, advances them to next round, and starts next match
   * Sets status to TOURNAMENT_FINISHED if this was the final match
   * 
   * @returns Updated tournament state
   */
  async completeCurrentMatch(): Promise<TournamentState> {
    const state = await this.repository.getState();
    
    if (!state) {
      throw new Error('No tournament state found');
    }
    
    if (!state.currentMatch) {
      throw new Error('No current match to complete');
    }
    
    const currentMatch = state.currentMatch;
    
    // Calculate the winner
    const winner = this.calculateWinner(currentMatch);
    
    // Update the match
    currentMatch.winner = winner;
    currentMatch.status = 'COMPLETED';
    currentMatch.completedAt = new Date();
    
    // Update the match in the bracket
    const currentRound = state.bracket[currentMatch.roundIndex];
    const matchInBracket = currentRound.matches[currentMatch.matchIndex];
    matchInBracket.winner = winner;
    matchInBracket.status = 'COMPLETED';
    matchInBracket.completedAt = currentMatch.completedAt;
    
    // Clear vote locks for the completed match
    if (this.voteLockManager) {
      this.voteLockManager.clearMatchLocks(currentMatch.id);
    }
    
    // Advance winner to next round
    this.advanceWinner(state, currentMatch, winner);
    
    // Determine if there are more matches in the current round
    const allMatchesInRoundComplete = currentRound.matches.every(m => m.status === 'COMPLETED');
    
    if (allMatchesInRoundComplete) {
      currentRound.completed = true;
    }
    
    // Find the next match to start
    let nextMatch: Match | null = null;
    
    // First, check if there are more matches in the current round
    if (!allMatchesInRoundComplete) {
      // Find the next pending match in the current round
      nextMatch = currentRound.matches.find(m => m.status === 'PENDING') || null;
    }
    
    // If current round is complete, move to next round
    if (!nextMatch && allMatchesInRoundComplete) {
      const nextRoundIndex = currentMatch.roundIndex + 1;
      
      if (nextRoundIndex < state.bracket.length) {
        const nextRound = state.bracket[nextRoundIndex];
        
        // Find the first match in the next round that has both memes assigned
        nextMatch = nextRound.matches.find(m => 
          m.leftMeme && m.rightMeme && m.status === 'PENDING'
        ) || null;
      }
    }
    
    // Update tournament state
    if (nextMatch) {
      // Start the next match
      nextMatch.status = 'IN_PROGRESS';
      nextMatch.startedAt = new Date();
      state.currentMatch = nextMatch;
      state.status = 'DUEL_IN_PROGRESS';
      
      // Save updated state
      await this.repository.setState(state);
      
      // Notify listeners of state change
      if (this.onStateChange) {
        this.onStateChange(state);
      }
      
      // Start the timer for the next match
      this.startTimer();
    } else {
      // No more matches - tournament is finished
      state.currentMatch = null;
      state.winner = winner;
      state.status = 'TOURNAMENT_FINISHED';
      
      // Save updated state
      await this.repository.setState(state);
      
      // Notify listeners of state change
      if (this.onStateChange) {
        this.onStateChange(state);
      }
    }
    
    return state;
  }

  /**
   * Process a vote for the current match
   * Validates match is IN_PROGRESS and timeRemaining > 0
   * Increments vote count for chosen side
   * Updates match via repository
   * 
   * @param matchId - ID of the match being voted on
   * @param choice - Which side to vote for ('LEFT' or 'RIGHT')
   * @throws Error if match is not in progress or time has expired
   */
  async processVote(matchId: string, choice: 'LEFT' | 'RIGHT'): Promise<void> {
    const state = await this.repository.getState();
    
    if (!state) {
      throw new Error('No tournament state found');
    }
    
    if (!state.currentMatch) {
      throw new Error('No active match');
    }
    
    // Validate match ID
    if (state.currentMatch.id !== matchId) {
      throw new Error('Invalid match ID');
    }
    
    // Validate match is IN_PROGRESS
    if (state.currentMatch.status !== 'IN_PROGRESS') {
      throw new Error('Match is not in progress');
    }
    
    // Validate timeRemaining > 0
    if (state.currentMatch.timeRemaining <= 0) {
      throw new Error('Voting time has expired');
    }
    
    // Increment vote count for chosen side
    if (choice === 'LEFT') {
      state.currentMatch.votes.left += 1;
    } else if (choice === 'RIGHT') {
      state.currentMatch.votes.right += 1;
    } else {
      throw new Error('Invalid vote choice');
    }
    
    // Update the match in the bracket as well
    const currentRound = state.bracket[state.currentMatch.roundIndex];
    const matchInBracket = currentRound.matches[state.currentMatch.matchIndex];
    matchInBracket.votes = { ...state.currentMatch.votes };
    
    // Update match via repository
    await this.repository.setState(state);
    
    // Notify listeners of state change
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }
}
