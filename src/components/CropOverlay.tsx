import { useRef, useCallback, useEffect, useState } from 'react';
import type { CropRegion } from '../types/editor';
import { clampCrop, constrainToAspectRatio } from '../utils/crop';

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface CropOverlayProps {
  canvasRect: { width: number; height: number };
  sourceWidth: number;
  sourceHeight: number;
  aspectRatio: number | null;
  crop: CropRegion;
  onCropChange: (crop: CropRegion) => void;
  onApply: () => void;
  onCancel: () => void;
}

const HANDLES: { pos: HandlePosition; cursor: string }[] = [
  { pos: 'nw', cursor: 'nwse-resize' },
  { pos: 'n', cursor: 'ns-resize' },
  { pos: 'ne', cursor: 'nesw-resize' },
  { pos: 'e', cursor: 'ew-resize' },
  { pos: 'se', cursor: 'nwse-resize' },
  { pos: 's', cursor: 'ns-resize' },
  { pos: 'sw', cursor: 'nesw-resize' },
  { pos: 'w', cursor: 'ew-resize' },
];

function getHandleStyle(pos: HandlePosition, crop: CropRegion): React.CSSProperties {
  const cx = crop.x + crop.width / 2;
  const cy = crop.y + crop.height / 2;

  const posMap: Record<HandlePosition, { left: string; top: string }> = {
    nw: { left: `${crop.x}%`, top: `${crop.y}%` },
    n: { left: `${cx}%`, top: `${crop.y}%` },
    ne: { left: `${crop.x + crop.width}%`, top: `${crop.y}%` },
    e: { left: `${crop.x + crop.width}%`, top: `${cy}%` },
    se: { left: `${crop.x + crop.width}%`, top: `${crop.y + crop.height}%` },
    s: { left: `${cx}%`, top: `${crop.y + crop.height}%` },
    sw: { left: `${crop.x}%`, top: `${crop.y + crop.height}%` },
    w: { left: `${crop.x}%`, top: `${cy}%` },
  };

  const { left, top } = posMap[pos];
  return {
    position: 'absolute',
    left,
    top,
    transform: 'translate(-50%, -50%)',
  };
}

export function CropOverlay({
  canvasRect,
  sourceWidth,
  sourceHeight,
  aspectRatio,
  crop,
  onCropChange,
  onApply,
  onCancel,
}: CropOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    type: HandlePosition | 'move';
    startX: number;
    startY: number;
    startCrop: CropRegion;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Convert a display-space pixel delta to crop-percentage delta
  const displayDeltaToPercent = useCallback(
    (deltaX: number, deltaY: number) => ({
      dx: (deltaX / canvasRect.width) * 100,
      dy: (deltaY / canvasRect.height) * 100,
    }),
    [canvasRect.width, canvasRect.height]
  );

  const applyHandleDelta = useCallback(
    (handle: HandlePosition, startCrop: CropRegion, dx: number, dy: number): CropRegion => {
      let { x, y, width, height } = startCrop;

      switch (handle) {
        case 'nw':
          x += dx;
          y += dy;
          width -= dx;
          height -= dy;
          break;
        case 'n':
          y += dy;
          height -= dy;
          break;
        case 'ne':
          y += dy;
          width += dx;
          height -= dy;
          break;
        case 'e':
          width += dx;
          break;
        case 'se':
          width += dx;
          height += dy;
          break;
        case 's':
          height += dy;
          break;
        case 'sw':
          x += dx;
          width -= dx;
          height += dy;
          break;
        case 'w':
          x += dx;
          width -= dx;
          break;
      }

      // Ensure width/height don't go below minimum
      if (width < 1) {
        if (handle.includes('w')) x = startCrop.x + startCrop.width - 1;
        width = 1;
      }
      if (height < 1) {
        if (handle.includes('n')) y = startCrop.y + startCrop.height - 1;
        height = 1;
      }

      // Apply aspect ratio constraint if set
      if (aspectRatio !== null) {
        const constrained = constrainToAspectRatio(width, height, aspectRatio, sourceWidth, sourceHeight);
        width = constrained.width;
        height = constrained.height;
      }

      return clampCrop({ x, y, width, height });
    },
    [aspectRatio, sourceWidth, sourceHeight]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, type: HandlePosition | 'move') => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        type,
        startX: e.clientX,
        startY: e.clientY,
        startCrop: { ...crop },
      };
      setIsDragging(true);
    },
    [crop]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();

      const { type, startX, startY, startCrop } = dragRef.current;
      const { dx, dy } = displayDeltaToPercent(e.clientX - startX, e.clientY - startY);

      let newCrop: CropRegion;

      if (type === 'move') {
        // Move: shift x, y without changing width/height
        newCrop = clampCrop({
          x: startCrop.x + dx,
          y: startCrop.y + dy,
          width: startCrop.width,
          height: startCrop.height,
        });
      } else {
        newCrop = applyHandleDelta(type, startCrop, dx, dy);
      }

      onCropChange(newCrop);
    },
    [displayDeltaToPercent, applyHandleDelta, onCropChange]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      dragRef.current = null;
      setIsDragging(false);
    },
    []
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onApply();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onApply, onCancel]);

  // Clip-path polygon: outer rectangle with a hole for the crop area
  const clipPath = `polygon(
    0% 0%, 100% 0%, 100% 100%, 0% 100%,
    0% ${crop.y}%,
    ${crop.x}% ${crop.y}%,
    ${crop.x}% ${crop.y + crop.height}%,
    ${crop.x + crop.width}% ${crop.y + crop.height}%,
    ${crop.x + crop.width}% ${crop.y}%,
    0% ${crop.y}%
  )`;

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0"
      style={{
        width: canvasRect.width,
        height: canvasRect.height,
        touchAction: 'none',
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Dim overlay outside crop */}
      <div
        className="absolute inset-0 bg-black/50 pointer-events-none"
        style={{ clipPath }}
      />

      {/* Crop rectangle border */}
      <div
        className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
        style={{
          left: `${crop.x}%`,
          top: `${crop.y}%`,
          width: `${crop.width}%`,
          height: `${crop.height}%`,
          cursor: isDragging ? 'grabbing' : 'move',
        }}
        onPointerDown={(e) => handlePointerDown(e, 'move')}
      />

      {/* Drag handles */}
      {HANDLES.map(({ pos, cursor }) => (
        <div
          key={pos}
          className="min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
          style={{
            ...getHandleStyle(pos, crop),
            cursor,
            zIndex: 10,
          }}
          onPointerDown={(e) => handlePointerDown(e, pos)}
        >
          <div className="w-3 h-3 bg-white border border-neutral-400 rounded-sm shadow-sm hover:bg-blue-100 transition-colors" />
        </div>
      ))}
    </div>
  );
}
