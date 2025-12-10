'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import { Meme } from '@/types';

interface MemeListProps {
  memes: Meme[];
  onDelete?: (memeId: string) => void;
  onCaptionUpdate?: (memeId: string, newCaption: string) => void;
}

export function MemeList({ memes, onDelete, onCaptionUpdate }: MemeListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleStartEdit = (meme: Meme) => {
    setEditingId(meme.id);
    setEditCaption(meme.caption);
  };

  const handleSaveEdit = async (memeId: string) => {
    if (onCaptionUpdate && editCaption.trim()) {
      await onCaptionUpdate(memeId, editCaption.trim());
    }
    setEditingId(null);
    setEditCaption('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditCaption('');
  };

  const handleDelete = async (memeId: string) => {
    setDeletingId(memeId);
    
    try {
      const response = await fetch(`/api/memes/${memeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete meme');
      }

      if (onDelete) {
        onDelete(memeId);
      }
    } catch (error) {
      console.error('Error deleting meme:', error);
      alert('Erro ao deletar meme. Tente novamente.');
    } finally {
      setDeletingId(null);
    }
  };

  if (memes.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800 rounded-lg border-2 border-dashed border-gray-700">
        <p className="text-gray-400 text-lg">
          Nenhum meme carregado ainda
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Faça upload de imagens para começar
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4">
      {memes.map((meme, index) => (
        <motion.div
          key={meme.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
        >
          {/* Image preview */}
          <div className="relative w-full aspect-[4/3] md:aspect-[16/10] bg-gray-700">
            <Image
              src={meme.imageUrl}
              alt={meme.caption}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          </div>

          {/* Caption and actions */}
          <div className="p-2 md:p-3 space-y-2">
            {editingId === meme.id ? (
              // Edit mode
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full px-2 py-1.5 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-purple-500 focus:outline-none"
                  placeholder="Legenda do meme"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveEdit(meme.id);
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                />
                <div className="flex space-x-1.5">
                  <button
                    onClick={() => handleSaveEdit(meme.id)}
                    className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    <span>Salvar</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    <span>Cancelar</span>
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <>
                <p className="text-white text-xs md:text-sm min-h-[2rem] line-clamp-2">
                  {meme.caption}
                </p>
                <div className="flex space-x-1.5">
                  <button
                    onClick={() => handleStartEdit(meme)}
                    className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleDelete(meme.id)}
                    disabled={deletingId === meme.id}
                    className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === meme.id ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-3 h-3" />
                        <span>Deletar</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
