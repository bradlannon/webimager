import type { Adjustments } from '../types/editor';
import { defaultAdjustments } from '../types/editor';

export interface PresetDefinition {
  id: string;
  label: string;
  adjustments: Adjustments;
}

export const PRESETS: PresetDefinition[] = [
  {
    id: 'none',
    label: 'None',
    adjustments: { ...defaultAdjustments },
  },
  {
    id: 'sepia',
    label: 'Sepia',
    adjustments: {
      brightness: 100,
      contrast: 90,
      saturation: 60,
      greyscale: false,
      sepia: 80,
      hueRotate: 0,
      blur: 0,
      sharpen: 0,
    },
  },
  {
    id: 'vintage',
    label: 'Vintage',
    adjustments: {
      brightness: 110,
      contrast: 85,
      saturation: 70,
      greyscale: false,
      sepia: 30,
      hueRotate: -10,
      blur: 0,
      sharpen: 0,
    },
  },
  {
    id: 'warm',
    label: 'Warm',
    adjustments: {
      brightness: 105,
      contrast: 100,
      saturation: 110,
      greyscale: false,
      sepia: 20,
      hueRotate: 10,
      blur: 0,
      sharpen: 0,
    },
  },
  {
    id: 'cool',
    label: 'Cool',
    adjustments: {
      brightness: 100,
      contrast: 105,
      saturation: 90,
      greyscale: false,
      sepia: 0,
      hueRotate: -20,
      blur: 0,
      sharpen: 0,
    },
  },
  {
    id: 'bw',
    label: 'B&W',
    adjustments: {
      brightness: 105,
      contrast: 120,
      saturation: 100,
      greyscale: true,
      sepia: 0,
      hueRotate: 0,
      blur: 0,
      sharpen: 0,
    },
  },
  {
    id: 'fade',
    label: 'Fade',
    adjustments: {
      brightness: 110,
      contrast: 80,
      saturation: 80,
      greyscale: false,
      sepia: 10,
      hueRotate: 0,
      blur: 0,
      sharpen: 0,
    },
  },
  {
    id: 'vivid',
    label: 'Vivid',
    adjustments: {
      brightness: 105,
      contrast: 130,
      saturation: 150,
      greyscale: false,
      sepia: 0,
      hueRotate: 0,
      blur: 0,
      sharpen: 0,
    },
  },
  {
    id: 'dramatic',
    label: 'Dramatic',
    adjustments: {
      brightness: 90,
      contrast: 150,
      saturation: 80,
      greyscale: false,
      sepia: 0,
      hueRotate: 0,
      blur: 0,
      sharpen: 10,
    },
  },
  {
    id: 'grain',
    label: 'Film Grain',
    adjustments: {
      brightness: 105,
      contrast: 110,
      saturation: 85,
      greyscale: false,
      sepia: 15,
      hueRotate: -5,
      blur: 0,
      sharpen: 30,
    },
  },
  {
    id: 'matte',
    label: 'Matte',
    adjustments: {
      brightness: 110,
      contrast: 75,
      saturation: 85,
      greyscale: false,
      sepia: 5,
      hueRotate: 0,
      blur: 0,
      sharpen: 0,
    },
  },
];

/**
 * Generate a CSS filter string for HTML element style attribute.
 * Same logic as buildFilterString but excludes sharpen (not a CSS filter).
 */
export function presetToCssFilter(adj: Adjustments): string {
  const parts: string[] = [];
  if (adj.brightness !== 100) parts.push(`brightness(${adj.brightness}%)`);
  if (adj.contrast !== 100) parts.push(`contrast(${adj.contrast}%)`);
  if (adj.saturation !== 100) parts.push(`saturate(${adj.saturation}%)`);
  if (adj.greyscale) parts.push('grayscale(100%)');
  if (adj.sepia > 0) parts.push(`sepia(${adj.sepia}%)`);
  if (adj.hueRotate !== 0) parts.push(`hue-rotate(${adj.hueRotate}deg)`);
  if (adj.blur > 0) parts.push(`blur(${adj.blur}px)`);
  return parts.length > 0 ? parts.join(' ') : 'none';
}
