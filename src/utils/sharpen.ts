/**
 * Apply unsharp-mask sharpening via 3x3 convolution kernel.
 *
 * @param ctx  Canvas 2D context whose current content will be sharpened in-place
 * @param intensity  0-100 where 0 = identity (no change), 100 = full sharpen
 */
export function applySharpen(
  ctx: CanvasRenderingContext2D,
  intensity: number
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  if (w < 3 || h < 3) return; // Too small for 3x3 kernel

  const src = ctx.getImageData(0, 0, w, h);
  const srcData = src.data;
  const dst = new Uint8ClampedArray(srcData.length);

  // Interpolate between identity [0,0,0, 0,1,0, 0,0,0]
  // and sharpen [0,-1,0, -1,5,-1, 0,-1,0] based on intensity/100
  const t = intensity / 100;
  // kernel[4] = center = 1 + 4*t, kernel[1,3,5,7] = -t, corners = 0
  const kCenter = 1 + 4 * t;
  const kEdge = -t;

  // Copy edge pixels from source (1px border)
  dst.set(srcData);

  // Process interior pixels only (skip 1px border)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;

      // Indices for 4-connected neighbors
      const top = ((y - 1) * w + x) * 4;
      const bot = ((y + 1) * w + x) * 4;
      const lft = (y * w + (x - 1)) * 4;
      const rgt = (y * w + (x + 1)) * 4;

      // Process R, G, B channels
      for (let c = 0; c < 3; c++) {
        const val =
          kCenter * srcData[idx + c] +
          kEdge * srcData[top + c] +
          kEdge * srcData[bot + c] +
          kEdge * srcData[lft + c] +
          kEdge * srcData[rgt + c];

        // Clamp to 0-255
        dst[idx + c] = val < 0 ? 0 : val > 255 ? 255 : Math.round(val);
      }

      // Copy alpha from source
      dst[idx + 3] = srcData[idx + 3];
    }
  }

  // Use createImageData to avoid ImageData constructor issues in some environments
  const outImageData = ctx.createImageData(w, h);
  outImageData.data.set(dst);
  ctx.putImageData(outImageData, 0, 0);
}
