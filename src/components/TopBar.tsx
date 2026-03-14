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

  const btnClass = "flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-sm text-[#6B6B6B] hover:text-[#2A9D8F] rounded-md transition-colors";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-[#2A9D8F] shrink-0" style={{ height: '64px' }}>
      <div className="flex items-center justify-between h-full px-4 md:px-[60px]">
        {/* Navigation links */}
        <nav className="flex items-center gap-4 md:gap-9">
          <a
            href="https://bradlannon.ca/index.html#portfolio"
            className="no-underline text-[#6B6B6B] hover:text-[#2A9D8F] transition-colors"
            style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' as const }}
          >
            Portfolio
          </a>
          <a
            href="https://bradlannon.ca/apps.html"
            className="no-underline text-[#2A9D8F] transition-colors"
            style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' as const }}
          >
            Apps
          </a>
          <a
            href="https://bradlannon.ca/av.html"
            className="no-underline text-[#6B6B6B] hover:text-[#2A9D8F] transition-colors"
            style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' as const }}
          >
            A/V
          </a>
        </nav>

        {/* Right side actions */}
        {showEditorActions && (
          <div className="flex items-center gap-1">
            {wasDownscaled && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-blue-700 bg-blue-50 rounded-full mr-1">
                <Info className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Image was resized for best performance</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleNewImage}
              className={btnClass}
              title="New Image"
            >
              <ImagePlus className="w-4 h-4" />
              <span className="hidden md:inline">New Image</span>
            </button>
            <button
              type="button"
              onClick={resetAll}
              className={btnClass}
              title="Reset All"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden md:inline">Reset All</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
