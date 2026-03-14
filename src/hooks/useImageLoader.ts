import { useState, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import { limitSize } from '../utils/canvas';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function loadImage(
  file: File
): Promise<{ bitmap: ImageBitmap; wasDownscaled: boolean }> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error(
      `Unsupported file type "${file.type}". Please use JPEG, PNG, or WebP.`
    );
  }

  // createImageBitmap auto-corrects EXIF orientation (default imageOrientation: "from-image")
  const original = await createImageBitmap(file);
  const { width, height, wasDownscaled } = limitSize(
    original.width,
    original.height
  );

  if (wasDownscaled) {
    original.close();
    const downscaled = await createImageBitmap(file, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: 'high',
    });
    return { bitmap: downscaled, wasDownscaled: true };
  }

  return { bitmap: original, wasDownscaled: false };
}

export function useImageLoader() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setImage = useEditorStore((s) => s.setImage);

  const handleFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      try {
        const { bitmap, wasDownscaled } = await loadImage(file);
        setImage(bitmap, file, wasDownscaled);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load image'
        );
      } finally {
        setLoading(false);
      }
    },
    [setImage]
  );

  return { handleFile, loading, error };
}
