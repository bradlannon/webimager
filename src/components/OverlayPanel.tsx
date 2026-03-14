import type { ReactNode } from 'react';

interface OverlayPanelProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  disableBackdrop?: boolean;
}

export function OverlayPanel({ open, onClose, children, className = '', disableBackdrop = false }: OverlayPanelProps) {
  return (
    <>
      {/* Backdrop — disabled during crop mode so canvas interactions work */}
      {!disableBackdrop && (
        <div
          className={`fixed inset-0 z-30 bg-black/20 transition-opacity duration-250 ease-out ${
            open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          style={{ top: '64px', bottom: '48px' }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        className={`fixed left-0 right-0 z-40 flex justify-center transition-all duration-250 ease-out ${
          open
            ? 'opacity-100 pointer-events-auto translate-y-0'
            : 'opacity-0 pointer-events-none translate-y-full'
        }`}
        style={{ bottom: '48px' }}
      >
        <div
          className={`glass-panel w-full max-h-[35vh] md:max-w-lg md:max-h-[40vh] rounded-t-2xl border-t border-x border-neutral-200/60 overflow-y-auto p-3 md:p-4 ${className}`}
        >
          {children}
        </div>
      </div>
    </>
  );
}
