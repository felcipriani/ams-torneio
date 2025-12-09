'use client';

import { motion } from 'framer-motion';

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
}

export function Timer({ timeRemaining, totalTime }: TimerProps) {
  // Calculate progress percentage
  const progress = totalTime > 0 ? (timeRemaining / totalTime) * 100 : 0;
  
  // Determine color based on urgency
  const getColor = () => {
    const percentage = (timeRemaining / totalTime) * 100;
    if (percentage > 50) return 'text-green-500';
    if (percentage > 25) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  const getStrokeColor = () => {
    const percentage = (timeRemaining / totalTime) * 100;
    if (percentage > 50) return '#22c55e'; // green-500
    if (percentage > 25) return '#eab308'; // yellow-500
    return '#ef4444'; // red-500
  };

  // Circle properties
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-40 h-40">
        <svg className="transform -rotate-90 w-40 h-40">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-700"
          />
          {/* Progress circle */}
          <motion.circle
            cx="80"
            cy="80"
            r={radius}
            stroke={getStrokeColor()}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: "linear" }}
          />
        </svg>
        
        {/* Time display in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className={`text-5xl font-bold ${getColor()}`}
            animate={timeRemaining <= 5 && timeRemaining > 0 ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: timeRemaining <= 5 ? Infinity : 0 }}
          >
            {timeRemaining}
          </motion.span>
        </div>
      </div>
      
      <p className="mt-4 text-gray-400 text-sm">segundos restantes</p>
    </div>
  );
}
