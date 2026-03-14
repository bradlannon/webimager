import type { Transforms } from '../types/editor';

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

export function renderToCanvas(
  ctx: CanvasRenderingContext2D,
  source: ImageBitmap,
  transforms: Transforms
): void {
  const { rotation, flipH, flipV } = transforms;
  const isRotated90 = rotation === 90 || rotation === 270;
  const drawW = isRotated90 ? source.height : source.width;
  const drawH = isRotated90 ? source.width : source.height;

  ctx.canvas.width = drawW;
  ctx.canvas.height = drawH;
  ctx.save();
  ctx.translate(drawW / 2, drawH / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  ctx.restore();
}

export function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tileSize = 8
): void {
  const light = '#e5e5e5';
  const dark = '#cccccc';
  for (let y = 0; y < height; y += tileSize) {
    for (let x = 0; x < width; x += tileSize) {
      ctx.fillStyle = (x / tileSize + y / tileSize) % 2 === 0 ? light : dark;
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  }
}
