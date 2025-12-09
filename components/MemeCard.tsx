'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Meme } from '@/types';

interface MemeCardProps {
  meme: Meme;
  voteCount: number;
  onVote: () => void;
  disabled?: boolean;
  side?: 'left' | 'right';
}

export function MemeCard({ meme, voteCount, onVote, disabled = false, side }: MemeCardProps) {
  return (
    <motion.div
      initial={side ? { x: side === 'left' ? -100 : 100, opacity: 0 } : { opacity: 1 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center space-y-4 p-6 bg-gray-800 rounded-lg shadow-xl hover:shadow-2xl transition-shadow duration-300"
      whileHover={!disabled ? { scale: 1.02 } : {}}
    >
      {/* Vote count badge */}
      <div className="relative w-full">
        <div className="absolute -top-3 -right-3 z-10 bg-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-lg">
          {voteCount}
        </div>
        
        {/* Image container with aspect ratio preservation */}
        <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-gray-700">
          <Image
            src={meme.imageUrl}
            alt={meme.caption}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>
      </div>
      
      {/* Caption */}
      <p className="text-white text-center text-lg font-medium min-h-[3rem] flex items-center">
        {meme.caption}
      </p>
      
      {/* Vote button */}
      <motion.button
        onClick={onVote}
        disabled={disabled}
        className={`
          w-full py-3 px-6 rounded-lg font-bold text-lg transition-all duration-200
          ${disabled 
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
          }
        `}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
      >
        {disabled ? 'Votação Encerrada' : 'Votar'}
      </motion.button>
    </motion.div>
  );
}
