import { create } from 'zustand';
import type { Transforms } from '../types/editor';
import { defaultTransforms } from '../types/editor';

interface EditorStore {
  // Image state
  sourceImage: ImageBitmap | null;
  originalFile: File | null;
  wasDownscaled: boolean;

  // Transform state
  transforms: Transforms;

  // Actions
  setImage: (bitmap: ImageBitmap, file: File, wasDownscaled: boolean) => void;
  rotateLeft: () => void;
  rotateRight: () => void;
  flipHorizontal: () => void;
  flipVertical: () => void;
  resetAll: () => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  sourceImage: null,
  originalFile: null,
  wasDownscaled: false,
  transforms: { ...defaultTransforms },

  setImage: (bitmap, file, wasDownscaled) => {
    const old = get().sourceImage;
    if (old) old.close();
    set({
      sourceImage: bitmap,
      originalFile: file,
      wasDownscaled,
      transforms: { ...defaultTransforms },
    });
  },

  rotateLeft: () =>
    set((s) => ({
      transforms: {
        ...s.transforms,
        rotation: ((s.transforms.rotation - 90 + 360) % 360) as Transforms['rotation'],
      },
    })),

  rotateRight: () =>
    set((s) => ({
      transforms: {
        ...s.transforms,
        rotation: ((s.transforms.rotation + 90) % 360) as Transforms['rotation'],
      },
    })),

  flipHorizontal: () =>
    set((s) => ({
      transforms: { ...s.transforms, flipH: !s.transforms.flipH },
    })),

  flipVertical: () =>
    set((s) => ({
      transforms: { ...s.transforms, flipV: !s.transforms.flipV },
    })),

  resetAll: () => set({ transforms: { ...defaultTransforms } }),
}));
