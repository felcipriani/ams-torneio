'use client';

import { motion } from 'framer-motion';

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
  size?: 'small' | 'medium' | 'large';
}

export function Timer({ timeRemaining, totalTime, size = 'large' }: TimerProps) {
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

  // Size-based configurations
  const sizeConfig = {
    small: {
      containerClass: 'w-20 h-20',
      svgClass: 'w-20 h-20',
      center: 40,
      radius: 30,
      strokeWidth: 6,
      textClass: 'text-3xl'
    },
    medium: {
      containerClass: 'w-28 h-28',
      svgClass: 'w-28 h-28',
      center: 56,
      radius: 45,
      strokeWidth: 7,
      textClass: 'text-4xl'
    },
    large: {
      containerClass: 'w-40 h-40',
      svgClass: 'w-40 h-40',
      center: 80,
      radius: 60,
      strokeWidth: 8,
      textClass: 'text-5xl'
    }
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`relative ${config.containerClass}`}>
        <svg className={`transform -rotate-90 ${config.svgClass}`}>
          {/* Background circle */}
          <circle
            cx={config.center}
            cy={config.center}
            r={config.radius}
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            fill="none"
            className="text-gray-700"
          />
          {/* Progress circle */}
          <motion.circle
            cx={config.center}
            cy={config.center}
            r={config.radius}
            stroke={getStrokeColor()}
            strokeWidth={config.strokeWidth}
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
            className={`${config.textClass} font-bold ${getColor()}`}
            animate={timeRemaining <= 5 && timeRemaining > 0 ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: timeRemaining <= 5 ? Infinity : 0 }}
          >
            {timeRemaining}
          </motion.span>
        </div>
      </div>
      
      <p className="md:mt-2 mb-4 text-gray-400 text-sm">Segundos Restantes</p>
    </div>
  );
}
