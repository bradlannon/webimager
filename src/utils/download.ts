import type { Transforms, Adjustments } from '../types/editor';
import { renderToCanvas } from './canvas';

/**
 * Download the current image with transforms and adjustments applied.
 * Uses toBlob (not toDataURL) for memory efficiency.
 */
export function downloadImage(
  source: ImageBitmap,
  transforms: Transforms,
  adjustments: Adjustments,
  format: 'image/jpeg' | 'image/png',
  quality: number,
  filename?: string
): void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  renderToCanvas(ctx, source, transforms, adjustments);

  const ext = format === 'image/jpeg' ? '.jpg' : '.png';
  const qualityParam = format === 'image/jpeg' ? quality : undefined;
  const outputFilename = filename || `edited${ext}`;

  canvas.toBlob(
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
