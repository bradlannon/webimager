import { Download, AlertTriangle } from 'lucide-react';
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

  const primaryClass = "flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#2A9D8F] text-white rounded-lg hover:bg-[#238578] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium";
  const outlineClass = "flex items-center justify-center gap-2 w-full px-4 py-2.5 border-2 border-[#2A9D8F] text-[#2A9D8F] rounded-lg hover:bg-[#2A9D8F]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium";

  const pngButton = (
    <button
      type="button"
      disabled={!sourceImage}
      onClick={() => handleDownload('image/png')}
      className={backgroundRemoved ? primaryClass : outlineClass}
    >
      <Download className="w-4 h-4" />
      Download PNG
    </button>
  );

  const jpegButton = (
    <button
      type="button"
      disabled={!sourceImage}
      onClick={() => handleDownload('image/jpeg')}
      className={backgroundRemoved ? outlineClass : primaryClass}
    >
      <Download className="w-4 h-4" />
      Download JPEG
    </button>
  );

  return (
    <div className="space-y-3">
      {backgroundRemoved ? (
        <>
          {pngButton}
          {jpegButton}
          <p className="flex items-start gap-1.5 text-amber-600 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            JPEG does not support transparency. Transparent areas will be filled with white.
          </p>
        </>
      ) : (
        <>
          {jpegButton}
          {pngButton}
        </>
      )}
    </div>
  );
}
