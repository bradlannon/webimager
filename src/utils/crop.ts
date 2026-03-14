import type { CropRegion, CropPreset } from '../types/editor';

/**
 * Convert percentage-based crop region to pixel coordinates.
 * Clamps minimum sw/sh to 20px.
 */
export function cropToPixels(
  crop: CropRegion,
  sourceW: number,
  sourceH: number
): { sx: number; sy: number; sw: number; sh: number } {
  return {
    sx: Math.round((crop.x / 100) * sourceW),
    sy: Math.round((crop.y / 100) * sourceH),
    sw: Math.max(20, Math.round((crop.width / 100) * sourceW)),
    sh: Math.max(20, Math.round((crop.height / 100) * sourceH)),
  };
}

/**
 * Clamp crop region to valid bounds.
 * Ensures x>=0, y>=0, x+width<=100, y+height<=100, width>=1%, height>=1%.
 */
export function clampCrop(crop: CropRegion): CropRegion {
  const minPercent = 1;

  let x = Math.max(0, crop.x);
  let y = Math.max(0, crop.y);
  let width = Math.max(minPercent, crop.width);
  let height = Math.max(minPercent, crop.height);

  // Clamp so x+width and y+height don't exceed 100
  if (x + width > 100) {
    width = 100 - x;
    if (width < minPercent) {
      width = minPercent;
      x = 100 - minPercent;
    }
  }
  if (y + height > 100) {
    height = 100 - y;
    if (height < minPercent) {
      height = minPercent;
      y = 100 - minPercent;
    }
  }

  return { x, y, width, height };
}

/**
 * Constrain crop dimensions to maintain an aspect ratio.
 * Tries fitting by width first; if resulting height exceeds available, fits by height instead.
 *
 * @param width - current crop width as percentage (0-100)
 * @param height - current crop height as percentage (0-100)
 * @param ratio - target width/height ratio (e.g., 16/9)
 * @param sourceW - source image width in pixels
 * @param sourceH - source image height in pixels
 * @returns constrained width and height as percentages
 */
export function constrainToAspectRatio(
  width: number,
  height: number,
  ratio: number,
  sourceW: number,
  sourceH: number
): { width: number; height: number } {
  // Convert percentages to pixels for ratio math
  const pxW = (width / 100) * sourceW;
  const pxH = (height / 100) * sourceH;

  // Try fitting by width, calculate required height
  let newPxW = pxW;
  let newPxH = newPxW / ratio;

  // If computed height exceeds available height, fit by height instead
  if (newPxH > pxH) {
    newPxH = pxH;
    newPxW = newPxH * ratio;
  }

  return {
    width: (newPxW / sourceW) * 100,
    height: (newPxH / sourceH) * 100,
  };
}

/**
 * Crop aspect ratio presets.
 */
export const CROP_PRESETS: CropPreset[] = [
  { label: 'Free', ratio: null },
  { label: '1:1 (Square)', ratio: 1 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '16:9', ratio: 16 / 9 },
  { label: '3:2', ratio: 3 / 2 },
  { label: '4:5 (Instagram Portrait)', ratio: 4 / 5 },
  { label: '1.91:1 (Facebook)', ratio: 1.91 },
  { label: '5:7', ratio: 5 / 7 },
  { label: '4:5 (8x10 Print)', ratio: 4 / 5 },
];

/**
 * Transform crop coordinates when the image is flipped horizontally.
 * Mirrors the crop's X position so it tracks the same region.
 */
export function flipCropH(crop: CropRegion): CropRegion {
  return { ...crop, x: 100 - crop.x - crop.width };
}

/**
 * Transform crop coordinates when the image is flipped vertically.
 * Mirrors the crop's Y position so it tracks the same region.
 */
export function flipCropV(crop: CropRegion): CropRegion {
  return { ...crop, y: 100 - crop.y - crop.height };
}

/**
 * Transform crop coordinates when the image is rotated 90° clockwise.
 * The crop rectangle rotates with the image so it tracks the same region.
 */
export function rotateCropCW(crop: CropRegion): CropRegion {
  return {
    x: 100 - crop.y - crop.height,
    y: crop.x,
    width: crop.height,
    height: crop.width,
  };
}

/**
 * Transform crop coordinates when the image is rotated 90° counter-clockwise.
 * The crop rectangle rotates with the image so it tracks the same region.
 */
export function rotateCropCCW(crop: CropRegion): CropRegion {
  return {
    x: crop.y,
    y: 100 - crop.x - crop.width,
    width: crop.height,
    height: crop.width,
  };
}

/**
 * Calculate resize dimensions with optional aspect lock and percentage mode.
 *
 * @param currentW - current image width in pixels
 * @param currentH - current image height in pixels
 * @param targetW - target width (pixels) or percentage if isPercentage=true
 * @param targetH - target height in pixels (ignored if isPercentage or aspectLocked with width change)
 * @param aspectLocked - whether to maintain aspect ratio
 * @param isPercentage - treat targetW as percentage of currentW
 * @returns { width, height, isUpscale }
 */
export function calcResizeDimensions(
  currentW: number,
  currentH: number,
  targetW: number,
  targetH: number,
  aspectLocked: boolean,
  isPercentage: boolean
): { width: number; height: number; isUpscale: boolean } {
  let width: number;
  let height: number;

  if (isPercentage) {
    // Percentage mode: targetW is the percentage (e.g., 50 = 50%)
    const scale = targetW / 100;
    width = Math.round(currentW * scale);
    height = Math.round(currentH * scale);
  } else if (aspectLocked) {
    // Determine which dimension changed
    const widthChanged = targetW !== currentW;
    const heightChanged = targetH !== currentH;

    if (widthChanged) {
      width = targetW;
      height = Math.round(targetW * (currentH / currentW));
    } else if (heightChanged) {
      height = targetH;
      width = Math.round(targetH * (currentW / currentH));
    } else {
      width = targetW;
      height = targetH;
    }
  } else {
    width = targetW;
    height = targetH;
  }

  // Clamp to bounds
  width = Math.max(1, Math.min(10000, width));
  height = Math.max(1, Math.min(10000, height));

  const isUpscale = width > currentW || height > currentH;

  return { width, height, isUpscale };
}
