'use client';

import { useWebSocket } from '@/hooks/useWebSocket';
import { WaitingScreen } from '@/components/WaitingScreen';
import { DuelView } from '@/components/DuelView';
import { WinnerScreen } from '@/components/WinnerScreen';

export default function Home() {
  const { tournamentState, isConnected, error, castVote } = useWebSocket();

  // Show loading state while connecting
  if (!isConnected && !tournamentState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">Conectando...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error && !tournamentState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-red-900">
        <div className="text-center max-w-md p-8">
          <p className="text-red-400 text-2xl font-bold mb-4">Erro de Conexão</p>
          <p className="text-white text-lg">{error}</p>
        </div>
      </div>
    );
  }

  // Render based on tournament status
  if (!tournamentState || tournamentState.status === 'WAITING') {
    return <WaitingScreen />;
  }

  if (tournamentState.status === 'DUEL_IN_PROGRESS' && tournamentState.currentMatch) {
    return (
      <DuelView 
        match={tournamentState.currentMatch} 
        onVote={castVote}
      />
    );
  }

  if (tournamentState.status === 'TOURNAMENT_FINISHED' && tournamentState.winner) {
    return <WinnerScreen winner={tournamentState.winner} />;
  }

  // Fallback for unexpected states
  return <WaitingScreen />;
}
