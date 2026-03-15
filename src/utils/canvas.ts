import type { Transforms, Adjustments, CropRegion } from '../types/editor';
import { cropToPixels } from './crop';

export const MAX_CANVAS_PIXELS = 16_777_216;

export function limitSize(
  width: number,
  height: number
): { width: number; height: number; wasDownscaled: boolean } {
  const pixels = width * height;

  if (pixels <= MAX_CANVAS_PIXELS) {
    return { width, height, wasDownscaled: false };
  }

  const scale = Math.sqrt(MAX_CANVAS_PIXELS / pixels);
  return {
    width: Math.floor(width * scale),
    height: Math.floor(height * scale),
    wasDownscaled: true,
  };
}

export function buildFilterString(adjustments: Adjustments): string {
  const parts: string[] = [];
  if (adjustments.brightness !== 100) parts.push(`brightness(${adjustments.brightness}%)`);
  if (adjustments.contrast !== 100) parts.push(`contrast(${adjustments.contrast}%)`);
  if (adjustments.saturation !== 100) parts.push(`saturate(${adjustments.saturation}%)`);
  if (adjustments.greyscale) parts.push('grayscale(100%)');
  return parts.length > 0 ? parts.join(' ') : 'none';
}


export function renderToCanvas(
  ctx: CanvasRenderingContext2D,
  source: ImageBitmap,
  transforms: Transforms,
  adjustments?: Adjustments,
  crop?: CropRegion,
  backgroundMask?: ImageData | null,
  replacementColor?: string | null
): void {
  const { rotation, freeRotation = 0, flipH, flipV } = transforms;
  const totalRotation = rotation + freeRotation;
  const isRotated90 = rotation === 90 || rotation === 270;
  // Canvas stays at the 90°-step dimensions — free rotation clips corners
  const rotatedW = isRotated90 ? source.height : source.width;
  const rotatedH = isRotated90 ? source.width : source.height;

  // Check if crop is active and not the full image
  const hasCrop = crop && !(crop.x === 0 && crop.y === 0 && crop.width === 100 && crop.height === 100);

  if (hasCrop) {
    // Crop-aware rendering: use offscreen canvas for rotation, then extract crop
    const { sx, sy, sw, sh } = cropToPixels(crop, rotatedW, rotatedH);

    // Step 1: Render source with rotation/flip onto offscreen canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = rotatedW;
    offscreen.height = rotatedH;
    const offCtx = offscreen.getContext('2d')!;

    offCtx.save();
    offCtx.translate(rotatedW / 2, rotatedH / 2);
    offCtx.rotate((totalRotation * Math.PI) / 180);
    offCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    offCtx.drawImage(source, -source.width / 2, -source.height / 2);
    offCtx.restore();

    // Step 2: Set output canvas to crop dimensions and extract crop region
    ctx.canvas.width = sw;
    ctx.canvas.height = sh;
    ctx.save();
    if (adjustments) {
      ctx.filter = buildFilterString(adjustments);
    }
    ctx.drawImage(offscreen, sx, sy, sw, sh, 0, 0, sw, sh);
    ctx.restore();

    // Step 3: Apply background mask AFTER filters (avoids premultiplied alpha fringing)
    if (backgroundMask) {
      // Transform mask identically: put at source dims, rotate/flip, extract crop
      const maskSource = document.createElement('canvas');
      maskSource.width = source.width;
      maskSource.height = source.height;
      const maskSourceCtx = maskSource.getContext('2d')!;
      maskSourceCtx.putImageData(backgroundMask, 0, 0);

      // Rotate/flip mask same as source
      const maskRotated = document.createElement('canvas');
      maskRotated.width = rotatedW;
      maskRotated.height = rotatedH;
      const maskRotCtx = maskRotated.getContext('2d')!;
      maskRotCtx.save();
      maskRotCtx.translate(rotatedW / 2, rotatedH / 2);
      maskRotCtx.rotate((totalRotation * Math.PI) / 180);
      maskRotCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      maskRotCtx.drawImage(maskSource, -source.width / 2, -source.height / 2);
      maskRotCtx.restore();

      // Extract crop region from transformed mask
      const maskCropped = document.createElement('canvas');
      maskCropped.width = sw;
      maskCropped.height = sh;
      const maskCropCtx = maskCropped.getContext('2d')!;
      maskCropCtx.drawImage(maskRotated, sx, sy, sw, sh, 0, 0, sw, sh);

      // Composite: keep only pixels where mask has alpha
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(maskCropped, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    }

    // Fill replacement color behind the masked subject
    if (replacementColor) {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = replacementColor;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }
  } else {
    // No crop: existing fast path
    ctx.canvas.width = rotatedW;
    ctx.canvas.height = rotatedH;
    ctx.save();
    ctx.translate(rotatedW / 2, rotatedH / 2);
    ctx.rotate((totalRotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    if (adjustments) {
      ctx.filter = buildFilterString(adjustments);
    }
    ctx.drawImage(source, -source.width / 2, -source.height / 2);
    ctx.restore();

    // Apply background mask AFTER filters (avoids premultiplied alpha fringing)
    if (backgroundMask) {
      // Transform mask identically: put at source dims, rotate/flip
      const maskSource = document.createElement('canvas');
      maskSource.width = source.width;
      maskSource.height = source.height;
      const maskSourceCtx = maskSource.getContext('2d')!;
      maskSourceCtx.putImageData(backgroundMask, 0, 0);

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = rotatedW;
      maskCanvas.height = rotatedH;
      const maskCtx = maskCanvas.getContext('2d')!;
      maskCtx.save();
      maskCtx.translate(rotatedW / 2, rotatedH / 2);
      maskCtx.rotate((totalRotation * Math.PI) / 180);
      maskCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      maskCtx.drawImage(maskSource, -source.width / 2, -source.height / 2);
      maskCtx.restore();

      // Composite: keep only pixels where mask has alpha
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(maskCanvas, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    }

    // Fill replacement color behind the masked subject
    if (replacementColor) {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = replacementColor;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}
