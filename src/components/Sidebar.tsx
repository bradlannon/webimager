import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

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
  return (
    <aside className="order-last md:order-first w-full md:w-64 md:h-full bg-white dark:bg-neutral-800 border-t md:border-t-0 md:border-r border-neutral-200 dark:border-neutral-700 overflow-y-auto shrink-0">
      <CollapsibleSection title="Transform">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Transform controls will appear here
        </p>
      </CollapsibleSection>
    </aside>
  );
}
