import type { ReactNode } from 'react';

interface OverlayPanelProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function OverlayPanel({ open, onClose, children, className = '' }: OverlayPanelProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 top-14 bottom-[60px] z-30 bg-black/20 transition-opacity duration-250 ease-out ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`fixed left-0 right-0 bottom-[60px] z-40 flex justify-center transition-all duration-250 ease-out ${
          open
            ? 'opacity-100 pointer-events-auto translate-y-0'
            : 'opacity-0 pointer-events-none translate-y-full'
        }`}
      >
        <div
          className={`glass-panel w-full md:max-w-lg rounded-t-2xl border-t border-x border-neutral-200/60 max-h-[50vh] overflow-y-auto p-4 ${className}`}
        >
          {children}
        </div>
      </div>
    </>
  );
}
