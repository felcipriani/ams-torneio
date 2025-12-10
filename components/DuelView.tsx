'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Match, VoteChoice } from '@/types';
import { MemeCard } from './MemeCard';
import { Timer } from './Timer';
import { Snackbar } from './Snackbar';

interface DuelViewProps {
  match: Match;
  onVote: (matchId: string, choice: VoteChoice) => void;
  error?: string | null;
  hasVotedInCurrentMatch?: boolean;
}

export function DuelView({ match, onVote, error, hasVotedInCurrentMatch = false }: DuelViewProps) {
  const [showVotedSnackbar, setShowVotedSnackbar] = useState(false);
  const [previousMatchId, setPreviousMatchId] = useState(match.id);

  // Determine if voting is enabled
  // Disable voting if user has already voted in this match
  const isVotingEnabled = match.status === 'IN_PROGRESS' && match.timeRemaining > 0 && !hasVotedInCurrentMatch;

  // Show snackbar when user has voted
  useEffect(() => {
    // Reset snackbar when match changes
    if (match.id !== previousMatchId) {
      setPreviousMatchId(match.id);
      setShowVotedSnackbar(false);
    }

    // Show snackbar when user votes
    if (hasVotedInCurrentMatch && match.status === 'IN_PROGRESS') {
      setShowVotedSnackbar(true);
    }
  }, [hasVotedInCurrentMatch, match.id, match.status, previousMatchId]);

  const handleLeftVote = () => {
    if (isVotingEnabled) {
      onVote(match.id, 'LEFT');
    }
  };

  const handleRightVote = () => {
    if (isVotingEnabled) {
      onVote(match.id, 'RIGHT');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full md:h-screen flex flex-col md:overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 md:justify-center justify-center"
    >
      {/* Header */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="h-[10vh] md:h-[12vh] flex flex-col justify-center text-center px-2 md:px-4"
      >
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1">
          Duelo de Memes
        </h1>
        <p className="text-sm md:text-base text-gray-300">
          Round {match.roundIndex + 1} - Match {match.matchIndex + 1}
        </p>
      </motion.div>

      {/* Timer */}
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4, type: "spring", stiffness: 200 }}
        className="h-[10vh] md:h-[12vh] flex justify-center items-center"
      >
        <Timer 
          timeRemaining={match.timeRemaining} 
          totalTime={match.totalTime}
          size="small"
        />
      </motion.div>

      {/* Meme Cards - Side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 p-2 md:p-4 md:overflow-hidden max-w-7xl mx-auto w-full justify-items-center">
        <MemeCard
          meme={match.leftMeme}
          voteCount={match.votes.left}
          onVote={handleLeftVote}
          disabled={!isVotingEnabled}
          side="left"
        />
        
        <MemeCard
          meme={match.rightMeme}
          voteCount={match.votes.right}
          onVote={handleRightVote}
          disabled={!isVotingEnabled}
          side="right"
        />
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute top-20 left-0 right-0 flex justify-center px-4"
          >
            <div className="bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-lg max-w-md">
              <p className="text-sm md:text-base font-semibold">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status message - only for completed or waiting states */}
      <AnimatePresence>
        {!isVotingEnabled && !hasVotedInCurrentMatch && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-4 left-0 right-0 text-center"
          >
            <p className="text-xl md:text-2xl text-yellow-400 font-semibold">
              {match.status === 'COMPLETED' 
                ? 'Duelo encerrado! Aguarde o próximo...' 
                : 'Aguardando início...'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snackbar for voted confirmation */}
      <Snackbar
        message="✓ Você já votou neste duelo!"
        isVisible={showVotedSnackbar}
        onClose={() => setShowVotedSnackbar(false)}
        duration={4000}
        type="success"
      />
    </motion.div>
  );
}
