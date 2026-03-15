import { create } from 'zustand';
import type { Transforms, Adjustments, CropRegion, TextEntry, TextStyle } from '../types/editor';
import { defaultTransforms, defaultAdjustments, defaultCrop } from '../types/editor';
import { clampCrop, flipCropH, flipCropV, rotateCropCW, rotateCropCCW } from '../utils/crop';
import { PRESETS } from '../utils/presets';
import { DEFAULT_TEXT_ENTRY } from '../utils/text';

interface EditorStore {
  // Image state
  sourceImage: ImageBitmap | null;
  originalFile: File | null;
  wasDownscaled: boolean;

  // Transform state
  transforms: Transforms;

  // Adjustment state
  adjustments: Adjustments;
  activePreset: string | null;

  // Crop state
  cropRegion: CropRegion | null;
  previousCropRegion: CropRegion | null;
  cropMode: boolean;
  cropAspectRatio: number | null;

  // Zoom/pan state
  zoomLevel: number;
  panOffset: { x: number; y: number };

  // Text overlay state
  textMode: boolean;
  draftText: TextEntry | null;
  bakedTexts: TextEntry[];

  // Background removal state
  backgroundRemoved: boolean;
  backgroundMask: ImageData | null;
  replacementColor: string | null;

  // Actions
  setZoom: (level: number) => void;
  setPan: (offset: { x: number; y: number }) => void;
  resetView: () => void;
  setImage: (bitmap: ImageBitmap, file: File, wasDownscaled: boolean) => void;
  rotateLeft: () => void;
  rotateRight: () => void;
  flipHorizontal: () => void;
  flipVertical: () => void;
  setFreeRotation: (degrees: number) => void;
  setAdjustment: (key: keyof Omit<Adjustments, 'greyscale'>, value: number) => void;
  toggleGreyscale: () => void;
  setPreset: (presetId: string | null) => void;
  resetAll: () => void;

  // Background removal actions
  setBackgroundMask: (mask: ImageData) => void;
  clearBackgroundMask: () => void;
  setReplacementColor: (color: string | null) => void;

  // Text actions
  enterTextMode: () => void;
  exitTextMode: () => void;
  setDraftText: (updates: Partial<TextEntry>) => void;
  setDraftStyle: (updates: Partial<TextStyle>) => void;
  applyText: () => void;
  discardText: () => void;

  // Crop actions
  enterCropMode: () => void;
  exitCropMode: () => void;
  setCrop: (region: CropRegion) => void;
  applyCrop: () => void;
  clearCrop: () => void;
  undoCrop: () => void;
  setCropAspectRatio: (ratio: number | null) => void;
  applyResize: (width: number, height: number) => Promise<void>;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  sourceImage: null,
  originalFile: null,
  wasDownscaled: false,
  transforms: { ...defaultTransforms },
  adjustments: { ...defaultAdjustments },
  activePreset: null,
  cropRegion: null,
  previousCropRegion: null,
  cropMode: false,
  cropAspectRatio: null,
  zoomLevel: 1,
  panOffset: { x: 0, y: 0 },
  textMode: false,
  draftText: null,
  bakedTexts: [],
  backgroundRemoved: false,
  backgroundMask: null,
  replacementColor: null,

  setZoom: (level) => set({ zoomLevel: level }),
  setPan: (offset) => set({ panOffset: offset }),
  resetView: () => set({ zoomLevel: 1, panOffset: { x: 0, y: 0 } }),

