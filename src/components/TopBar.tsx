import { ImagePlus, RefreshCw, Info } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';

interface TopBarProps {
  showEditorActions?: boolean;
}

export function TopBar({ showEditorActions = true }: TopBarProps) {
  const wasDownscaled = useEditorStore((s) => s.wasDownscaled);
  const resetAll = useEditorStore((s) => s.resetAll);
  const sourceImage = useEditorStore((s) => s.sourceImage);

  const handleNewImage = () => {
    if (sourceImage) {
      sourceImage.close();
    }
    resetAll();
    useEditorStore.setState({ sourceImage: null, originalFile: null, wasDownscaled: false });
  };

  return (
    <header className="glass fixed top-0 left-0 right-0 z-50 h-14 border-b border-neutral-200/60 shrink-0">
      <div className="flex items-center justify-between h-full px-4">
        {/* Navigation links */}
        <nav className="flex items-center gap-1">
          <a
            href="https://bradlannon.ca/index.html#portfolio"
            className="px-3 py-1.5 text-sm font-semibold text-neutral-600 hover:text-[#2A9D8F] rounded-md transition-colors"
          >
            Portfolio
          </a>
          <a
            href="https://bradlannon.ca/apps.html"
            className="px-3 py-1.5 text-sm font-semibold text-[#2A9D8F] bg-[#2A9D8F]/10 rounded-md transition-colors"
          >
            Apps
          </a>
          <a
            href="https://bradlannon.ca/av.html"
            className="px-3 py-1.5 text-sm font-semibold text-neutral-600 hover:text-[#2A9D8F] rounded-md transition-colors"
          >
            A/V
          </a>
        </nav>

        {/* Right side: info badge + action buttons (editor only) */}
        {showEditorActions && (
          <div className="flex items-center gap-2">
            {wasDownscaled && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-blue-700 bg-blue-50 rounded-full">
                <Info className="w-3.5 h-3.5" />
                Image was resized for best performance
              </span>
            )}
            <button
              type="button"
              onClick={handleNewImage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/60 rounded-md transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
              New Image
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/60 rounded-md transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reset All
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
