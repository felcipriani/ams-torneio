'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Clock, AlertCircle } from 'lucide-react';
import { TournamentStatus } from '@/types';

interface TournamentConfigProps {
  memeCount: number;
  tournamentStatus: TournamentStatus;
  onStart: (votingTimeSeconds: number) => void;
}

export function TournamentConfig({ 
  memeCount, 
  tournamentStatus, 
  onStart 
}: TournamentConfigProps) {
  const [votingTime, setVotingTime] = useState(30);
  const [isStarting, setIsStarting] = useState(false);

  const canStart = memeCount >= 2 && tournamentStatus === 'WAITING';

  const handleStart = async () => {
    if (!canStart) return;
    
    setIsStarting(true);
    try {
      await onStart(votingTime);
    } catch (error) {
      console.error('Error starting tournament:', error);
      alert('Erro ao iniciar torneio. Tente novamente.');
    } finally {
      setIsStarting(false);
    }
  };

  const getStatusText = () => {
    switch (tournamentStatus) {
      case 'WAITING':
        return 'Aguardando início';
      case 'DUEL_IN_PROGRESS':
        return 'Torneio em andamento';
      case 'TOURNAMENT_FINISHED':
        return 'Torneio finalizado';
      default:
        return 'Status desconhecido';
    }
  };

  const getStatusColor = () => {
    switch (tournamentStatus) {
      case 'WAITING':
        return 'text-yellow-400';
      case 'DUEL_IN_PROGRESS':
        return 'text-green-400';
      case 'TOURNAMENT_FINISHED':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      {/* Tournament Status */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-700">
        <h2 className="text-2xl font-bold text-white">Configuração do Torneio</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            tournamentStatus === 'WAITING' ? 'bg-yellow-400' :
            tournamentStatus === 'DUEL_IN_PROGRESS' ? 'bg-green-400 animate-pulse' :
            'bg-blue-400'
          }`} />
          <span className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Meme Count */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Memes carregados:</span>
          <span className="text-2xl font-bold text-white">{memeCount}</span>
        </div>
        {memeCount < 2 && (
          <div className="flex items-start space-x-2 mt-3 text-yellow-400 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>É necessário pelo menos 2 memes para iniciar o torneio</p>
          </div>
        )}
      </div>

      {/* Voting Time Configuration */}
      {tournamentStatus === 'WAITING' && (
        <div className="space-y-3">
          <label className="flex items-center space-x-2 text-white font-medium">
            <Clock className="w-5 h-5" />
            <span>Tempo de votação (segundos)</span>
          </label>
          
          <div className="flex items-center space-x-4">
            <input
              type="number"
              min="5"
              max="300"
              value={votingTime}
              onChange={(e) => setVotingTime(Math.max(5, parseInt(e.target.value) || 5))}
              className="flex-1 px-4 py-3 bg-gray-700 text-white text-lg rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
            />
            <span className="text-gray-400 text-sm">segundos</span>
          </div>

          {/* Quick time presets */}
          <div className="flex space-x-2">
            {[10, 30, 60, 120].map((time) => (
              <button
                key={time}
                onClick={() => setVotingTime(time)}
                className={`
                  px-3 py-1 rounded text-sm transition-colors
                  ${votingTime === time 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }
                `}
              >
                {time}s
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Start Button */}
      {tournamentStatus === 'WAITING' && (
        <motion.button
          onClick={handleStart}
          disabled={!canStart || isStarting}
          className={`
            w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center space-x-2 transition-all
            ${canStart && !isStarting
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }
          `}
          whileHover={canStart && !isStarting ? { scale: 1.02 } : {}}
          whileTap={canStart && !isStarting ? { scale: 0.98 } : {}}
        >
          {isStarting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Iniciando...</span>
            </>
          ) : (
            <>
              <Play className="w-6 h-6" />
              <span>Iniciar Torneio</span>
            </>
          )}
        </motion.button>
      )}

      {/* Tournament Info */}
      {tournamentStatus !== 'WAITING' && (
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-300 text-center">
            {tournamentStatus === 'DUEL_IN_PROGRESS' 
              ? 'O torneio está em andamento. Acompanhe os duelos abaixo.'
              : 'O torneio foi finalizado. Confira o campeão!'
            }
          </p>
        </div>
      )}
    </div>
  );
}