  setImage: (bitmap, file, wasDownscaled) => {
    const old = get().sourceImage;
    if (old) old.close();
    set({
      sourceImage: bitmap,
      originalFile: file,
      wasDownscaled,
      transforms: { ...defaultTransforms },
      adjustments: { ...defaultAdjustments },
      activePreset: null,
      cropRegion: null,
      cropMode: false,
      cropAspectRatio: null,
      textMode: false,
      draftText: null,
      bakedTexts: [],
      backgroundRemoved: false,
      backgroundMask: null,
      replacementColor: null,
      zoomLevel: 1,
      panOffset: { x: 0, y: 0 },
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

  setFreeRotation: (degrees) =>
    set((s) => ({
      transforms: { ...s.transforms, freeRotation: degrees },
    })),

  setAdjustment: (key, value) =>
    set((s) => ({
      adjustments: { ...s.adjustments, [key]: value },
      activePreset: null,
    })),

  toggleGreyscale: () =>
    set((s) => ({
      adjustments: { ...s.adjustments, greyscale: !s.adjustments.greyscale },
      activePreset: null,
    })),

  setPreset: (presetId) => {
    if (presetId === null || presetId === 'none') {
      set({ adjustments: { ...defaultAdjustments }, activePreset: null });
    } else {
      const preset = PRESETS.find((p) => p.id === presetId);
      if (preset) {
        set({ adjustments: { ...preset.adjustments }, activePreset: presetId });
      }
    }
  },

  resetAll: () => set({
    transforms: { ...defaultTransforms },
    adjustments: { ...defaultAdjustments },
    activePreset: null,
    textMode: false,
    draftText: null,
    cropRegion: null,
    previousCropRegion: null,
    cropMode: false,
    cropAspectRatio: null,
    backgroundRemoved: false,
    backgroundMask: null,
    replacementColor: null,
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 },
  }),

  enterTextMode: () => set({ textMode: true, draftText: { ...DEFAULT_TEXT_ENTRY, style: { ...DEFAULT_TEXT_ENTRY.style } } }),
  exitTextMode: () => set({ textMode: false, draftText: null }),
  setDraftText: (updates) => set((s) => {
    if (!s.draftText) return {};
    return { draftText: { ...s.draftText, ...updates } };
  }),
  setDraftStyle: (updates) => set((s) => {
    if (!s.draftText) return {};
    return { draftText: { ...s.draftText, style: { ...s.draftText.style, ...updates } } };
  }),
  applyText: () => set((s) => {
    if (!s.draftText) return {};
    return { bakedTexts: [...s.bakedTexts, s.draftText], draftText: null, textMode: false };
  }),
  discardText: () => set({ draftText: null, textMode: false }),

  setBackgroundMask: (mask) => set({ backgroundMask: mask, backgroundRemoved: true }),
  clearBackgroundMask: () => set({ backgroundMask: null, backgroundRemoved: false, replacementColor: null }),
  setReplacementColor: (color) => set({ replacementColor: color }),

  enterCropMode: () =>
    set((s) => ({
      cropMode: true,
      cropRegion: s.cropRegion ?? { ...defaultCrop },
      zoomLevel: 1,
      panOffset: { x: 0, y: 0 },
    })),

  exitCropMode: () => set({ cropMode: false, zoomLevel: 1, panOffset: { x: 0, y: 0 } }),

  setCrop: (region) => set({ cropRegion: clampCrop(region) }),

  applyCrop: () => set((s) => ({ cropMode: false, previousCropRegion: s.cropRegion, zoomLevel: 1, panOffset: { x: 0, y: 0 } })),

  clearCrop: () => set((s) => ({ cropRegion: null, previousCropRegion: s.cropRegion, cropMode: false, cropAspectRatio: null, zoomLevel: 1, panOffset: { x: 0, y: 0 } })),

  undoCrop: () => set((s) => {
    // Swap current and previous crop (enables redo by clicking undo again)
    return { cropRegion: s.previousCropRegion, previousCropRegion: s.cropRegion };
  }),

  setCropAspectRatio: (ratio) => set({ cropAspectRatio: ratio }),

  applyResize: async (width, height) => {
    const state = get();
    if (!state.sourceImage) return;

    // Render current state (with crop + transforms) to an offscreen canvas
    const { renderToCanvas } = await import('../utils/canvas');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderToCanvas(ctx, state.sourceImage, { transforms: state.transforms, adjustments: state.adjustments, crop: state.cropRegion ?? undefined, backgroundMask: state.backgroundRemoved ? state.backgroundMask : undefined, replacementColor: state.backgroundRemoved ? state.replacementColor : undefined });

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
      textMode: false,
      draftText: null,
      bakedTexts: [],
      backgroundRemoved: false,
      backgroundMask: null,
      replacementColor: null,
    });
    old.close();
  },
}));
