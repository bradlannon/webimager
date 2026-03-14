import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Crop } from 'lucide-react';
import { TransformControls } from './TransformControls';
import { AdjustmentControls } from './AdjustmentControls';
import { BackgroundControls } from './BackgroundControls';
import { ResizeControls } from './ResizeControls';
import { DownloadPanel } from './DownloadPanel';
import { PrivacyBadge } from './PrivacyBadge';
import { useEditorStore } from '../store/editorStore';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-700">
      <button
        type="button"
        className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        {title}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

export function Sidebar() {
  const cropMode = useEditorStore((s) => s.cropMode);
  const enterCropMode = useEditorStore((s) => s.enterCropMode);

  return (
    <aside className="order-last md:order-first w-full md:w-64 md:h-full bg-white dark:bg-neutral-800 border-t md:border-t-0 md:border-r border-neutral-200 dark:border-neutral-700 overflow-y-auto shrink-0 flex flex-col">
      <div className="flex-1">
        <CollapsibleSection title="Crop">
          <button
            type="button"
            onClick={enterCropMode}
            disabled={cropMode}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Crop className="w-4 h-4" />
            {cropMode ? 'Crop mode active' : 'Start Crop'}
          </button>
        </CollapsibleSection>
        <CollapsibleSection title="Transform">
          <TransformControls />
        </CollapsibleSection>
        <CollapsibleSection title="Adjustments">
          <AdjustmentControls />
        </CollapsibleSection>
        <CollapsibleSection title="Background">
          <BackgroundControls />
        </CollapsibleSection>
        <CollapsibleSection title="Resize">
          <ResizeControls />
        </CollapsibleSection>
        <CollapsibleSection title="Download">
          <DownloadPanel />
        </CollapsibleSection>
      </div>
      <PrivacyBadge />
    </aside>
  );
}
