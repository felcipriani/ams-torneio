'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Round, Match } from '@/types';
import { Trophy, Clock, CheckCircle } from 'lucide-react';

interface BracketVisualizationProps {
  bracket: Round[];
  currentMatchId: string | null;
}

export function BracketVisualization({ bracket, currentMatchId }: BracketVisualizationProps) {
  if (bracket.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-gray-400 text-center">
          Nenhum bracket gerado ainda
        </p>
      </div>
    );
  }

  const getMatchStatus = (match: Match) => {
    if (match.id === currentMatchId) {
      return 'current';
    }
    if (match.status === 'COMPLETED') {
      return 'completed';
    }
    return 'upcoming';
  };

  const getMatchBorderClass = (match: Match) => {
    const status = getMatchStatus(match);
    if (status === 'current') {
      return 'border-purple-500 border-2 shadow-lg shadow-purple-500/50 animate-pulse';
    }
    if (status === 'completed') {
      return 'border-green-700 border';
    }
    return 'border-gray-700 border';
  };

  const getMatchBgClass = (match: Match) => {
    const status = getMatchStatus(match);
    if (status === 'current') {
      return 'bg-purple-900/20';
    }
    if (status === 'completed') {
      return 'bg-gray-800';
    }
    return 'bg-gray-800/50';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-700">
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          <Trophy className="w-6 h-6" />
          <span>Bracket do Torneio</span>
        </h2>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-gray-300">Atual</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-300">Concluído</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-600" />
            <span className="text-gray-300">Aguardando</span>
          </div>
        </div>
      </div>

      {/* Bracket Display */}
      <div className="overflow-x-auto">
        <div className="flex space-x-8 min-w-max pb-4">
          {bracket.map((round, roundIndex) => (
            <div key={roundIndex} className="flex flex-col space-y-4 min-w-[280px]">
              {/* Round Label */}
              <div className="text-center mb-2">
                <h3 className="text-lg font-bold text-white">
                  {roundIndex === bracket.length - 1 
                    ? 'Final' 
                    : roundIndex === bracket.length - 2
                    ? 'Semifinal'
                    : `Round ${roundIndex + 1}`
                  }
                </h3>
                <p className="text-sm text-gray-400">
                  {round.matches.length} {round.matches.length === 1 ? 'duelo' : 'duelos'}
                </p>
              </div>

              {/* Matches */}
              <div className="flex flex-col justify-around space-y-4 flex-1">
                {round.matches.map((match, matchIndex) => {
                  const status = getMatchStatus(match);
                  const isCompleted = status === 'completed';
                  const isCurrent = status === 'current';
                  const isUpcoming = status === 'upcoming';
                  
                  // Check if memes are assigned yet (they might be null for future rounds)
                  const hasLeftMeme = match.leftMeme != null;
                  const hasRightMeme = match.rightMeme != null;
                  const hasBothMemes = hasLeftMeme && hasRightMeme;

                  return (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: roundIndex * 0.1 + matchIndex * 0.05 }}
                      className={`
                        rounded-lg p-3 space-y-2 transition-all
                        ${getMatchBorderClass(match)}
                        ${getMatchBgClass(match)}
                        ${isUpcoming ? 'opacity-60' : ''}
                      `}
                    >
                      {/* Match Header */}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Match {matchIndex + 1}</span>
                        {isCurrent && (
                          <div className="flex items-center space-x-1 text-purple-400">
                            <Clock className="w-3 h-3" />
                            <span>Em andamento</span>
                          </div>
                        )}
                        {isCompleted && (
                          <div className="flex items-center space-x-1 text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            <span>Concluído</span>
                          </div>
                        )}
                      </div>

                      {!hasBothMemes ? (
                        // Show placeholder when memes aren't assigned yet
                        <div className="text-center py-6 text-gray-500 text-sm">
                          Aguardando vencedores da rodada anterior...
                        </div>
                      ) : (
                        <>
                          {/* Left Meme */}
                          <div className={`
                            flex items-center space-x-2 p-2 rounded
                            ${isCompleted && match.winner?.id === match.leftMeme.id 
                              ? 'bg-green-900/30 border border-green-700' 
                              : 'bg-gray-700/50'
                            }
                          `}>
                            <div className="relative w-12 h-12 rounded overflow-hidden bg-gray-900 flex-shrink-0">
                              <Image
                                src={match.leftMeme.imageUrl}
                                alt={match.leftMeme.caption}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm truncate">
                                {match.leftMeme.caption}
                              </p>
                              {!isUpcoming && (
                                <p className="text-gray-400 text-xs">
                                  {match.votes.left} votos
                                </p>
                              )}
                            </div>
                            {isCompleted && match.winner?.id === match.leftMeme.id && (
                              <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                            )}
                          </div>

                          {/* VS Divider */}
                          <div className="text-center">
                            <span className="text-xs text-gray-500 font-bold">VS</span>
                          </div>

                          {/* Right Meme */}
                          <div className={`
                            flex items-center space-x-2 p-2 rounded
                            ${isCompleted && match.winner?.id === match.rightMeme.id 
                              ? 'bg-green-900/30 border border-green-700' 
                              : 'bg-gray-700/50'
                            }
                          `}>
                            <div className="relative w-12 h-12 rounded overflow-hidden bg-gray-900 flex-shrink-0">
                              <Image
                                src={match.rightMeme.imageUrl}
                                alt={match.rightMeme.caption}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm truncate">
                                {match.rightMeme.caption}
                              </p>
                              {!isUpcoming && (
                                <p className="text-gray-400 text-xs">
                                  {match.votes.right} votos
                                </p>
                              )}
                            </div>
                            {isCompleted && match.winner?.id === match.rightMeme.id && (
                              <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                            )}
                          </div>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
