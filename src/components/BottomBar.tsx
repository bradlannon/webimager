import { useState, useEffect } from 'react';
import { Crop, RotateCw, SlidersHorizontal, Eraser, Maximize, Download, Undo2, Type } from 'lucide-react';
import { OverlayPanel } from './OverlayPanel';
import { TransformControls } from './TransformControls';
import { AdjustmentControls } from './AdjustmentControls';
import { BackgroundControls } from './BackgroundControls';
import { ResizeControls } from './ResizeControls';
import { DownloadPanel } from './DownloadPanel';
import { TextControls } from './TextControls';
import { useEditorStore } from '../store/editorStore';
import { CROP_PRESETS, constrainToAspectRatio } from '../utils/crop';
import { useBackgroundRemoval } from '../hooks/useBackgroundRemoval';

export type TabId = 'crop' | 'transform' | 'adjustments' | 'background' | 'resize' | 'text' | 'download';

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
  { id: 'text', label: 'Text', icon: Type },
  { id: 'download', label: 'Download', icon: Download },
];

function CropPanel() {
  const cropRegion = useEditorStore((s) => s.cropRegion);
  const setCrop = useEditorStore((s) => s.setCrop);
  const cropAspectRatio = useEditorStore((s) => s.cropAspectRatio);
  const setCropAspectRatio = useEditorStore((s) => s.setCropAspectRatio);
  const undoCrop = useEditorStore((s) => s.undoCrop);
  const previousCropRegion = useEditorStore((s) => s.previousCropRegion);
  const sourceImage = useEditorStore((s) => s.sourceImage);
  const transforms = useEditorStore((s) => s.transforms);

  const isRotated90 = transforms.rotation === 90 || transforms.rotation === 270;
  const sourceW = sourceImage ? (isRotated90 ? sourceImage.height : sourceImage.width) : 1;
  const sourceH = sourceImage ? (isRotated90 ? sourceImage.width : sourceImage.height) : 1;

  const handlePresetClick = (ratio: number | null) => {
    setCropAspectRatio(ratio);
    if (ratio !== null && cropRegion) {
      const constrained = constrainToAspectRatio(cropRegion.width, cropRegion.height, ratio, sourceW, sourceH);
      setCrop({ ...cropRegion, width: constrained.width, height: constrained.height });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {CROP_PRESETS.map((preset, i) => {
          const isActive = preset.ratio === null ? cropAspectRatio === null : cropAspectRatio !== null && Math.abs(preset.ratio - cropAspectRatio) < 0.001;
          return (
            <button
              key={`${preset.label}-${i}`}
              type="button"
              onClick={() => handlePresetClick(preset.ratio)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                isActive
                  ? 'bg-[#2A9D8F] text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      {previousCropRegion && (
        <button
          type="button"
          onClick={undoCrop}
          className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-[#2A9D8F] transition-colors"
        >
          <Undo2 className="w-4 h-4" />
          Undo Crop
        </button>
      )}
    </div>
  );
}

function PanelContent({ tabId, bgRemoval }: { tabId: TabId; bgRemoval: ReturnType<typeof useBackgroundRemoval> }) {
  switch (tabId) {
    case 'crop':
      return <CropPanel />;
    case 'transform':
      return <TransformControls />;
    case 'adjustments':
      return <AdjustmentControls />;
    case 'background':
      return <BackgroundControls bgRemoval={bgRemoval} />;
    case 'resize':
      return <ResizeControls />;
    case 'text':
      return <TextControls />;
    case 'download':
      return <DownloadPanel />;
  }
}

export function BottomBar() {
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const cropMode = useEditorStore((s) => s.cropMode);
  const textMode = useEditorStore((s) => s.textMode);
  const bgRemoval = useBackgroundRemoval();

  const enterCropMode = useEditorStore((s) => s.enterCropMode);
  const applyCrop = useEditorStore((s) => s.applyCrop);
  const applyText = useEditorStore((s) => s.applyText);

  const handleTabClick = (tabId: TabId) => {
    // Auto-APPLY text when switching away from text tab (bake into image)
    if (textMode && tabId !== 'text') {
      applyText();
    }
    if (tabId === 'crop') {
      if (activeTab === 'crop') {
        // Closing crop panel — auto-save and exit crop mode
        applyCrop();
        setActiveTab(null);
      } else {
        // Opening crop panel — enter crop mode
        if (cropMode) applyCrop(); // save any in-progress crop from switching
        enterCropMode();
        setActiveTab('crop');
      }
      return;
    }
    // Switching away from crop to another tab — auto-save crop
    if (cropMode) {
      applyCrop();
    }
    // Text tab toggles panel without discarding draft text
    if (tabId === 'text') {
      setActiveTab((current) => (current === 'text' ? null : 'text'));
      return;
    }
    setActiveTab((current) => (current === tabId ? null : tabId));
  };

  const handleClosePanel = () => {
    // If closing crop panel via backdrop tap, auto-save
    if (activeTab === 'crop' && cropMode) {
      applyCrop();
    }
    // When text mode is active, closing the panel just hides it (keeps draft alive)
    // User can still drag text and use Apply/Cancel on the overlay
    setActiveTab(null);
  };

  return (
    <>
      {/* Overlay panel */}
      <OverlayPanel open={activeTab !== null} onClose={handleClosePanel} disableBackdrop={activeTab === 'crop'}>
        {activeTab && <PanelContent tabId={activeTab} bgRemoval={bgRemoval} />}
      </OverlayPanel>

      {/* Tab bar — compact on mobile (icons only, 48px), full on desktop (icons + labels, 56px) */}
      <nav className="glass fixed bottom-0 left-0 right-0 z-50 h-[48px] md:h-[56px] border-t border-neutral-200/60">
        <div className="flex items-center justify-around h-full px-1 md:px-2">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id || (id === 'crop' && cropMode) || (id === 'text' && textMode);
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleTabClick(id)}
                className={`flex flex-col items-center justify-center gap-0 md:gap-0.5 flex-1 h-full transition-colors ${
                  isActive
                    ? 'text-[#2A9D8F]'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <Icon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={isActive ? 2.25 : 1.75} />
                <span className="hidden md:block text-xs font-semibold">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
