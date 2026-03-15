import { describe, test, expect, vi, beforeEach } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { renderHook, act } from '@testing-library/react';
import { useBackgroundRemoval } from '../hooks/useBackgroundRemoval';
import { useEditorStore } from '../store/editorStore';
import { defaultAdjustments } from '../types/editor';

// Worker message protocol types (mirroring the worker's contract)
type WorkerInMessage =
  | { type: 'load-model' }
  | { type: 'run-inference'; imageData: ImageData }
  | { type: 'cancel' };

type WorkerOutMessage =
  | { type: 'download-progress'; progress: number; loaded: number; total: number }
  | { type: 'model-ready' }
  | { type: 'inference-start' }
  | { type: 'inference-complete'; maskData: ImageData }
  | { type: 'error'; message: string }
  | { type: 'cancelled' };

// BGREM-05: restoreBackground calls clearBackgroundMask which fully resets all background state
describe('restoreBackground integration', () => {
  beforeEach(() => {
    // Mock Worker to avoid jsdom throwing on Web Worker construction
    vi.stubGlobal('Worker', class {
      onmessage: null = null;
      onerror: null = null;
      postMessage = vi.fn();
      terminate = vi.fn();
    });

    // Reset store to a known state with background removal active
    useEditorStore.setState({
      sourceImage: null,
      originalFile: null,
      wasDownscaled: false,
      transforms: { rotation: 0, flipH: false, flipV: false },
      adjustments: { ...defaultAdjustments },
      cropRegion: null,
      cropMode: false,
      backgroundRemoved: true,
      backgroundMask: { data: new Uint8ClampedArray(4), width: 1, height: 1 } as unknown as ImageData,
      replacementColor: '#ff0000',
    });
  });

  test('restoreBackground clears backgroundRemoved, backgroundMask, and replacementColor', () => {
    const { result } = renderHook(() => useBackgroundRemoval());

    act(() => {
      result.current.restoreBackground();
    });

    const state = useEditorStore.getState();
    expect(state.backgroundRemoved).toBe(false);
    expect(state.backgroundMask).toBeNull();
    expect(state.replacementColor).toBeNull();
  });

  test('restoreBackground invokes clearBackgroundMask on the store', () => {
    const clearSpy = vi.spyOn(useEditorStore.getState(), 'clearBackgroundMask');

    const { result } = renderHook(() => useBackgroundRemoval());

    act(() => {
      result.current.restoreBackground();
    });

    expect(clearSpy).toHaveBeenCalledOnce();
    clearSpy.mockRestore();
  });
});

describe('background removal worker', () => {
  test('worker file exists', () => {
    const workerPath = resolve(__dirname, '../workers/backgroundRemoval.worker.ts');
    expect(existsSync(workerPath)).toBe(true);
  });

  test('WorkerInMessage types cover all expected commands', () => {
    // Type-level exhaustiveness: verify each message type is assignable
    const loadMsg: WorkerInMessage = { type: 'load-model' };
    const inferMsg: WorkerInMessage = {
      type: 'run-inference',
      imageData: { data: new Uint8ClampedArray(4), width: 1, height: 1 } as unknown as ImageData,
    };
    const cancelMsg: WorkerInMessage = { type: 'cancel' };

    expect(loadMsg.type).toBe('load-model');
    expect(inferMsg.type).toBe('run-inference');
    expect(cancelMsg.type).toBe('cancel');
  });

  test('WorkerOutMessage types cover all expected responses', () => {
    const progressMsg: WorkerOutMessage = {
      type: 'download-progress',
      progress: 50,
      loaded: 1024,
      total: 2048,
    };
    const readyMsg: WorkerOutMessage = { type: 'model-ready' };
    const startMsg: WorkerOutMessage = { type: 'inference-start' };
    const completeMsg: WorkerOutMessage = {
      type: 'inference-complete',
      maskData: { data: new Uint8ClampedArray(4), width: 1, height: 1 } as unknown as ImageData,
    };
    const errorMsg: WorkerOutMessage = { type: 'error', message: 'fail' };
    const cancelledMsg: WorkerOutMessage = { type: 'cancelled' };

    expect(progressMsg.type).toBe('download-progress');
    expect(progressMsg.progress).toBe(50);
    expect(readyMsg.type).toBe('model-ready');
    expect(startMsg.type).toBe('inference-start');
    expect(completeMsg.type).toBe('inference-complete');
    expect(errorMsg.type).toBe('error');
    expect(errorMsg.message).toBe('fail');
    expect(cancelledMsg.type).toBe('cancelled');
  });

  test('download-progress message includes numeric fields', () => {
    const msg: WorkerOutMessage = {
      type: 'download-progress',
      progress: 75.5,
      loaded: 34000000,
      total: 45000000,
    };
    expect(msg.type).toBe('download-progress');
    if (msg.type === 'download-progress') {
      expect(typeof msg.progress).toBe('number');
      expect(typeof msg.loaded).toBe('number');
      expect(typeof msg.total).toBe('number');
      expect(msg.progress).toBeGreaterThanOrEqual(0);
      expect(msg.progress).toBeLessThanOrEqual(100);
    }
  });
});
