/**
 * Vote Lock Manager
 * 
 * Tracks which users have voted in which matches to enforce vote-once-per-user policy.
 * Uses session tokens to identify users across browser sessions and refreshes.
 */

export class VoteLockManager {
  // Map: matchId → Set<sessionToken>
  private matchVotes: Map<string, Set<string>>;

  constructor() {
    this.matchVotes = new Map();
  }

  /**
   * Check if a user has already voted in a match
   * @param sessionToken - User's session token
   * @param matchId - Match ID
   * @returns true if user has already voted
   */
  hasVoted(sessionToken: string, matchId: string): boolean {
    const voters = this.matchVotes.get(matchId);
    return voters ? voters.has(sessionToken) : false;
  }

  /**
   * Record that a user has voted in a match
   * @param sessionToken - User's session token
   * @param matchId - Match ID
   */
  recordVote(sessionToken: string, matchId: string): void {
    let voters = this.matchVotes.get(matchId);
    
    if (!voters) {
      voters = new Set();
      this.matchVotes.set(matchId, voters);
    }
    
    voters.add(sessionToken);
  }

  /**
   * Clear vote locks for a specific match (when match completes)
   * @param matchId - Match ID
   */
  clearMatchLocks(matchId: string): void {
    this.matchVotes.delete(matchId);
  }

  /**
   * Clear all vote locks (when tournament ends)
   */
  clearAllLocks(): void {
    this.matchVotes.clear();
  }

  /**
   * Get all users who voted in a match (for debugging)
   * @param matchId - Match ID
   * @returns Array of session tokens
   */
  getVotersForMatch(matchId: string): string[] {
    const voters = this.matchVotes.get(matchId);
    return voters ? Array.from(voters) : [];
  }
}
