'use client';

import React, { Component, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
    // Reload the page to reset state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-red-900 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-md w-full bg-gray-800 rounded-lg shadow-2xl p-8"
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, -10, 0],
                }}
                transition={{ 
                  duration: 0.5,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
              >
                <AlertTriangle className="w-20 h-20 text-red-500" />
              </motion.div>

              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Algo deu errado
                </h1>
                <p className="text-gray-400 mb-4">
                  Ocorreu um erro inesperado na aplicação.
                </p>
              </div>

              {this.state.error && (
                <div className="w-full bg-gray-900 rounded p-4 text-left">
                  <p className="text-sm text-red-400 font-mono break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <button
                onClick={this.handleReset}
                className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Recarregar Aplicação
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
