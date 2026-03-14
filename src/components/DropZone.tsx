import { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useImageLoader } from '../hooks/useImageLoader';
import { TopBar } from './TopBar';

export function DropZone() {
  const { handleFile, loading, error } = useImageLoader();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const preventDefault = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDragEnter = useCallback((e: React.DragEvent) => {
    preventDefault(e);
    setDragOver(true);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    preventDefault(e);
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    preventDefault(e);
    setDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      preventDefault(e);
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="flex flex-col h-screen bg-[#FAFAFA]">
      <TopBar showEditorActions={false} />

      <div
        className={`
          flex flex-col items-center justify-center flex-1 cursor-pointer
          transition-colors duration-200 mx-6 mb-6 mt-[80px] rounded-2xl
          ${dragOver
            ? 'border-3 border-dashed border-[#2A9D8F] bg-[#E8F6F3]'
            : 'border-3 border-dashed border-neutral-300 bg-white hover:border-[#2A9D8F]/50 hover:bg-[#FAFAFA]'
          }
        `}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onClick();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onFileChange}
        />

        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-[#2A9D8F] border-t-transparent rounded-full animate-spin" />
            <p className="text-lg text-neutral-600">Loading image...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Upload
              className={`w-16 h-16 ${dragOver ? 'text-[#2A9D8F]' : 'text-neutral-400'}`}
            />
            <p className="text-xl font-medium text-neutral-700">
              Drop your photo here or click to browse
            </p>
            <p className="text-sm text-neutral-500">
              Supports JPEG, PNG, and WebP
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 px-4 py-2 text-red-600 bg-red-50 rounded-md text-sm">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
