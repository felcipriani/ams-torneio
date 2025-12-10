'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Match, VoteChoice } from '@/types';
import { MemeCard } from './MemeCard';
import { Timer } from './Timer';

interface DuelViewProps {
  match: Match;
  onVote: (matchId: string, choice: VoteChoice) => void;
}

export function DuelView({ match, onVote }: DuelViewProps) {
  // Determine if voting is enabled
  const isVotingEnabled = match.status === 'IN_PROGRESS' && match.timeRemaining > 0;

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
      className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 md:p-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Duelo de Memes
          </h1>
          <p className="text-xl text-gray-300">
            Round {match.roundIndex + 1} - Match {match.matchIndex + 1}
          </p>
        </motion.div>

        {/* Timer */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4, type: "spring", stiffness: 200 }}
          className="flex justify-center mb-8"
        >
          <Timer 
            timeRemaining={match.timeRemaining} 
            totalTime={match.totalTime}
            size="small"
          />
        </motion.div>

        {/* Meme Cards - Side by side on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
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

        {/* Status message */}
        <AnimatePresence>
          {!isVotingEnabled && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center mt-8"
            >
              <p className="text-2xl text-yellow-400 font-semibold">
                {match.status === 'COMPLETED' 
                  ? 'Duelo encerrado! Aguarde o próximo...' 
                  : 'Aguardando início...'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
