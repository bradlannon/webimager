import { useRef, useEffect, useState, useCallback } from 'react';
import { useRenderPipeline } from '../hooks/useRenderPipeline';
import { useEditorStore } from '../store/editorStore';

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasStyle, setCanvasStyle] = useState<React.CSSProperties>({});
  const sourceImage = useEditorStore((s) => s.sourceImage);
  const transforms = useEditorStore((s) => s.transforms);

  useRenderPipeline(canvasRef);

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !sourceImage) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // After transforms, figure out the displayed dimensions
    const isRotated90 =
      transforms.rotation === 90 || transforms.rotation === 270;
    const displayW = isRotated90 ? sourceImage.height : sourceImage.width;
    const displayH = isRotated90 ? sourceImage.width : sourceImage.height;

    // Fit to container
    const scale = Math.min(
      containerWidth / displayW,
      containerHeight / displayH,
      1 // Don't upscale
    );

    setCanvasStyle({
      width: Math.round(displayW * scale),
      height: Math.round(displayH * scale),
    });
  }, [sourceImage, transforms.rotation]);

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

  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-center overflow-hidden bg-neutral-900 p-4"
    >
      <canvas
        ref={canvasRef}
        style={canvasStyle}
        className="checkerboard-bg max-w-full max-h-full"
      />
    </div>
  );
}
