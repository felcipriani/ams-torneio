'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WaitingScreen } from '@/components/WaitingScreen';
import { DuelView } from '@/components/DuelView';
import { WinnerScreen } from '@/components/WinnerScreen';

export default function Home() {
  const { tournamentState, isConnected, error, castVote } = useWebSocket();

  // Show loading state while connecting
  if (!isConnected && !tournamentState) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">Conectando...</p>
        </div>
      </motion.div>
    );
  }

  // Show error state if there's an error
  if (error && !tournamentState) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-red-900"
      >
        <div className="text-center max-w-md p-8">
          <p className="text-red-400 text-2xl font-bold mb-4">Erro de Conexão</p>
          <p className="text-white text-lg">{error}</p>
        </div>
      </motion.div>
    );
  }

  // Determine which view to show
  const getView = () => {
    if (!tournamentState || tournamentState.status === 'WAITING') {
      return { key: 'waiting', component: <WaitingScreen /> };
    }

    if (tournamentState.status === 'DUEL_IN_PROGRESS' && tournamentState.currentMatch) {
      return { 
        key: `duel-${tournamentState.currentMatch.id}`, 
        component: <DuelView match={tournamentState.currentMatch} onVote={castVote} />
      };
    }

    if (tournamentState.status === 'TOURNAMENT_FINISHED' && tournamentState.winner) {
      return { 
        key: 'winner', 
        component: <WinnerScreen winner={tournamentState.winner} />
      };
    }

    // Fallback
    return { key: 'waiting', component: <WaitingScreen /> };
  };

  const { key, component } = getView();

  // Render with smooth transitions between states
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {component}
      </motion.div>
    </AnimatePresence>
  );
}
