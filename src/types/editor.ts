export interface Transforms {
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
}

export interface EditorState {
  sourceImage: ImageBitmap | null;
  originalFile: File | null;
  wasDownscaled: boolean;
  transforms: Transforms;
}

export const defaultTransforms: Transforms = {
  rotation: 0,
  flipH: false,
  flipV: false,
};
