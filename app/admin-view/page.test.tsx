/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminView from './page';
import * as useWebSocketModule from '@/hooks/useWebSocket';

// Mock the useWebSocket hook
vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock child components
vi.mock('@/components/UploadZone', () => ({
  UploadZone: () => <div data-testid="upload-zone">Upload Zone</div>,
}));

vi.mock('@/components/MemeList', () => ({
  MemeList: () => <div data-testid="meme-list">Meme List</div>,
}));

vi.mock('@/components/TournamentConfig', () => ({
  TournamentConfig: () => <div data-testid="tournament-config">Tournament Config</div>,
}));

vi.mock('@/components/AdminDuelView', () => ({
  AdminDuelView: () => <div data-testid="admin-duel-view">Admin Duel View</div>,
}));

vi.mock('@/components/BracketVisualization', () => ({
  BracketVisualization: () => <div data-testid="bracket-visualization">Bracket Visualization</div>,
}));

vi.mock('@/components/Snackbar', () => ({
  Snackbar: () => <div data-testid="snackbar">Snackbar</div>,
}));

// Mock fetch globally
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ memes: [] }),
  } as Response)
);

describe('AdminView - Reset Button Visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Unit test for reset button visibility
   * Verifies that the reset button is present in the admin interface
   * regardless of tournament state
   */
  it('should display reset button in WAITING state', () => {
    // Mock useWebSocket to return WAITING state
    vi.mocked(useWebSocketModule.useWebSocket).mockReturnValue({
      tournamentState: {
        status: 'WAITING',
        memes: [],
        bracket: [],
        currentMatch: null,
        winner: null,
        config: { votingTimeSeconds: 30 },
      },
      isConnected: true,
      error: null,
      startTournament: vi.fn(),
      vote: vi.fn(),
      resetTournament: vi.fn().mockResolvedValue({ deletedCount: 0, errors: [] }),
    });

    render(<AdminView />);

    // Verify reset button is present
    const resetButton = screen.getByRole('button', { name: /REINICIAR TORNEIO/i });
    expect(resetButton).toBeDefined();
    expect(resetButton.disabled).toBe(false);
  });

  it('should display reset button in DUEL_IN_PROGRESS state', () => {
    // Mock useWebSocket to return DUEL_IN_PROGRESS state
    vi.mocked(useWebSocketModule.useWebSocket).mockReturnValue({
      tournamentState: {
        status: 'DUEL_IN_PROGRESS',
        memes: [
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
        ],
        bracket: [],
        currentMatch: {
          id: 'match-1',
          roundIndex: 0,
          matchIndex: 0,
          leftMeme: {
            id: '1',
            imageUrl: '/uploads/meme1.jpg',
            caption: 'Meme 1',
            uploadedAt: new Date(),
          },
          rightMeme: {
            id: '2',
            imageUrl: '/uploads/meme2.jpg',
            caption: 'Meme 2',
            uploadedAt: new Date(),
          },
          votes: { left: 5, right: 3 },
          timeRemaining: 20,
          totalTime: 30,
          status: 'IN_PROGRESS',
          winner: null,
          startedAt: new Date(),
          completedAt: null,
        },
        winner: null,
        config: { votingTimeSeconds: 30 },
      },
      isConnected: true,
      error: null,
      startTournament: vi.fn(),
      vote: vi.fn(),
      resetTournament: vi.fn().mockResolvedValue({ deletedCount: 0, errors: [] }),
    });

    render(<AdminView />);

    // Verify reset button is present
    const resetButton = screen.getByRole('button', { name: /REINICIAR TORNEIO/i });
    expect(resetButton).toBeDefined();
    expect(resetButton.disabled).toBe(false);
  });

  it('should display reset button in TOURNAMENT_FINISHED state', () => {
    // Mock useWebSocket to return TOURNAMENT_FINISHED state
    vi.mocked(useWebSocketModule.useWebSocket).mockReturnValue({
      tournamentState: {
        status: 'TOURNAMENT_FINISHED',
        memes: [
          {
            id: '1',
            imageUrl: '/uploads/meme1.jpg',
            caption: 'Winner Meme',
            uploadedAt: new Date(),
          },
        ],
        bracket: [],
        currentMatch: null,
        winner: {
          id: '1',
          imageUrl: '/uploads/meme1.jpg',
          caption: 'Winner Meme',
          uploadedAt: new Date(),
        },
        config: { votingTimeSeconds: 30 },
      },
      isConnected: true,
      error: null,
      startTournament: vi.fn(),
      vote: vi.fn(),
      resetTournament: vi.fn().mockResolvedValue({ deletedCount: 0, errors: [] }),
    });

    render(<AdminView />);

    // Verify reset button is present
    const resetButton = screen.getByRole('button', { name: /REINICIAR TORNEIO/i });
    expect(resetButton).toBeDefined();
    expect(resetButton.disabled).toBe(false);
  });

  it('should disable reset button when not connected', () => {
    // Mock useWebSocket to return disconnected state
    vi.mocked(useWebSocketModule.useWebSocket).mockReturnValue({
      tournamentState: {
        status: 'WAITING',
        memes: [],
        bracket: [],
        currentMatch: null,
        winner: null,
        config: { votingTimeSeconds: 30 },
      },
      isConnected: false,
      error: null,
      startTournament: vi.fn(),
      vote: vi.fn(),
      resetTournament: vi.fn().mockResolvedValue({ deletedCount: 0, errors: [] }),
    });

    render(<AdminView />);

    // Verify reset button is present but disabled
    const resetButton = screen.getByRole('button', { name: /REINICIAR TORNEIO/i });
    expect(resetButton).toBeDefined();
    expect(resetButton.disabled).toBe(true);
  });

  it('should disable reset button while reset is in progress', async () => {
    // Mock useWebSocket
    const mockResetTournament = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        // Simulate a delay
        setTimeout(() => resolve({ deletedCount: 0, errors: [] }), 100);
      });
    });

    vi.mocked(useWebSocketModule.useWebSocket).mockReturnValue({
      tournamentState: {
        status: 'WAITING',
        memes: [],
        bracket: [],
        currentMatch: null,
        winner: null,
        config: { votingTimeSeconds: 30 },
      },
      isConnected: true,
      error: null,
      startTournament: vi.fn(),
      vote: vi.fn(),
      resetTournament: mockResetTournament,
    });

    const { rerender } = render(<AdminView />);

    // Get reset button and click it
    const resetButton = screen.getByRole('button', { name: /REINICIAR TORNEIO/i });
    expect(resetButton.disabled).toBe(false);

    // Click the button
    resetButton.click();

    // Re-render to see the loading state
    rerender(<AdminView />);

    // The button should show loading text
    const loadingButton = screen.getByRole('button', { name: /REINICIANDO/i });
    expect(loadingButton).toBeDefined();
    expect(loadingButton.disabled).toBe(true);
  });
});
