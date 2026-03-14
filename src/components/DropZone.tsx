import { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useImageLoader } from '../hooks/useImageLoader';

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
    <div
      className={`
        flex flex-col items-center justify-center h-screen w-full cursor-pointer
        transition-colors duration-200
        bg-neutral-50 dark:bg-neutral-900
        ${dragOver ? 'border-4 border-dashed border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-4 border-dashed border-neutral-300 dark:border-neutral-600'}
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
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Loading image...
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Upload
            className={`w-16 h-16 ${dragOver ? 'text-blue-500' : 'text-neutral-400 dark:text-neutral-500'}`}
          />
          <p className="text-xl font-medium text-neutral-700 dark:text-neutral-300">
            Drop your photo here or click to browse
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-500">
            Supports JPEG, PNG, and WebP
          </p>
        </div>
      )}

      {error && (
        <p className="mt-4 px-4 py-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-md text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
