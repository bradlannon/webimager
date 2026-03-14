import { Download } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { downloadImage } from '../utils/download';

export function DownloadPanel() {
  const { sourceImage, transforms, adjustments, originalFile, cropRegion, backgroundRemoved, backgroundMask } = useEditorStore();

  const handleDownload = (format: 'image/jpeg' | 'image/png') => {
    if (!sourceImage) return;

    const ext = format === 'image/jpeg' ? '.jpg' : '.png';
    const stem = originalFile
      ? originalFile.name.replace(/\.[^.]+$/, '')
      : 'edited';
    const filename = `${stem}${ext}`;

    const quality = format === 'image/jpeg' ? 0.85 : 1;
    downloadImage(sourceImage, transforms, adjustments, format, quality, filename, cropRegion ?? undefined, backgroundRemoved ? backgroundMask : undefined);
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={!sourceImage}
        onClick={() => handleDownload('image/jpeg')}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#2A9D8F] text-white rounded-lg hover:bg-[#238578] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
      >
        <Download className="w-4 h-4" />
        Download JPEG
      </button>
      <button
        type="button"
        disabled={!sourceImage}
        onClick={() => handleDownload('image/png')}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border-2 border-[#2A9D8F] text-[#2A9D8F] dark:text-[#8ED8CE] rounded-lg hover:bg-[#2A9D8F]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
      >
        <Download className="w-4 h-4" />
        Download PNG
      </button>
    </div>
  );
}
