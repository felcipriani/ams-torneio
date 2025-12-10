'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Meme } from '@/types';
import { useEffect, useState } from 'react';

interface WinnerScreenProps {
  winner: Meme;
}

export function WinnerScreen({ winner }: WinnerScreenProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Trigger confetti animation after component mounts
    setShowConfetti(true);
  }, []);

  // Generate confetti particles
  const confettiCount = 50;
  const confettiColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

  return (
    <div className="relative h-screen bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 overflow-hidden">
      {/* Confetti animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: confettiCount }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                backgroundColor: confettiColors[i % confettiColors.length],
                left: `${Math.random() * 100}%`,
                top: -20,
              }}
              initial={{ y: -20, rotate: 0, opacity: 1 }}
              animate={{
                y: window.innerHeight + 20,
                rotate: Math.random() * 720 - 360,
                opacity: [1, 1, 0],
                x: Math.random() * 200 - 100,
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 0.5,
                ease: "easeIn",
              }}
            />
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 h-screen flex flex-col justify-center overflow-hidden p-4">
        {/* Title */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 260, 
            damping: 20,
            delay: 0.2 
          }}
          className="text-center mb-4 max-h-[12vh]"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-2 drop-shadow-2xl">
            🏆 Meme do Ano 🏆
          </h1>
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <p className="mb-4 text-xl md:text-2xl font-bold text-yellow-200 drop-shadow-lg">
              Campeão!
            </p>
          </motion.div>
        </motion.div>

        {/* Winner meme */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 100, 
            damping: 15,
            delay: 0.5 
          }}
          className="max-w-2xl w-full mx-auto max-h-[56vh] flex items-center"
        >
          <motion.div
            animate={{ 
              rotate: [0, -2, 2, -2, 0],
              scale: [1, 1.02, 1],
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="bg-white rounded-2xl shadow-2xl overflow-hidden p-2 w-full"
          >
            {/* Image */}
            <div className="relative w-full aspect-[4/3] md:aspect-[16/10] rounded-xl overflow-hidden mb-2 md:mb-4 shadow-xl">
              <Image
                src={winner.imageUrl}
                alt={winner.caption}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>

            {/* Caption */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800 text-center"
            >
              {winner.caption}
            </motion.p>
          </motion.div>
        </motion.div>

        {/* Celebration message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-4 text-center"
        >
          <p className="mt-4 text-lg md:text-xl text-white font-semibold drop-shadow-lg">
            Parabéns ao vencedor! 🎉
          </p>
        </motion.div>
      </div>
    </div>
  );
}
