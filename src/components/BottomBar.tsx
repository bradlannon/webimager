import { useState } from 'react';
import { Crop, RotateCw, SlidersHorizontal, Eraser, Maximize, Download } from 'lucide-react';
import { OverlayPanel } from './OverlayPanel';

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

export function BottomBar() {
  const [activeTab, setActiveTab] = useState<TabId | null>(null);

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
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          <p className="font-semibold text-neutral-800 dark:text-neutral-200 mb-2 capitalize">
            {activeTab ?? ''} Panel
          </p>
          <p>Panel content for <span className="font-medium">{activeTab}</span> will be wired in Plan 02.</p>
        </div>
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
