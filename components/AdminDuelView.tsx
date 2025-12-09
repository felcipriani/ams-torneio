'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Match } from '@/types';
import { Timer } from './Timer';
import { Trophy, Users } from 'lucide-react';

interface AdminDuelViewProps {
  match: Match;
}

export function AdminDuelView({ match }: AdminDuelViewProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-700">
        <h2 className="text-2xl font-bold text-white">Duelo Atual</h2>
        <div className="flex items-center space-x-4 text-gray-300">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5" />
            <span>Round {match.roundIndex + 1}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Match {match.matchIndex + 1}</span>
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className="flex justify-center py-4">
        <Timer 
          timeRemaining={match.timeRemaining} 
          totalTime={match.totalTime} 
        />
      </div>

      {/* Match Status */}
      <div className="text-center">
        <span className={`
          inline-block px-4 py-2 rounded-full text-sm font-semibold
          ${match.status === 'IN_PROGRESS' ? 'bg-green-900/30 text-green-400 border border-green-700' : ''}
          ${match.status === 'PENDING' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700' : ''}
          ${match.status === 'COMPLETED' ? 'bg-blue-900/30 text-blue-400 border border-blue-700' : ''}
        `}>
          {match.status === 'IN_PROGRESS' && 'Em Andamento'}
          {match.status === 'PENDING' && 'Aguardando'}
          {match.status === 'COMPLETED' && 'Concluído'}
        </span>
      </div>

      {/* Memes Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Meme */}
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-gray-700 rounded-lg overflow-hidden"
        >
          {/* Image */}
          <div className="relative w-full aspect-square bg-gray-900">
            <Image
              src={match.leftMeme.imageUrl}
              alt={match.leftMeme.caption}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            <p className="text-white text-center font-medium min-h-[3rem] flex items-center justify-center">
              {match.leftMeme.caption}
            </p>
            
            {/* Vote Counter */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Votos:</span>
                <motion.span 
                  key={match.votes.left}
                  initial={{ scale: 1.5, color: '#a855f7' }}
                  animate={{ scale: 1, color: '#ffffff' }}
                  className="text-3xl font-bold text-white"
                >
                  {match.votes.left}
                </motion.span>
              </div>
              
              {/* Vote bar */}
              <div className="mt-2 h-2 bg-gray-900 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${
                      match.votes.left + match.votes.right > 0
                        ? (match.votes.left / (match.votes.left + match.votes.right)) * 100
                        : 50
                    }%` 
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Meme */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-gray-700 rounded-lg overflow-hidden"
        >
          {/* Image */}
          <div className="relative w-full aspect-square bg-gray-900">
            <Image
              src={match.rightMeme.imageUrl}
              alt={match.rightMeme.caption}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            <p className="text-white text-center font-medium min-h-[3rem] flex items-center justify-center">
              {match.rightMeme.caption}
            </p>
            
            {/* Vote Counter */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Votos:</span>
                <motion.span 
                  key={match.votes.right}
                  initial={{ scale: 1.5, color: '#a855f7' }}
                  animate={{ scale: 1, color: '#ffffff' }}
                  className="text-3xl font-bold text-white"
                >
                  {match.votes.right}
                </motion.span>
              </div>
              
              {/* Vote bar */}
              <div className="mt-2 h-2 bg-gray-900 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${
                      match.votes.left + match.votes.right > 0
                        ? (match.votes.right / (match.votes.left + match.votes.right)) * 100
                        : 50
                    }%` 
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Total Votes */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Total de votos:</span>
          <span className="text-2xl font-bold text-white">
            {match.votes.left + match.votes.right}
          </span>
        </div>
      </div>
    </div>
  );
}
