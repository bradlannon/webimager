export interface Transforms {
  rotation: 0 | 90 | 180 | 270;
  freeRotation: number; // degrees, -45 to 45 for fine-tuning straighten
  flipH: boolean;
  flipV: boolean;
}

export interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  greyscale: boolean;
}

export const defaultAdjustments: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  greyscale: false,
};

export interface EditorState {
  sourceImage: ImageBitmap | null;
  originalFile: File | null;
  wasDownscaled: boolean;
  transforms: Transforms;
  adjustments: Adjustments;
  backgroundRemoved: boolean;
  backgroundMask: ImageData | null;
  replacementColor: string | null;
}

export const defaultTransforms: Transforms = {
  rotation: 0,
  freeRotation: 0,
  flipH: false,
  flipV: false,
};

export interface CropRegion {
  x: number;      // 0-100, percentage from left
  y: number;      // 0-100, percentage from top
  width: number;  // 0-100, percentage of source width
  height: number; // 0-100, percentage of source height
}

export const defaultCrop: CropRegion = { x: 0, y: 0, width: 100, height: 100 };

export interface CropPreset {
  label: string;
  ratio: number | null; // null = free crop (no constraint)
}
