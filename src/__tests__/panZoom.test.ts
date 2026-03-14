import { describe, it, expect, beforeEach } from 'vitest';
import { zoomAtPoint, clampZoom } from '../utils/zoom';
import { useEditorStore } from '../store/editorStore';

describe('zoom utilities', () => {
  describe('zoomAtPoint', () => {
    it('keeps cursor point fixed after zoom in', () => {
      const mouseX = 400;
      const mouseY = 300;
      const oldZoom = 1;
      const newZoom = 2;
      const oldPan = { x: 0, y: 0 };

      // Content point under cursor before zoom
      const contentXBefore = (mouseX - oldPan.x) / oldZoom;
      const contentYBefore = (mouseY - oldPan.y) / oldZoom;

      const newPan = zoomAtPoint(mouseX, mouseY, oldZoom, newZoom, oldPan);

      // Content point under cursor after zoom (should be same)
      const contentXAfter = (mouseX - newPan.x) / newZoom;
      const contentYAfter = (mouseY - newPan.y) / newZoom;

      expect(contentXAfter).toBeCloseTo(contentXBefore, 10);
      expect(contentYAfter).toBeCloseTo(contentYBefore, 10);
    });

    it('keeps cursor point fixed after zoom out', () => {
      const mouseX = 200;
      const mouseY = 150;
      const oldZoom = 2;
      const newZoom = 1;
      const oldPan = { x: -100, y: -50 };

      const contentXBefore = (mouseX - oldPan.x) / oldZoom;
      const contentYBefore = (mouseY - oldPan.y) / oldZoom;

      const newPan = zoomAtPoint(mouseX, mouseY, oldZoom, newZoom, oldPan);

      const contentXAfter = (mouseX - newPan.x) / newZoom;
      const contentYAfter = (mouseY - newPan.y) / newZoom;

      expect(contentXAfter).toBeCloseTo(contentXBefore, 10);
      expect(contentYAfter).toBeCloseTo(contentYBefore, 10);
    });

    it('returns same pan when zoom does not change', () => {
      const pan = { x: 50, y: 75 };
      const result = zoomAtPoint(300, 200, 1.5, 1.5, pan);
      expect(result.x).toBeCloseTo(pan.x, 10);
      expect(result.y).toBeCloseTo(pan.y, 10);
    });
  });

  describe('clampZoom', () => {
    it('clamps below minimum to 0.25', () => {
      expect(clampZoom(0.1)).toBe(0.25);
    });

    it('clamps above maximum to 3.0', () => {
      expect(clampZoom(5.0)).toBe(3.0);
    });

    it('passes through values in range', () => {
      expect(clampZoom(1.5)).toBe(1.5);
    });

    it('allows boundary values', () => {
      expect(clampZoom(0.25)).toBe(0.25);
      expect(clampZoom(3.0)).toBe(3.0);
    });
  });
});

describe('editorStore zoom/pan state', () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it('has correct default zoom/pan values', () => {
    const state = useEditorStore.getState();
    expect(state.zoomLevel).toBe(1);
    expect(state.panOffset).toEqual({ x: 0, y: 0 });
  });

  it('setZoom updates zoomLevel', () => {
    useEditorStore.getState().setZoom(2.5);
    expect(useEditorStore.getState().zoomLevel).toBe(2.5);
  });

  it('setPan updates panOffset', () => {
    useEditorStore.getState().setPan({ x: 100, y: -50 });
    expect(useEditorStore.getState().panOffset).toEqual({ x: 100, y: -50 });
  });

  it('resetView resets zoom and pan to defaults', () => {
    const store = useEditorStore.getState();
    store.setZoom(2);
    store.setPan({ x: 100, y: 200 });
    store.resetView();

    const state = useEditorStore.getState();
    expect(state.zoomLevel).toBe(1);
    expect(state.panOffset).toEqual({ x: 0, y: 0 });
  });

  it('setImage resets zoom and pan', () => {
    const store = useEditorStore.getState();
    store.setZoom(2);
    store.setPan({ x: 50, y: 50 });

    // Create a minimal mock ImageBitmap
    const mockBitmap = { width: 100, height: 100, close: () => {} } as unknown as ImageBitmap;
    const mockFile = new File([''], 'test.png', { type: 'image/png' });

    store.setImage(mockBitmap, mockFile, false);

    const state = useEditorStore.getState();
    expect(state.zoomLevel).toBe(1);
    expect(state.panOffset).toEqual({ x: 0, y: 0 });
  });

  it('resetAll resets zoom and pan', () => {
    const store = useEditorStore.getState();
    store.setZoom(1.5);
    store.setPan({ x: 30, y: 40 });
    store.resetAll();

    const state = useEditorStore.getState();
    expect(state.zoomLevel).toBe(1);
    expect(state.panOffset).toEqual({ x: 0, y: 0 });
  });

  it('enterCropMode resets zoom and pan', () => {
    const store = useEditorStore.getState();
    store.setZoom(2);
    store.setPan({ x: 100, y: 100 });
    store.enterCropMode();

    const state = useEditorStore.getState();
    expect(state.zoomLevel).toBe(1);
    expect(state.panOffset).toEqual({ x: 0, y: 0 });
  });

  it('applyCrop resets zoom and pan', () => {
    const store = useEditorStore.getState();
    store.setZoom(1.8);
    store.setPan({ x: 20, y: 30 });
    store.applyCrop();

    const state = useEditorStore.getState();
    expect(state.zoomLevel).toBe(1);
    expect(state.panOffset).toEqual({ x: 0, y: 0 });
  });

  it('clearCrop resets zoom and pan', () => {
    const store = useEditorStore.getState();
    store.setZoom(2.5);
    store.setPan({ x: -10, y: -20 });
    store.clearCrop();

    const state = useEditorStore.getState();
    expect(state.zoomLevel).toBe(1);
    expect(state.panOffset).toEqual({ x: 0, y: 0 });
  });

  it('exitCropMode resets zoom and pan', () => {
    const store = useEditorStore.getState();
    store.setZoom(1.3);
    store.setPan({ x: 50, y: 60 });
    store.exitCropMode();

    const state = useEditorStore.getState();
    expect(state.zoomLevel).toBe(1);
    expect(state.panOffset).toEqual({ x: 0, y: 0 });
  });
});
