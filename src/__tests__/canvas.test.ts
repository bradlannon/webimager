import { describe, test, expect, vi, beforeEach } from 'vitest'
import { buildFilterString, renderToCanvas } from '../utils/canvas'
import { defaultAdjustments } from '../types/editor'
import type { Transforms } from '../types/editor'

// BGREM-06: renderToCanvas replacement color — destination-over compositing
describe('renderToCanvas replacement color', () => {
  let ctx: CanvasRenderingContext2D;
  let canvas: HTMLCanvasElement;
  let source: ImageBitmap;
  let transforms: Transforms;
  let mockMask: ImageData;

  beforeEach(() => {
    // Build a minimal mock canvas context that tracks composite operations
    const compositeHistory: string[] = [];
    ctx = {
      canvas: { width: 100, height: 100 },
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      putImageData: vi.fn(),
      fillRect: vi.fn(),
      get globalCompositeOperation() { return compositeHistory[compositeHistory.length - 1] ?? 'source-over'; },
      set globalCompositeOperation(v: string) { compositeHistory.push(v); },
      fillStyle: '',
      filter: 'none',
    } as unknown as CanvasRenderingContext2D;

    canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ctx),
    } as unknown as HTMLCanvasElement;

    // Stub document.createElement so offscreen canvases return a minimal mock
    vi.stubGlobal('document', {
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          save: vi.fn(),
          restore: vi.fn(),
          translate: vi.fn(),
          rotate: vi.fn(),
          scale: vi.fn(),
          drawImage: vi.fn(),
          putImageData: vi.fn(),
          fillRect: vi.fn(),
          globalCompositeOperation: 'source-over',
          fillStyle: '',
          filter: 'none',
        })),
      })),
    });

    source = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
    transforms = { rotation: 0, freeRotation: 0, flipH: false, flipV: false };
    mockMask = { width: 100, height: 100, data: new Uint8ClampedArray(100 * 100 * 4) } as unknown as ImageData;

    // Point ctx.canvas to a writable proxy
    Object.defineProperty(ctx, 'canvas', {
      value: { width: 100, height: 100 },
      writable: true,
      configurable: true,
    });
  });

  test('destination_over_composite_used_with_fillRect_when_replacementColor_and_mask_provided', () => {
    const compositeOps: string[] = [];
    const fillRectCalls: unknown[] = [];
    const fillStyles: string[] = [];

    // Rebuild ctx with tracking
    const trackedCtx = {
      canvas: { width: 100, height: 100 },
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      putImageData: vi.fn(),
      filter: 'none',
      get fillStyle() { return fillStyles[fillStyles.length - 1] ?? ''; },
      set fillStyle(v: string) { fillStyles.push(v); },
      fillRect: vi.fn((...args) => { fillRectCalls.push(args); }),
      get globalCompositeOperation() { return compositeOps[compositeOps.length - 1] ?? 'source-over'; },
      set globalCompositeOperation(v: string) { compositeOps.push(v); },
    } as unknown as CanvasRenderingContext2D;

    Object.defineProperty(trackedCtx, 'canvas', {
      value: { width: 100, height: 100 },
      writable: true,
      configurable: true,
    });

    renderToCanvas(trackedCtx, source, { transforms, adjustments: defaultAdjustments, backgroundMask: mockMask, replacementColor: '#ff0000' });

    // destination-over must appear in composite ops (to paint color behind subject)
    expect(compositeOps).toContain('destination-over');

    // fillRect must have been called at least once
    expect(fillRectCalls.length).toBeGreaterThan(0);

    // fillStyle must have been set to the replacement color
    expect(fillStyles).toContain('#ff0000');

    // After replacement color block, composite should be reset to source-over
    expect(compositeOps[compositeOps.length - 1]).toBe('source-over');
  });

  test('no_destination_over_composite_when_no_replacementColor', () => {
    const compositeOps: string[] = [];

    const trackedCtx = {
      canvas: { width: 100, height: 100 },
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      putImageData: vi.fn(),
      filter: 'none',
      fillStyle: '',
      fillRect: vi.fn(),
      get globalCompositeOperation() { return compositeOps[compositeOps.length - 1] ?? 'source-over'; },
      set globalCompositeOperation(v: string) { compositeOps.push(v); },
    } as unknown as CanvasRenderingContext2D;

    Object.defineProperty(trackedCtx, 'canvas', {
      value: { width: 100, height: 100 },
      writable: true,
      configurable: true,
    });

    renderToCanvas(trackedCtx, source, { transforms, adjustments: defaultAdjustments, backgroundMask: mockMask, replacementColor: null });

    // destination-over must NOT appear when no replacementColor
    expect(compositeOps).not.toContain('destination-over');
  });
});

describe('buildFilterString', () => {
  test('returns "none" for default adjustments', () => {
    expect(buildFilterString(defaultAdjustments)).toBe('none')
  })

  test('returns brightness filter when brightness differs from 100', () => {
    expect(
      buildFilterString({ ...defaultAdjustments, brightness: 120 })
    ).toBe('brightness(120%)')
  })

  test('returns brightness and contrast filters', () => {
    expect(
      buildFilterString({ ...defaultAdjustments, brightness: 120, contrast: 80 })
    ).toBe('brightness(120%) contrast(80%)')
  })

  test('returns grayscale filter when greyscale is true', () => {
    expect(
      buildFilterString({ ...defaultAdjustments, greyscale: true })
    ).toBe('grayscale(100%)')
  })

  test('returns all filters combined', () => {
    expect(
      buildFilterString({
        brightness: 120,
        contrast: 110,
        saturation: 80,
        greyscale: true,
        blur: 0,
        sharpen: 0,
      })
    ).toBe('brightness(120%) contrast(110%) saturate(80%) grayscale(100%)')
  })

  test('returns blur filter when blur > 0', () => {
    expect(
      buildFilterString({ ...defaultAdjustments, blur: 5, sharpen: 0 })
    ).toBe('blur(5px)')
  })

  test('blur=0 produces no blur token', () => {
    const result = buildFilterString({ ...defaultAdjustments, blur: 0, sharpen: 0 })
    expect(result).toBe('none')
    expect(result).not.toContain('blur')
  })

  test('defaults with blur=0 and sharpen=0 returns "none"', () => {
    expect(
      buildFilterString({ ...defaultAdjustments, blur: 0, sharpen: 0 })
    ).toBe('none')
  })
})
