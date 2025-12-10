import { 
  ITournamentRepository, 
  TournamentState, 
  Meme, 
  Match 
} from '../types';

/**
 * In-memory implementation of ITournamentRepository.
 * Stores all data in JavaScript Maps and objects.
 * Data is lost on server restart.
 */
export class InMemoryTournamentRepository implements ITournamentRepository {
  private state: TournamentState | null = null;
  private memes: Map<string, Meme> = new Map();
  private matches: Map<string, Match> = new Map();

  // ============================================================================
  // State operations
  // ============================================================================

  async getState(): Promise<TournamentState | null> {
    return this.state;
  }

  async setState(state: TournamentState): Promise<void> {
    this.state = state;
    
    // Update internal memes map
    this.memes.clear();
    state.memes.forEach(meme => {
      this.memes.set(meme.id, meme);
    });
    
    // Update internal matches map
    this.matches.clear();
    state.bracket.forEach(round => {
      round.matches.forEach(match => {
        this.matches.set(match.id, match);
      });
    });
  }

  async clearState(): Promise<void> {
    this.state = null;
    this.memes.clear();
    this.matches.clear();
  }

  // ============================================================================
  // Meme operations
  // ============================================================================

  async addMeme(meme: Meme): Promise<void> {
    this.memes.set(meme.id, meme);
    
    // Always update state, create if doesn't exist
    if (!this.state) {
      this.state = {
        status: 'WAITING',
        memes: [meme],
        bracket: [],
        currentMatch: null,
        winner: null,
        config: {
          votingTimeSeconds: 30
        }
      };
    } else {
      this.state.memes.push(meme);
    }
  }

  async getMemes(): Promise<Meme[]> {
    return Array.from(this.memes.values());
  }

  async getMemeById(id: string): Promise<Meme | null> {
    return this.memes.get(id) || null;
  }

  async deleteMeme(id: string): Promise<void> {
    this.memes.delete(id);
    
    // Always update state if it exists
    if (this.state) {
      this.state.memes = this.state.memes.filter(meme => meme.id !== id);
    }
  }

  // ============================================================================
  // Match operations
  // ============================================================================

  async updateMatch(match: Match): Promise<void> {
    this.matches.set(match.id, match);
    
    // Update match in state if it exists
    if (this.state) {
      for (const round of this.state.bracket) {
        const matchIndex = round.matches.findIndex(m => m.id === match.id);
        if (matchIndex !== -1) {
          round.matches[matchIndex] = match;
          break;
        }
      }
      
      // Update current match if it's the one being updated
      if (this.state.currentMatch?.id === match.id) {
        this.state.currentMatch = match;
      }
    }
  }

  async getMatchById(id: string): Promise<Match | null> {
    return this.matches.get(id) || null;
  }
}
