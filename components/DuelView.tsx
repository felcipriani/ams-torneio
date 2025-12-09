'use client';

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Duelo de Memes
          </h1>
          <p className="text-xl text-gray-300">
            Round {match.roundIndex + 1} - Match {match.matchIndex + 1}
          </p>
        </div>

        {/* Timer */}
        <div className="flex justify-center mb-8">
          <Timer 
            timeRemaining={match.timeRemaining} 
            totalTime={match.totalTime} 
          />
        </div>

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
        {!isVotingEnabled && (
          <div className="text-center mt-8">
            <p className="text-2xl text-yellow-400 font-semibold">
              {match.status === 'COMPLETED' 
                ? 'Duelo encerrado! Aguarde o próximo...' 
                : 'Aguardando início...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
