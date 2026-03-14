import { useRef, useCallback } from 'react';
import { Plus, Minus } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { clampZoom, zoomAtPoint, requestSmoothZoom } from '../utils/zoom';

export function ZoomControls({ containerRect }: { containerRect: { width: number; height: number } }) {
  const sourceImage = useEditorStore((s) => s.sourceImage);
  const zoomLevel = useEditorStore((s) => s.zoomLevel);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setPan = useEditorStore((s) => s.setPan);
  const resetView = useEditorStore((s) => s.resetView);

  // Track previous zoom/pan for toggle behavior
  const savedViewRef = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null);

  const zoomFromCenter = useCallback((factor: number) => {
    requestSmoothZoom();
    const state = useEditorStore.getState();
    const newZoom = clampZoom(state.zoomLevel * factor);
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    const newPan = zoomAtPoint(centerX, centerY, state.zoomLevel, newZoom, state.panOffset);
    setZoom(newZoom);
    setPan(newPan);
  }, [containerRect.width, containerRect.height, setZoom, setPan]);

  const handleZoomOut = useCallback(() => {
    zoomFromCenter(0.8);
  }, [zoomFromCenter]);

  const handleZoomIn = useCallback(() => {
    zoomFromCenter(1.25);
  }, [zoomFromCenter]);

  const handleToggleZoom = useCallback(() => {
    requestSmoothZoom();
    const state = useEditorStore.getState();
    if (Math.abs(state.zoomLevel - 1) > 0.01) {
      // Not at fit-to-view: save current and reset
      savedViewRef.current = { zoom: state.zoomLevel, pan: { ...state.panOffset } };
      resetView();
    } else if (savedViewRef.current) {
      // At fit-to-view with saved state: restore
      setZoom(savedViewRef.current.zoom);
      setPan(savedViewRef.current.pan);
      savedViewRef.current = null;
    }
  }, [resetView, setZoom, setPan]);

  if (!sourceImage) return null;

  return (
    <div className="absolute bottom-14 right-3 z-40 glass rounded-lg flex items-center gap-1 border border-neutral-200/60 shadow-sm px-2 py-1">
      <button
        onClick={handleZoomOut}
        className="p-1 hover:text-[#2A9D8F] transition-colors"
        aria-label="Zoom out"
      >
        <Minus className="w-4 h-4" />
      </button>
      <button
        onClick={handleToggleZoom}
        className="text-xs font-semibold w-12 text-center hover:text-[#2A9D8F] transition-colors"
        aria-label="Toggle zoom"
      >
        {Math.round(zoomLevel * 100)}%
      </button>
      <button
        onClick={handleZoomIn}
        className="p-1 hover:text-[#2A9D8F] transition-colors"
        aria-label="Zoom in"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
