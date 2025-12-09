'use client';

import { useState, useCallback, DragEvent, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';

interface UploadStatus {
  file: File;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  memeId?: string;
}

interface UploadZoneProps {
  onUploadComplete?: () => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadStatus[]>([]);

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

  const processFiles = async (files: File[]) => {
    // Add files to upload list with 'uploading' status
    const newUploads: UploadStatus[] = files.map(file => ({
      file,
      status: 'uploading' as const,
    }));
    
    setUploads(prev => [...prev, ...newUploads]);

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await uploadFile(file);
      
      setUploads(prev => {
        const updated = [...prev];
        const index = updated.findIndex(u => u.file === file && u.status === 'uploading');
        if (index !== -1) {
          updated[index] = {
            file,
            status: result.success ? 'success' : 'error',
            error: result.error,
            memeId: result.memeId,
          };
        }
        return updated;
      });
    }

    // Notify parent component
    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, [onUploadComplete]);

  const handleFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      processFiles(files);
    }
  }, [onUploadComplete]);

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200
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
        
        <div className="flex flex-col items-center space-y-4">
          <Upload className="w-16 h-16 text-gray-400" />
          
          <div>
            <p className="text-xl text-white font-semibold mb-2">
              Arraste imagens aqui
            </p>
            <p className="text-gray-400 mb-4">
              ou clique para selecionar arquivos
            </p>
            <label
              htmlFor="file-input"
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-medium cursor-pointer hover:bg-purple-700 transition-colors"
            >
              Selecionar Arquivos
            </label>
          </div>
          
          <p className="text-sm text-gray-500">
            PNG, JPG, JPEG ou WEBP (máx. 5MB)
          </p>
        </div>
      </motion.div>

      {/* Upload status list */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`
                flex items-center justify-between p-4 rounded-lg
                ${upload.status === 'success' ? 'bg-green-900/20 border border-green-700' : ''}
                ${upload.status === 'error' ? 'bg-red-900/20 border border-red-700' : ''}
                ${upload.status === 'uploading' ? 'bg-gray-800 border border-gray-700' : ''}
              `}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {upload.status === 'uploading' && (
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                )}
                {upload.status === 'success' && (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
                {upload.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-white truncate">{upload.file.name}</p>
                  {upload.error && (
                    <p className="text-sm text-red-400">{upload.error}</p>
                  )}
                  {upload.status === 'uploading' && (
                    <p className="text-sm text-gray-400">Enviando...</p>
                  )}
                </div>
              </div>
              
              {upload.status !== 'uploading' && (
                <button
                  onClick={() => removeUpload(index)}
                  className="ml-2 p-1 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
