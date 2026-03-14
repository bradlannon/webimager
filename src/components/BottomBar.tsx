import { useState, useEffect } from 'react';
import { Crop, RotateCw, SlidersHorizontal, Eraser, Maximize, Download } from 'lucide-react';
import { OverlayPanel } from './OverlayPanel';
import { TransformControls } from './TransformControls';
import { AdjustmentControls } from './AdjustmentControls';
import { BackgroundControls } from './BackgroundControls';
import { ResizeControls } from './ResizeControls';
import { DownloadPanel } from './DownloadPanel';
import { useEditorStore } from '../store/editorStore';

export type TabId = 'crop' | 'transform' | 'adjustments' | 'background' | 'resize' | 'download';

interface Tab {
  id: TabId;
  label: string;
  icon: typeof Crop;
}

const tabs: Tab[] = [
  { id: 'crop', label: 'Crop', icon: Crop },
  { id: 'transform', label: 'Transform', icon: RotateCw },
  { id: 'adjustments', label: 'Adjustments', icon: SlidersHorizontal },
  { id: 'background', label: 'Background', icon: Eraser },
  { id: 'resize', label: 'Resize', icon: Maximize },
  { id: 'download', label: 'Download', icon: Download },
];

function CropPanel() {
  const cropMode = useEditorStore((s) => s.cropMode);
  const enterCropMode = useEditorStore((s) => s.enterCropMode);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={enterCropMode}
        disabled={cropMode}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Crop className="w-4 h-4" />
        {cropMode ? 'Crop mode active' : 'Start Crop'}
      </button>
    </div>
  );
}

function PanelContent({ tabId }: { tabId: TabId }) {
  switch (tabId) {
    case 'crop':
      return <CropPanel />;
    case 'transform':
      return <TransformControls />;
    case 'adjustments':
      return <AdjustmentControls />;
    case 'background':
      return <BackgroundControls />;
    case 'resize':
      return <ResizeControls />;
    case 'download':
      return <DownloadPanel />;
  }
}

export function BottomBar() {
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const cropMode = useEditorStore((s) => s.cropMode);

  // Auto-close panel when crop mode activates to give full canvas space
  useEffect(() => {
    if (cropMode) {
      setActiveTab(null);
    }
  }, [cropMode]);

  const handleTabClick = (tabId: TabId) => {
    setActiveTab((current) => (current === tabId ? null : tabId));
  };

  const handleClosePanel = () => {
    setActiveTab(null);
  };

  return (
    <>
      {/* Overlay panel */}
      <OverlayPanel open={activeTab !== null} onClose={handleClosePanel}>
        {activeTab && <PanelContent tabId={activeTab} />}
      </OverlayPanel>

      {/* Tab bar */}
      <nav className="glass fixed bottom-0 left-0 right-0 z-50 h-[60px] border-t border-neutral-200/60 dark:border-neutral-700/60">
        <div className="flex items-center justify-around h-full px-2">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleTabClick(id)}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  isActive
                    ? 'text-[#2A9D8F]'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
              >
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.25 : 1.75} />
                <span className="text-xs font-semibold">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
