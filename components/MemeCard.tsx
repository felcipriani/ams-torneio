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
  // Enhanced entrance animation: start from center, move to sides
  const getInitialPosition = () => {
    if (!side) return { x: 0, opacity: 1, scale: 1 };
    return { 
      x: 0, // Start at center
      opacity: 0, 
      scale: 0.8 
    };
  };

  const getAnimatePosition = () => {
    if (!side) return { x: 0, opacity: 1, scale: 1 };
    return { 
      x: 0, // End at natural position (grid handles positioning)
      opacity: 1, 
      scale: 1 
    };
  };

  return (
    <motion.div
      initial={getInitialPosition()}
      animate={getAnimatePosition()}
      transition={{ 
        duration: 0.8, 
        delay: side === 'left' ? 0.5 : 0.6,
        ease: [0.43, 0.13, 0.23, 0.96] // Custom easing for smooth motion
      }}
      className="flex h-fit w-[75%] md:w-full flex-col items-center space-y-4 p-2 md:p-4 bg-gray-800 rounded-lg shadow-xl hover:shadow-2xl transition-shadow duration-300"
      whileHover={!disabled ? { scale: 1.02, y: -5 } : {}}
    >
      {/* Vote count badge */}
      <div className="relative w-full">
        <div className="absolute -top-2 -right-2 z-10 bg-purple-600 text-white rounded-full w-8 h-8 md:w-10 md:h-10 flex items-center justify-center font-bold text-sm md:text-base shadow-lg">
          {voteCount}
        </div>
        
        {/* Image container with aspect ratio preservation */}
        <div className="relative w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[16/10] overflow-hidden rounded-lg bg-gray-700">
          <Image
            src={meme.imageUrl}
            alt={meme.caption}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>
      </div>
      
      {/* Caption */}
      <p className="text-white text-center text-sm md:text-base font-medium line-clamp-2">
        {meme.caption}
      </p>
      
      {/* Vote button */}
      <motion.button
        onClick={onVote}
        disabled={disabled}
        className={`
          w-full py-2 px-6 rounded-lg font-bold text-sm md:text-base transition-all duration-200
          ${disabled 
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
          }
        `}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
      >
        {disabled ? 'Você já Votou' : 'Votar'}
      </motion.button>
    </motion.div>
  );
}
