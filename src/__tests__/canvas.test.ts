import { describe, test, expect, vi, beforeEach } from 'vitest'
import { buildFilterString, renderToCanvas } from '../utils/canvas'
import { defaultAdjustments } from '../types/editor'
import type { Transforms, TextEntry } from '../types/editor'

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
        sepia: 50,
        hueRotate: 15,
        blur: 3,
        sharpen: 0,
      })
    ).toBe('brightness(120%) contrast(110%) saturate(80%) grayscale(100%) sepia(50%) hue-rotate(15deg) blur(3px)')
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

  test('returns sepia filter when sepia > 0', () => {
    expect(
      buildFilterString({ ...defaultAdjustments, sepia: 80 })
    ).toContain('sepia(80%)')
  })

  test('returns hue-rotate filter when hueRotate != 0', () => {
    expect(
      buildFilterString({ ...defaultAdjustments, hueRotate: -20 })
    ).toContain('hue-rotate(-20deg)')
  })

  test('sepia=0 does not include sepia token', () => {
    const result = buildFilterString({ ...defaultAdjustments, sepia: 0 })
    expect(result).not.toContain('sepia')
  })

  test('hueRotate=0 does not include hue-rotate token', () => {
    const result = buildFilterString({ ...defaultAdjustments, hueRotate: 0 })
    expect(result).not.toContain('hue-rotate')
  })
})

describe('text baking', () => {
  let transforms: Transforms;
  let source: ImageBitmap;

  function createMockCtx() {
    const fillTextCalls: unknown[][] = [];
    const fontValues: string[] = [];
    const fillStyleValues: string[] = [];
    const textBaselineValues: string[] = [];

    const ctx = {
      canvas: { width: 200, height: 100 },
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      putImageData: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn((...args: unknown[]) => { fillTextCalls.push(args); }),
      strokeText: vi.fn(),
      lineWidth: 1,
      strokeStyle: '',
      lineJoin: 'miter',
      get font() { return fontValues[fontValues.length - 1] ?? ''; },
      set font(v: string) { fontValues.push(v); },
      get fillStyle() { return fillStyleValues[fillStyleValues.length - 1] ?? ''; },
      set fillStyle(v: string) { fillStyleValues.push(v); },
      get textBaseline() { return textBaselineValues[textBaselineValues.length - 1] ?? 'alphabetic'; },
      set textBaseline(v: string) { textBaselineValues.push(v); },
      filter: 'none',
      globalCompositeOperation: 'source-over',
    } as unknown as CanvasRenderingContext2D;

    Object.defineProperty(ctx, 'canvas', {
      value: { width: 200, height: 100 },
      writable: true,
      configurable: true,
    });

    return { ctx, fillTextCalls, fontValues, fillStyleValues };
  }

  beforeEach(() => {
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

    transforms = { rotation: 0, freeRotation: 0, flipH: false, flipV: false };
    source = { width: 200, height: 100, close: vi.fn() } as unknown as ImageBitmap;
  });

  const makeEntry = (overrides?: Partial<TextEntry>): TextEntry => ({
    content: 'Hello',
    x: 50,
    y: 50,
    style: { fontFamily: 'Arial', fontSize: 48, color: '#FF0000', bold: false, italic: false },
    ...overrides,
  });

  test('renderToCanvas calls ctx.fillText when bakedTexts provided', () => {
    const { ctx, fillTextCalls } = createMockCtx();
    const entry = makeEntry();
    renderToCanvas(ctx, source, { transforms, adjustments: defaultAdjustments, bakedTexts: [entry] });
    expect(fillTextCalls.length).toBe(1);
    expect(fillTextCalls[0][0]).toBe('Hello');
  });

  test('font string is composed correctly with italic and bold', () => {
    const { ctx, fontValues } = createMockCtx();
    const entry = makeEntry({ style: { fontFamily: 'Georgia', fontSize: 24, color: '#000', bold: true, italic: true } });
    renderToCanvas(ctx, source, { transforms, adjustments: defaultAdjustments, bakedTexts: [entry] });
    expect(fontValues).toContain('italic bold 24px Georgia');
  });

  test('position is converted from percentage to pixels', () => {
    const { ctx, fillTextCalls } = createMockCtx();
    // canvas is 200x100, x=50 -> 100px, y=50 -> 50px
    const entry = makeEntry({ x: 50, y: 50 });
    renderToCanvas(ctx, source, { transforms, adjustments: defaultAdjustments, bakedTexts: [entry] });
    expect(fillTextCalls[0][1]).toBe(100); // x: 50% of 200
    expect(fillTextCalls[0][2]).toBe(50);  // y: 50% of 100
  });

  test('multiple bakedTexts entries are all rendered', () => {
    const { ctx, fillTextCalls } = createMockCtx();
    const entries = [
      makeEntry({ content: 'First' }),
      makeEntry({ content: 'Second' }),
      makeEntry({ content: 'Third' }),
    ];
    renderToCanvas(ctx, source, { transforms, adjustments: defaultAdjustments, bakedTexts: entries });
    expect(fillTextCalls.length).toBe(3);
    expect(fillTextCalls[0][0]).toBe('First');
    expect(fillTextCalls[1][0]).toBe('Second');
    expect(fillTextCalls[2][0]).toBe('Third');
  });

  test('empty bakedTexts array does not call fillText', () => {
    const { ctx, fillTextCalls } = createMockCtx();
    renderToCanvas(ctx, source, { transforms, adjustments: defaultAdjustments, bakedTexts: [] });
    expect(fillTextCalls.length).toBe(0);
  });
})
