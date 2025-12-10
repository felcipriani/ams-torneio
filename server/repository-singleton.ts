import { InMemoryTournamentRepository } from './in-memory-repository';

/**
 * Singleton instance of the tournament repository
 * This ensures all parts of the application share the same data
 * Uses global to persist across hot reloads in development
 */
declare global {
  var __tournamentRepository: InMemoryTournamentRepository | undefined;
}

export function getRepositoryInstance(): InMemoryTournamentRepository {
  if (!global.__tournamentRepository) {
    global.__tournamentRepository = new InMemoryTournamentRepository();
  }
  return global.__tournamentRepository;
}
