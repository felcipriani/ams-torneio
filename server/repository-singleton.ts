import { InMemoryTournamentRepository } from './in-memory-repository';

/**
 * Singleton instance of the tournament repository
 * This ensures all parts of the application share the same data
 */
let repositoryInstance: InMemoryTournamentRepository | null = null;

export function getRepositoryInstance(): InMemoryTournamentRepository {
  if (!repositoryInstance) {
    repositoryInstance = new InMemoryTournamentRepository();
  }
  return repositoryInstance;
}
