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
  backgroundMask?: ImageData | null
): void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  renderToCanvas(ctx, source, transforms, adjustments, crop, backgroundMask);

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
