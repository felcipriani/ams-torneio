'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  UploadZone, 
  MemeList, 
  TournamentConfig, 
  AdminDuelView, 
  BracketVisualization 
} from '@/components';

export default function AdminView() {
  const { tournamentState, isConnected, error, startTournament } = useWebSocket();
  const [memes, setMemes] = useState(tournamentState?.memes || []);

  // Refresh memes list after upload
  const handleUploadComplete = useCallback(async () => {
    try {
      const response = await fetch('/api/memes');
      if (response.ok) {
        const data = await response.json();
        setMemes(data.memes);
      }
    } catch (error) {
      console.error('Error fetching memes:', error);
    }
  }, []);

  // Handle meme deletion
  const handleMemeDelete = useCallback((memeId: string) => {
    setMemes(prev => prev.filter(meme => meme.id !== memeId));
  }, []);

  // Handle caption update
  const handleCaptionUpdate = useCallback(async (memeId: string, newCaption: string) => {
    // Update local state optimistically
    setMemes(prev => prev.map(meme => 
      meme.id === memeId ? { ...meme, caption: newCaption } : meme
    ));
    
    // TODO: Add API endpoint to update caption if needed
    // For now, caption updates are only local
  }, []);

  // Handle tournament start
  const handleStartTournament = useCallback(async (votingTimeSeconds: number) => {
    startTournament(votingTimeSeconds);
  }, [startTournament]);

  // Update memes when tournament state changes
  if (tournamentState?.memes && tournamentState.memes.length !== memes.length) {
    setMemes(tournamentState.memes);
  }

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

  const status = tournamentState?.status || 'WAITING';
  const isWaiting = status === 'WAITING';
  const isTournamentActive = status === 'DUEL_IN_PROGRESS';
  const isTournamentFinished = status === 'TOURNAMENT_FINISHED';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-2"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Painel Administrativo
          </h1>
          <p className="text-gray-300 text-lg">
            Campeonato de Memes
          </p>
        </motion.div>

        {/* Waiting State - Setup Phase */}
        <AnimatePresence mode="wait">
          {isWaiting && (
            <motion.div 
              key="waiting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
            {/* Tournament Configuration */}
            <TournamentConfig
              memeCount={memes.length}
              tournamentStatus={status}
              onStart={handleStartTournament}
            />

            {/* Upload Zone */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Upload de Memes
              </h2>
              <UploadZone onUploadComplete={handleUploadComplete} />
            </div>

            {/* Meme List */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Memes Carregados ({memes.length})
              </h2>
              <MemeList
                memes={memes}
                onDelete={handleMemeDelete}
                onCaptionUpdate={handleCaptionUpdate}
              />
            </div>
          </motion.div>
        )}

        {/* Tournament Active - Show Current Duel and Bracket */}
        {isTournamentActive && tournamentState && (
          <motion.div 
            key="active"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Current Duel */}
            {tournamentState.currentMatch && (
              <AdminDuelView match={tournamentState.currentMatch} />
            )}

            {/* Bracket Visualization */}
            <BracketVisualization
              bracket={tournamentState.bracket}
              currentMatchId={tournamentState.currentMatch?.id || null}
            />
          </motion.div>
        )}

        {/* Tournament Finished - Show Winner and Bracket */}
        {isTournamentFinished && tournamentState && (
          <motion.div 
            key="finished"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Winner Display */}
            {tournamentState.winner && (
              <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-700/30 border-2 border-yellow-500 rounded-lg p-8 text-center">
                <h2 className="text-3xl font-bold text-yellow-400 mb-4">
                  🏆 Campeão do Torneio 🏆
                </h2>
                <p className="text-white text-2xl font-semibold">
                  {tournamentState.winner.caption}
                </p>
              </div>
            )}

            {/* Final Bracket */}
            <BracketVisualization
              bracket={tournamentState.bracket}
              currentMatchId={null}
            />
          </motion.div>
        )}
        </AnimatePresence>

        {/* Connection Status Indicator */}
        <AnimatePresence>
          {!isConnected && (
            <motion.div 
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg"
            >
              <p className="text-sm font-semibold">Desconectado</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
