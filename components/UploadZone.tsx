'use client';

import { useState, useCallback, DragEvent, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';

interface UploadZoneProps {
  onUploadComplete?: () => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caption', file.name.replace(/\.[^/.]+$/, '')); // Use filename without extension as default caption

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      return { success: true, memeId: data.meme.id };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  };

  const processFiles = useCallback(async (files: File[]) => {
    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await uploadFile(file);
      
      // Notify parent component after each successful upload
      if (result.success && onUploadComplete) {
        onUploadComplete();
      }
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, [processFiles]);

  const handleFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      processFiles(files);
    }
  }, [processFiles]);


  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-4 md:p-6 text-center transition-all duration-200
          ${isDragging 
            ? 'border-purple-500 bg-purple-500/10' 
            : 'border-gray-600 bg-gray-800 hover:border-gray-500'
          }
        `}
        whileHover={{ scale: 1.01 }}
      >
        <input
          type="file"
          id="file-input"
          multiple
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleFileInput}
          className="hidden"
        />
        
        <div className="flex flex-col items-center space-y-2 md:space-y-3">
          <Upload className="w-10 h-10 md:w-12 md:h-12 text-gray-400" />
          
          <div>
            <p className="text-base md:text-lg text-white font-semibold mb-1">
              Arraste imagens aqui
            </p>
            <p className="text-sm text-gray-400 mb-3">
              ou clique para selecionar arquivos
            </p>
            <label
              htmlFor="file-input"
              className="flex items-center justify-center px-4 py-2.5 bg-purple-600 text-white text-sm md:text-base rounded-lg font-medium cursor-pointer hover:bg-purple-700 transition-colors min-h-[44px] min-w-[44px]"
            >
              Selecionar Arquivos
            </label>
          </div>
          
          <p className="text-xs md:text-sm text-gray-500">
            PNG, JPG, JPEG ou WEBP (máx. 5MB)
          </p>
        </div>
      </motion.div>
    </div>
  );
}
