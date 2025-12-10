'use client';

import { motion } from 'framer-motion';

export function WaitingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-h-[40vh]"
      >
        <motion.h1
          className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-8"
          animate={{ 
            opacity: [0.7, 1, 0.7],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          Sessão ainda não iniciada
        </motion.h1>
        
        <motion.div
          className="flex justify-center space-x-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="w-3 h-3 bg-white rounded-full" />
          <div className="w-3 h-3 bg-white rounded-full" />
          <div className="w-3 h-3 bg-white rounded-full" />
        </motion.div>
      </motion.div>
    </div>
  );
}
