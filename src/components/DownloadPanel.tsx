import { useState } from 'react';
import { Download } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { downloadImage } from '../utils/download';

type Format = 'image/jpeg' | 'image/png';

export function DownloadPanel() {
  const { sourceImage, transforms, adjustments, originalFile, cropRegion } = useEditorStore();
  const [format, setFormat] = useState<Format>('image/jpeg');
  const [quality, setQuality] = useState(85);

  const handleDownload = () => {
    if (!sourceImage) return;

    const ext = format === 'image/jpeg' ? '.jpg' : '.png';
    const stem = originalFile
      ? originalFile.name.replace(/\.[^.]+$/, '')
      : 'edited';
    const filename = `${stem}${ext}`;

    downloadImage(sourceImage, transforms, adjustments, format, quality / 100, filename, cropRegion ?? undefined);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <label className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer">
          <input
            type="radio"
            name="format"
            value="image/jpeg"
            checked={format === 'image/jpeg'}
            onChange={() => setFormat('image/jpeg')}
            className="accent-blue-600"
          />
          JPEG
        </label>
        <label className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer">
          <input
            type="radio"
            name="format"
            value="image/png"
            checked={format === 'image/png'}
            onChange={() => setFormat('image/png')}
            className="accent-blue-600"
          />
          PNG
        </label>
      </div>

      {format === 'image/jpeg' && (
        <div className="space-y-1">
          <label className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400">
            <span>Quality</span>
            <span>{quality}%</span>
          </label>
          <input
            type="range"
            min={1}
            max={100}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
      )}

      <button
        type="button"
        disabled={!sourceImage}
        onClick={handleDownload}
        className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
      >
        <Download className="w-4 h-4" />
        Download
      </button>
    </div>
  );
}
