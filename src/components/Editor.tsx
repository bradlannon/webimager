import { Info, ImagePlus, Crop } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { Canvas } from './Canvas';
import { Sidebar } from './Sidebar';
import { CropToolbar } from './CropToolbar';

export function Editor() {
  const wasDownscaled = useEditorStore((s) => s.wasDownscaled);
  const resetAll = useEditorStore((s) => s.resetAll);
  const sourceImage = useEditorStore((s) => s.sourceImage);
  const cropMode = useEditorStore((s) => s.cropMode);
  const enterCropMode = useEditorStore((s) => s.enterCropMode);

  const handleNewImage = () => {
    if (sourceImage) {
      sourceImage.close();
    }
    // Reset store and clear sourceImage to return to DropZone
    resetAll();
    useEditorStore.setState({ sourceImage: null, originalFile: null, wasDownscaled: false });
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-100 dark:bg-neutral-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 shrink-0">
        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          WebImager
        </span>
        <div className="flex items-center gap-3">
          {wasDownscaled && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 rounded-full">
              <Info className="w-3.5 h-3.5" />
              Image was resized for best performance
            </span>
          )}
          {!cropMode && (
            <button
              type="button"
              onClick={enterCropMode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
            >
              <Crop className="w-4 h-4" />
              Crop
            </button>
          )}
          <button
            type="button"
            onClick={handleNewImage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
          >
            <ImagePlus className="w-4 h-4" />
            New image
          </button>
        </div>
      </div>

      {/* Crop toolbar (shown during crop mode) */}
      {cropMode && <CropToolbar />}

      {/* Main editor area */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <Sidebar />
        <Canvas />
      </div>
    </div>
  );
}
