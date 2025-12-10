'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

interface SnackbarProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  type?: 'success' | 'error' | 'info';
}

export function Snackbar({ 
  message, 
  isVisible, 
  onClose, 
  duration = 3000,
  type = 'success' 
}: SnackbarProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  const colors = {
    success: 'bg-green-500/90',
    error: 'bg-red-500/90',
    info: 'bg-blue-500/90'
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
          className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4"
        >
          <div className={`${colors[type]} text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 w-full max-w-md`}>
            <div className="flex-shrink-0">
              {icons[type]}
            </div>
            <p className="text-sm md:text-base font-medium flex-1">
              {message}
            </p>
            <button
              onClick={onClose}
              className="flex-shrink-0 hover:bg-white/20 rounded-full p-1 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
