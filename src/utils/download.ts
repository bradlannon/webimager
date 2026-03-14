import type { Transforms, Adjustments, CropRegion } from '../types/editor';
import { renderToCanvas } from './canvas';

/**
 * Download the current image with transforms, adjustments, and crop applied.
 * Uses toBlob (not toDataURL) for memory efficiency.
 */
export function downloadImage(
  source: ImageBitmap,
  transforms: Transforms,
  adjustments: Adjustments,
  format: 'image/jpeg' | 'image/png',
  quality: number,
  filename?: string,
  crop?: CropRegion,
  backgroundMask?: ImageData | null,
  replacementColor?: string | null
): void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  renderToCanvas(ctx, source, transforms, adjustments, crop, backgroundMask, replacementColor);

  const ext = format === 'image/jpeg' ? '.jpg' : '.png';
  const qualityParam = format === 'image/jpeg' ? quality : undefined;
  const outputFilename = filename || `edited${ext}`;

  // For JPEG with transparency (background removed), composite onto white background
  // to avoid black areas where alpha was transparent (JPEG has no alpha channel)
  let outputCanvas: HTMLCanvasElement = canvas;
  if (format === 'image/jpeg' && backgroundMask) {
    const whiteCanvas = document.createElement('canvas');
    whiteCanvas.width = canvas.width;
    whiteCanvas.height = canvas.height;
    const whiteCtx = whiteCanvas.getContext('2d');
    if (whiteCtx) {
      whiteCtx.fillStyle = '#ffffff';
      whiteCtx.fillRect(0, 0, whiteCanvas.width, whiteCanvas.height);
      whiteCtx.drawImage(canvas, 0, 0);
      outputCanvas = whiteCanvas;
    }
  }

  outputCanvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = outputFilename;
      link.click();
      URL.revokeObjectURL(url);
    },
    format,
    qualityParam
  );
}
