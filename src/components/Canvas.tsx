import { useRef, useEffect, useState, useCallback } from 'react';
import { useRenderPipeline } from '../hooks/useRenderPipeline';
import { useEditorStore } from '../store/editorStore';
import { CropOverlay } from './CropOverlay';
import { TextOverlay } from './TextOverlay';
import { zoomAtPoint, clampZoom, isSmoothZoom } from '../utils/zoom';

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasStyle, setCanvasStyle] = useState<React.CSSProperties>({});
  const sourceImage = useEditorStore((s) => s.sourceImage);
  const transforms = useEditorStore((s) => s.transforms);
  const cropMode = useEditorStore((s) => s.cropMode);
  const textMode = useEditorStore((s) => s.textMode);
  const draftText = useEditorStore((s) => s.draftText);
  const cropRegion = useEditorStore((s) => s.cropRegion);
  const cropAspectRatio = useEditorStore((s) => s.cropAspectRatio);
  const setCrop = useEditorStore((s) => s.setCrop);
  const applyCrop = useEditorStore((s) => s.applyCrop);
  const exitCropMode = useEditorStore((s) => s.exitCropMode);
  const clearCrop = useEditorStore((s) => s.clearCrop);
  const zoomLevel = useEditorStore((s) => s.zoomLevel);
  const panOffset = useEditorStore((s) => s.panOffset);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setPan = useEditorStore((s) => s.setPan);
  const resetView = useEditorStore((s) => s.resetView);

  const [isPanning, setIsPanning] = useState(false);
  const panDragRef = useRef<{ startX: number; startY: number; startPan: { x: number; y: number } } | null>(null);
  const touchStartRef = useRef<{ dist: number; zoom: number; midX: number; midY: number } | null>(null);

  useRenderPipeline(canvasRef);

  // Post-rotation source dimensions
  const isRotated90 = transforms.rotation === 90 || transforms.rotation === 270;
  const sourceW = sourceImage ? (isRotated90 ? sourceImage.height : sourceImage.width) : 0;
  const sourceH = sourceImage ? (isRotated90 ? sourceImage.width : sourceImage.height) : 0;

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !sourceImage) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // After transforms, figure out the displayed dimensions
    const rot90 = transforms.rotation === 90 || transforms.rotation === 270;
    let displayW = rot90 ? sourceImage.height : sourceImage.width;
    let displayH = rot90 ? sourceImage.width : sourceImage.height;

    // When crop is applied (not in crop mode), use cropped dimensions for fit-to-view
    if (!cropMode && cropRegion && !(cropRegion.x === 0 && cropRegion.y === 0 && cropRegion.width === 100 && cropRegion.height === 100)) {
      displayW = Math.round((cropRegion.width / 100) * displayW);
      displayH = Math.round((cropRegion.height / 100) * displayH);
    }

    // Fit to container — allow upscale to fill space
    const scale = Math.min(
      containerWidth / displayW,
      containerHeight / displayH,
    );

    setCanvasStyle({
      width: Math.round(displayW * scale),
      height: Math.round(displayH * scale),
    });
  }, [sourceImage, transforms.rotation, transforms.freeRotation, cropRegion, cropMode]);

  useEffect(() => {
    updateCanvasSize();

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      updateCanvasSize();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [updateCanvasSize]);

  // Wheel event handler for zoom (native listener to allow preventDefault)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const currentZoom = useEditorStore.getState().zoomLevel;
    const currentPan = useEditorStore.getState().panOffset;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const state = useEditorStore.getState();

      // Trackpad pinch fires ctrlKey + wheel; scroll wheel fires without ctrlKey
      let zoomFactor: number;
      if (e.ctrlKey) {
        // Trackpad pinch: finer control
        zoomFactor = 1 - e.deltaY * 0.01;
      } else {
        // Scroll wheel: ~10% steps
        zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      }

      const newZoom = clampZoom(state.zoomLevel * zoomFactor);
      const newPan = zoomAtPoint(mouseX, mouseY, state.zoomLevel, newZoom, state.panOffset);

      state.setZoom(newZoom);
      state.setPan(newPan);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
    // Re-attach when zoom/pan change to capture current values in closure
    // Actually we read from store directly, so no deps needed beyond container ref
  }, []);

  // Touch pinch-to-zoom support
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getTouchDist = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        const state = useEditorStore.getState();
        const rect = container.getBoundingClientRect();
        touchStartRef.current = {
          dist,
          zoom: state.zoomLevel,
          midX: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
          midY: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStartRef.current) {
        e.preventDefault();
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        const scale = dist / touchStartRef.current.dist;
        const state = useEditorStore.getState();
        const newZoom = clampZoom(touchStartRef.current.zoom * scale);
        const newPan = zoomAtPoint(
          touchStartRef.current.midX,
          touchStartRef.current.midY,
          state.zoomLevel,
          newZoom,
          state.panOffset,
        );
        state.setZoom(newZoom);
        state.setPan(newPan);
      }
    };

    const handleTouchEnd = () => {
      touchStartRef.current = null;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Track whether crop existed before entering mode (for cancel behavior)
  const hadCropBefore = useRef(false);
  useEffect(() => {
    if (cropMode) {
      const region = cropRegion;
      hadCropBefore.current = region !== null && !(region.x === 0 && region.y === 0 && region.width === 100 && region.height === 100);
    }
  }, [cropMode]);

  const handleCancel = useCallback(() => {
    if (!hadCropBefore.current) {
      clearCrop();
    } else {
      exitCropMode();
    }
  }, [clearCrop, exitCropMode]);

  // Pointer event handlers for panning
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const state = useEditorStore.getState();
    if (state.textMode) return; // Disable pan during text editing
    if (state.zoomLevel <= 1) return; // No pan at fit-to-view

    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    panDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPan: { ...state.panOffset },
    };
    setIsPanning(true);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!panDragRef.current) return;

    const dx = e.clientX - panDragRef.current.startX;
    const dy = e.clientY - panDragRef.current.startY;

    const container = containerRef.current;
    if (!container) return;

    const state = useEditorStore.getState();
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const scaledW = (canvasStyle.width as number || 0) * state.zoomLevel;
    const scaledH = (canvasStyle.height as number || 0) * state.zoomLevel;

    // Clamp pan so at least 20% of the scaled image remains visible
    const margin = 0.2;
    const minX = containerWidth - scaledW * (1 - margin);
    const maxX = scaledW * (1 - margin) - scaledW + containerWidth;
    const minY = containerHeight - scaledH * (1 - margin);
    const maxY = scaledH * (1 - margin) - scaledH + containerHeight;

    let newX = panDragRef.current.startPan.x + dx;
    let newY = panDragRef.current.startPan.y + dy;

    // Only clamp when image is larger than container in that axis
    if (scaledW > containerWidth) {
      newX = Math.max(Math.min(minX, maxX), Math.min(Math.max(minX, maxX), newX));
    }
    if (scaledH > containerHeight) {
      newY = Math.max(Math.min(minY, maxY), Math.min(Math.max(minY, maxY), newY));
    }

    state.setPan({ x: newX, y: newY });
  }, [canvasStyle.width, canvasStyle.height]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (panDragRef.current) {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      panDragRef.current = null;
      setIsPanning(false);
    }
  }, []);

  // Double-click to reset view
  const handleDoubleClick = useCallback(() => {
    resetView();
  }, [resetView]);

  // Cursor management
  const getCursor = (): string => {
    if (zoomLevel <= 1) return 'default';
    if (isPanning) return 'grabbing';
    return 'grab';
  };

  // Canvas rect for the overlay
  const canvasRect = {
    width: (canvasStyle.width as number) || 0,
    height: (canvasStyle.height as number) || 0,
  };

  // CSS transform for zoom/pan
  // Use translate-then-scale: translate applies in screen space, then scale
  const smooth = isSmoothZoom();
  const wrapperTransform = zoomLevel !== 1 || panOffset.x !== 0 || panOffset.y !== 0
    ? {
        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
        transformOrigin: '0 0',
        ...(smooth ? { transition: 'transform 150ms ease-out' } : {}),
      }
    : {};

  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-center overflow-hidden bg-neutral-800"
      style={{ cursor: getCursor() }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className="relative"
        style={{ width: canvasRect.width, height: canvasRect.height, ...wrapperTransform }}
      >
        <canvas
          ref={canvasRef}
          style={canvasStyle}
          className="checkerboard-bg max-w-full max-h-full"
        />
        {cropMode && cropRegion && (
          <CropOverlay
            canvasRect={canvasRect}
            sourceWidth={sourceW}
            sourceHeight={sourceH}
            aspectRatio={cropAspectRatio}
            crop={cropRegion}
            onCropChange={setCrop}
            onApply={applyCrop}
            onCancel={handleCancel}
          />
        )}
        {textMode && draftText && (
          <TextOverlay canvasRect={canvasRect} />
        )}
      </div>
    </div>
  );
}
