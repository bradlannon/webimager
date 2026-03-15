import { useEffect, type RefObject } from 'react';
import { useEditorStore } from '../store/editorStore';
import { renderToCanvas } from '../utils/canvas';

export function useRenderPipeline(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const sourceImage = useEditorStore((s) => s.sourceImage);
  const transforms = useEditorStore((s) => s.transforms);
  const adjustments = useEditorStore((s) => s.adjustments);
  const cropRegion = useEditorStore((s) => s.cropRegion);
  const cropMode = useEditorStore((s) => s.cropMode);
  const backgroundRemoved = useEditorStore((s) => s.backgroundRemoved);
  const backgroundMask = useEditorStore((s) => s.backgroundMask);
  const replacementColor = useEditorStore((s) => s.replacementColor);
  const bakedTexts = useEditorStore((s) => s.bakedTexts);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // During crop mode, render WITHOUT crop so the full image is visible
    // behind the overlay. When NOT in crop mode but cropRegion exists,
    // render WITH crop applied.
    const activeCrop = cropMode ? undefined : cropRegion ?? undefined;

    // Pass background mask only when background removal is active
    const activeMask = backgroundRemoved ? backgroundMask : undefined;

    // Pass replacement color only when background removal is active
    const activeReplacementColor = backgroundRemoved ? replacementColor : undefined;

    // Render the image with transforms, adjustments, optional crop, optional mask, and replacement color
    renderToCanvas(ctx, sourceImage, { transforms, adjustments, crop: activeCrop, backgroundMask: activeMask, replacementColor: activeReplacementColor, bakedTexts });

    // Draw checkerboard behind image on a separate pass
    // (The checkerboard is drawn underneath via CSS or a background canvas)
  }, [canvasRef, sourceImage, transforms, adjustments, cropRegion, cropMode, backgroundRemoved, backgroundMask, replacementColor, bakedTexts]);
}
