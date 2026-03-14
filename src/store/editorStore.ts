import { create } from 'zustand';
import type { Transforms, Adjustments, CropRegion } from '../types/editor';
import { defaultTransforms, defaultAdjustments, defaultCrop } from '../types/editor';
import { clampCrop, flipCropH, flipCropV, rotateCropCW, rotateCropCCW } from '../utils/crop';

interface EditorStore {
  // Image state
  sourceImage: ImageBitmap | null;
  originalFile: File | null;
  wasDownscaled: boolean;

  // Transform state
  transforms: Transforms;

  // Adjustment state
  adjustments: Adjustments;

  // Crop state
  cropRegion: CropRegion | null;
  cropMode: boolean;
  cropAspectRatio: number | null;

  // Actions
  setImage: (bitmap: ImageBitmap, file: File, wasDownscaled: boolean) => void;
  rotateLeft: () => void;
  rotateRight: () => void;
  flipHorizontal: () => void;
  flipVertical: () => void;
  setAdjustment: (key: keyof Omit<Adjustments, 'greyscale'>, value: number) => void;
  toggleGreyscale: () => void;
  resetAll: () => void;

  // Crop actions
  enterCropMode: () => void;
  exitCropMode: () => void;
  setCrop: (region: CropRegion) => void;
  applyCrop: () => void;
  clearCrop: () => void;
  setCropAspectRatio: (ratio: number | null) => void;
  applyResize: (width: number, height: number) => Promise<void>;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  sourceImage: null,
  originalFile: null,
  wasDownscaled: false,
  transforms: { ...defaultTransforms },
  adjustments: { ...defaultAdjustments },
  cropRegion: null,
  cropMode: false,
  cropAspectRatio: null,

  setImage: (bitmap, file, wasDownscaled) => {
    const old = get().sourceImage;
    if (old) old.close();
    set({
      sourceImage: bitmap,
      originalFile: file,
      wasDownscaled,
      transforms: { ...defaultTransforms },
      adjustments: { ...defaultAdjustments },
      cropRegion: null,
      cropMode: false,
      cropAspectRatio: null,
    });
  },

  rotateLeft: () =>
    set((s) => ({
      transforms: {
        ...s.transforms,
        rotation: ((s.transforms.rotation - 90 + 360) % 360) as Transforms['rotation'],
      },
      cropRegion: s.cropRegion ? clampCrop(rotateCropCCW(s.cropRegion)) : null,
    })),

  rotateRight: () =>
    set((s) => ({
      transforms: {
        ...s.transforms,
        rotation: ((s.transforms.rotation + 90) % 360) as Transforms['rotation'],
      },
      cropRegion: s.cropRegion ? clampCrop(rotateCropCW(s.cropRegion)) : null,
    })),

  flipHorizontal: () =>
    set((s) => ({
      transforms: { ...s.transforms, flipH: !s.transforms.flipH },
      cropRegion: s.cropRegion ? flipCropH(s.cropRegion) : null,
    })),

  flipVertical: () =>
    set((s) => ({
      transforms: { ...s.transforms, flipV: !s.transforms.flipV },
      cropRegion: s.cropRegion ? flipCropV(s.cropRegion) : null,
    })),

  setAdjustment: (key, value) =>
    set((s) => ({
      adjustments: { ...s.adjustments, [key]: value },
    })),

  toggleGreyscale: () =>
    set((s) => ({
      adjustments: { ...s.adjustments, greyscale: !s.adjustments.greyscale },
    })),

  resetAll: () => set({
    transforms: { ...defaultTransforms },
    adjustments: { ...defaultAdjustments },
    cropRegion: null,
    cropMode: false,
    cropAspectRatio: null,
  }),

  enterCropMode: () =>
    set((s) => ({
      cropMode: true,
      cropRegion: s.cropRegion ?? { ...defaultCrop },
    })),

  exitCropMode: () => set({ cropMode: false }),

  setCrop: (region) => set({ cropRegion: clampCrop(region) }),

  applyCrop: () => set({ cropMode: false }),

  clearCrop: () => set({ cropRegion: null, cropMode: false, cropAspectRatio: null }),

  setCropAspectRatio: (ratio) => set({ cropAspectRatio: ratio }),

  applyResize: async (width, height) => {
    const state = get();
    if (!state.sourceImage) return;

    // Render current state (with crop + transforms) to an offscreen canvas
    const { renderToCanvas } = await import('../utils/canvas');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderToCanvas(ctx, state.sourceImage, state.transforms, state.adjustments, state.cropRegion ?? undefined);

    // Create resized bitmap from the rendered result
    const resized = await createImageBitmap(canvas, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: 'high',
    });

    const old = state.sourceImage;
    set({
      sourceImage: resized,
      transforms: { ...defaultTransforms },
      adjustments: { ...defaultAdjustments },
      cropRegion: null,
      cropMode: false,
    });
    old.close();
  },
}));
