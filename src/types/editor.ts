export interface Transforms {
  rotation: 0 | 90 | 180 | 270;
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
}

export const defaultTransforms: Transforms = {
  rotation: 0,
  flipH: false,
  flipV: false,
};
