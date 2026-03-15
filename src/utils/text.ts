import type { TextStyle, TextEntry } from '../types/editor';

export const TEXT_FONTS = [
  { id: 'sans', label: 'Sans Serif', family: 'Arial' },
  { id: 'serif', label: 'Serif', family: 'Georgia' },
  { id: 'mono', label: 'Monospace', family: 'Courier New' },
  { id: 'display', label: 'Display', family: 'Impact' },
  { id: 'cursive', label: 'Cursive', family: 'Brush Script MT, cursive' },
  { id: 'rounded', label: 'Rounded', family: 'Verdana' },
  { id: 'narrow', label: 'Narrow', family: 'Arial Narrow' },
] as const;

export const TEXT_COLORS = [
  '#000000',
  '#FFFFFF',
  '#EF4444',
  '#3B82F6',
  '#22C55E',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#6B7280',
] as const;

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: TEXT_FONTS[0].family,
  fontSize: 48,
  color: '#000000',
  bold: false,
  italic: false,
};

export const DEFAULT_TEXT_ENTRY: TextEntry = {
  content: 'Your text here',
  x: 50,
  y: 50,
  style: DEFAULT_TEXT_STYLE,
};

/**
 * Convert a pixel drag delta to a percentage delta.
 * Formula: (deltaPx / containerSizePx) * 100
 */
export function dragDeltaToPercent(deltaPx: number, containerSizePx: number): number {
  return (deltaPx / containerSizePx) * 100;
}

/**
 * Clamp a percentage position to the given range.
 * Defaults: min=0, max=100.
 */
export function clampPosition(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Check if the center of an element is within threshold of the canvas center (50%).
 * Returns snapped=true and the adjusted position if within threshold.
 */
export function detectCenterSnap(
  position: number,
  elementSizePercent: number,
  threshold = 1.5
): { snapped: boolean; snapValue: number } {
  const center = position + elementSizePercent / 2;
  if (Math.abs(center - 50) <= threshold) {
    return { snapped: true, snapValue: 50 - elementSizePercent / 2 };
  }
  return { snapped: false, snapValue: position };
}
