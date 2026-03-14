import { useRef, useEffect, useState, useCallback } from 'react';
import { useRenderPipeline } from '../hooks/useRenderPipeline';
import { useEditorStore } from '../store/editorStore';
import { CropOverlay } from './CropOverlay';

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasStyle, setCanvasStyle] = useState<React.CSSProperties>({});
  const sourceImage = useEditorStore((s) => s.sourceImage);
  const transforms = useEditorStore((s) => s.transforms);
  const cropMode = useEditorStore((s) => s.cropMode);
  const cropRegion = useEditorStore((s) => s.cropRegion);
  const cropAspectRatio = useEditorStore((s) => s.cropAspectRatio);
  const setCrop = useEditorStore((s) => s.setCrop);
  const applyCrop = useEditorStore((s) => s.applyCrop);
  const exitCropMode = useEditorStore((s) => s.exitCropMode);
  const clearCrop = useEditorStore((s) => s.clearCrop);

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

  // Canvas rect for the overlay
  const canvasRect = {
    width: (canvasStyle.width as number) || 0,
    height: (canvasStyle.height as number) || 0,
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-center overflow-hidden bg-neutral-800"
    >
      <div className="relative" style={{ width: canvasRect.width, height: canvasRect.height }}>
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
      </div>
    </div>
  );
}
