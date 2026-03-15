import { useRef, useState, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { dragDeltaToPercent, clampPosition, detectCenterSnap } from '../utils/text';

interface TextOverlayProps {
  canvasRect: { width: number; height: number };
}

export function TextOverlay({ canvasRect }: TextOverlayProps) {
  const draftText = useEditorStore((s) => s.draftText);
  const sourceImage = useEditorStore((s) => s.sourceImage);
  const transforms = useEditorStore((s) => s.transforms);
  const cropRegion = useEditorStore((s) => s.cropRegion);
  const setDraftText = useEditorStore((s) => s.setDraftText);
  const applyText = useEditorStore((s) => s.applyText);
  const discardText = useEditorStore((s) => s.discardText);

  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [snapX, setSnapX] = useState(false);
  const [snapY, setSnapY] = useState(false);

  if (!draftText || !sourceImage) return null;

  // Compute post-crop source dimensions for font size scaling
  const isRotated90 = transforms.rotation === 90 || transforms.rotation === 270;
  const rotatedW = isRotated90 ? sourceImage.height : sourceImage.width;
  const rotatedH = isRotated90 ? sourceImage.width : sourceImage.height;
  const crop = cropRegion;
  const postCropW = crop ? (crop.width / 100) * rotatedW : rotatedW;

  // Scale font size: source-image-relative px to display px
  const displayFontSize = (draftText.style.fontSize / postCropW) * canvasRect.width;

  // Compute text element size in percent for snap detection
  const textEl = textRef.current;
  const textWidthPercent = textEl ? (textEl.offsetWidth / canvasRect.width) * 100 : 0;
  const textHeightPercent = textEl ? (textEl.offsetHeight / canvasRect.height) * 100 : 0;

  // Position in pixels
  const leftPx = (draftText.x / 100) * canvasRect.width;
  const topPx = (draftText.y / 100) * canvasRect.height;

  // Font composition
  const fontWeight = draftText.style.bold ? 'bold' : 'normal';
  const fontStyle = draftText.style.italic ? 'italic' : 'normal';

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: draftText.x,
      startPosY: draftText.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    e.stopPropagation();

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    const percentDX = dragDeltaToPercent(deltaX, canvasRect.width);
    const percentDY = dragDeltaToPercent(deltaY, canvasRect.height);

    let newX = clampPosition(dragRef.current.startPosX + percentDX);
    let newY = clampPosition(dragRef.current.startPosY + percentDY);

    // Snap detection
    const snapResultX = detectCenterSnap(newX, textWidthPercent);
    const snapResultY = detectCenterSnap(newY, textHeightPercent);

    if (snapResultX.snapped) newX = snapResultX.snapValue;
    if (snapResultY.snapped) newY = snapResultY.snapValue;

    setSnapX(snapResultX.snapped);
    setSnapY(snapResultY.snapped);

    setDraftText({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    dragRef.current = null;
    setSnapX(false);
    setSnapY(false);
  };

  const handleApply = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
    applyText();
  };

  const handleCancel = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
    discardText();
  };

  return (
    <div
      className="absolute inset-0"
      style={{ width: canvasRect.width, height: canvasRect.height, pointerEvents: 'none' }}
    >
      {/* Snap guide lines */}
      {snapX && (
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: '50%',
            width: 1,
            backgroundColor: 'rgba(42, 157, 143, 0.7)',
            pointerEvents: 'none',
          }}
        />
      )}
      {snapY && (
        <div
          className="absolute left-0 right-0"
          style={{
            top: '50%',
            height: 1,
            backgroundColor: 'rgba(42, 157, 143, 0.7)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Draggable text element */}
      <div
        ref={textRef}
        style={{
          position: 'absolute',
          left: leftPx,
          top: topPx,
          fontFamily: draftText.style.fontFamily,
          fontSize: displayFontSize,
          fontWeight,
          fontStyle,
          color: draftText.style.color,
          cursor: 'move',
          touchAction: 'none',
          pointerEvents: 'auto',
          border: '1px dashed rgba(255, 255, 255, 0.6)',
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
          padding: '2px 4px',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          lineHeight: 1.2,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {draftText.content || '\u00A0'}
      </div>

      {/* Apply/Cancel buttons */}
      <div
        style={{
          position: 'absolute',
          left: leftPx,
          top: Math.max(0, topPx - 36),
          pointerEvents: 'auto',
          display: 'flex',
          gap: 4,
        }}
      >
        <button
          type="button"
          onClick={handleApply}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2A9D8F] text-white hover:bg-[#248F82] transition-colors shadow-md"
          title="Apply text"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center justify-center w-7 h-7 rounded-full bg-neutral-600 text-white hover:bg-neutral-700 transition-colors shadow-md"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
