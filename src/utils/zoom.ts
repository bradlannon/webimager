/**
 * Pure zoom math utilities for cursor-centered zoom and clamping.
 */

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3.0;

/**
 * Compute new pan offset that keeps the point under the cursor fixed
 * after a zoom change. Uses transformOrigin: 0 0 convention.
 *
 * The content point under the cursor is: (mouseX - oldPan.x) / oldZoom
 * After zoom, we want that same content point at the same screen position:
 *   mouseX = contentPoint * newZoom + newPan.x
 *   newPan.x = mouseX - contentPoint * newZoom
 */
export function zoomAtPoint(
  mouseX: number,
  mouseY: number,
  oldZoom: number,
  newZoom: number,
  oldPan: { x: number; y: number },
): { x: number; y: number } {
  const contentX = (mouseX - oldPan.x) / oldZoom;
  const contentY = (mouseY - oldPan.y) / oldZoom;

  return {
    x: mouseX - contentX * newZoom,
    y: mouseY - contentY * newZoom,
  };
}

/**
 * Clamp zoom level to allowed range [0.25, 3.0].
 */
export function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}
