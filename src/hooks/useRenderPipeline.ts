import { useEffect, type RefObject } from 'react';
import { useEditorStore } from '../store/editorStore';
import { renderToCanvas, drawCheckerboard } from '../utils/canvas';

export function useRenderPipeline(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const sourceImage = useEditorStore((s) => s.sourceImage);
  const transforms = useEditorStore((s) => s.transforms);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Render the image with transforms applied
    renderToCanvas(ctx, sourceImage, transforms);

    // Draw checkerboard behind image on a separate pass
    // (The checkerboard is drawn underneath via CSS or a background canvas)
  }, [canvasRef, sourceImage, transforms]);
}
