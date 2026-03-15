import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { Transforms } from '../types/editor';
import { defaultAdjustments } from '../types/editor';

describe('downloadImage', () => {
  let mockCtx: Record<string, unknown>;
  let mockCanvas: Record<string, unknown>;
  let mockWhiteCtx: Record<string, unknown>;
  let mockWhiteCanvas: Record<string, unknown>;
  let mockLink: Record<string, unknown>;
  let blobCallback: ((blob: Blob | null) => void) | null;
  let mockRenderToCanvas: ReturnType<typeof vi.fn>;
  let canvasCreateCount: number;

  beforeEach(() => {
    blobCallback = null;
    canvasCreateCount = 0;
    mockCtx = {
      canvas: {},
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
    };
    mockCanvas = {
      getContext: vi.fn(() => mockCtx),
      toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
        blobCallback = cb;
      }),
      width: 0,
      height: 0,
    };
    mockWhiteCtx = {
      canvas: {},
      save: vi.fn(),
      restore: vi.fn(),
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
    };
    mockWhiteCanvas = {
      getContext: vi.fn(() => mockWhiteCtx),
      toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
        blobCallback = cb;
      }),
      width: 0,
      height: 0,
    };
    mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') {
          canvasCreateCount++;
          return canvasCreateCount === 1 ? mockCanvas : mockWhiteCanvas;
        }
        if (tag === 'a') return mockLink;
        return {};
      }),
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  test('creates an offscreen canvas and calls renderToCanvas', async () => {
    // Dynamic import to pick up mocks
    vi.resetModules();
    mockRenderToCanvas = vi.fn();
    vi.doMock('../utils/canvas', () => ({
      renderToCanvas: mockRenderToCanvas,
    }));
    const { downloadImage } = await import('../utils/download');

    const source = { width: 800, height: 600 } as ImageBitmap;
    const transforms: Transforms = { rotation: 0, flipH: false, flipV: false };

    downloadImage(source, transforms, defaultAdjustments, 'image/jpeg', 0.85);

    expect(document.createElement).toHaveBeenCalledWith('canvas');
    expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    expect(mockRenderToCanvas).toHaveBeenCalledWith(mockCtx, source, { transforms, adjustments: defaultAdjustments, crop: undefined, backgroundMask: undefined, replacementColor: undefined });
  });

  test('calls toBlob with image/jpeg and quality for JPEG format', async () => {
    vi.resetModules();
    mockRenderToCanvas = vi.fn();
    vi.doMock('../utils/canvas', () => ({
      renderToCanvas: mockRenderToCanvas,
    }));
    const { downloadImage } = await import('../utils/download');

    const source = { width: 800, height: 600 } as ImageBitmap;
    const transforms: Transforms = { rotation: 0, flipH: false, flipV: false };

    downloadImage(source, transforms, defaultAdjustments, 'image/jpeg', 0.75);

    expect(mockCanvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/jpeg',
      0.75
    );
  });

  test('calls toBlob with image/png and undefined quality for PNG format', async () => {
    vi.resetModules();
    mockRenderToCanvas = vi.fn();
    vi.doMock('../utils/canvas', () => ({
      renderToCanvas: mockRenderToCanvas,
    }));
    const { downloadImage } = await import('../utils/download');

    const source = { width: 800, height: 600 } as ImageBitmap;
    const transforms: Transforms = { rotation: 0, flipH: false, flipV: false };

    downloadImage(source, transforms, defaultAdjustments, 'image/png', 0.85);

    expect(mockCanvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/png',
      undefined
    );
  });

  test('triggers download with correct filename for JPEG', async () => {
    vi.resetModules();
    mockRenderToCanvas = vi.fn();
    vi.doMock('../utils/canvas', () => ({
      renderToCanvas: mockRenderToCanvas,
    }));
    const { downloadImage } = await import('../utils/download');

    const source = { width: 800, height: 600 } as ImageBitmap;
    const transforms: Transforms = { rotation: 0, flipH: false, flipV: false };

    downloadImage(source, transforms, defaultAdjustments, 'image/jpeg', 0.85, 'photo.jpg');

    // Simulate toBlob callback
    const blob = new Blob(['fake'], { type: 'image/jpeg' });
    blobCallback!(blob);

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(mockLink.href).toBe('blob:mock-url');
    expect(mockLink.download).toBe('photo.jpg');
    expect(mockLink.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  test('triggers download with correct filename for PNG', async () => {
    vi.resetModules();
    mockRenderToCanvas = vi.fn();
    vi.doMock('../utils/canvas', () => ({
      renderToCanvas: mockRenderToCanvas,
    }));
    const { downloadImage } = await import('../utils/download');

    const source = { width: 800, height: 600 } as ImageBitmap;
    const transforms: Transforms = { rotation: 0, flipH: false, flipV: false };

    downloadImage(source, transforms, defaultAdjustments, 'image/png', 1, 'photo.png');

    const blob = new Blob(['fake'], { type: 'image/png' });
    blobCallback!(blob);

    expect(mockLink.download).toBe('photo.png');
  });

  test('uses default filename "edited" when no filename provided', async () => {
    vi.resetModules();
    mockRenderToCanvas = vi.fn();
    vi.doMock('../utils/canvas', () => ({
      renderToCanvas: mockRenderToCanvas,
    }));
    const { downloadImage } = await import('../utils/download');

    const source = { width: 800, height: 600 } as ImageBitmap;
    const transforms: Transforms = { rotation: 0, flipH: false, flipV: false };

    downloadImage(source, transforms, defaultAdjustments, 'image/jpeg', 0.85);

    const blob = new Blob(['fake'], { type: 'image/jpeg' });
    blobCallback!(blob);

    expect(mockLink.download).toBe('edited.jpg');
  });

  test('JPEG + backgroundMask: creates second canvas with white fill', async () => {
    vi.resetModules();
    mockRenderToCanvas = vi.fn();
    vi.doMock('../utils/canvas', () => ({
      renderToCanvas: mockRenderToCanvas,
    }));
    const { downloadImage } = await import('../utils/download');

    const source = { width: 800, height: 600 } as ImageBitmap;
    const transforms: Transforms = { rotation: 0, freeRotation: 0, flipH: false, flipV: false };
    const fakeMask = { width: 800, height: 600, data: new Uint8ClampedArray(4) } as unknown as ImageData;

    downloadImage(source, transforms, defaultAdjustments, 'image/jpeg', 0.85, 'photo.jpg', undefined, fakeMask);

    // Should create two canvases: one for render, one for white fill
    expect(canvasCreateCount).toBe(2);
    // White canvas context should have white fillStyle and fillRect called
    expect(mockWhiteCtx.fillStyle).toBe('#ffffff');
    expect(mockWhiteCtx.fillRect).toHaveBeenCalled();
    // White canvas context should draw the transparent canvas onto it
    expect(mockWhiteCtx.drawImage).toHaveBeenCalledWith(mockCanvas, 0, 0);
    // toBlob should be called on the white canvas, not the original
    expect(mockWhiteCanvas.toBlob).toHaveBeenCalled();
    expect(mockCanvas.toBlob).not.toHaveBeenCalled();
  });

  test('PNG + backgroundMask: no white fill, preserves transparency', async () => {
    vi.resetModules();
    mockRenderToCanvas = vi.fn();
    vi.doMock('../utils/canvas', () => ({
      renderToCanvas: mockRenderToCanvas,
    }));
    const { downloadImage } = await import('../utils/download');

    const source = { width: 800, height: 600 } as ImageBitmap;
    const transforms: Transforms = { rotation: 0, freeRotation: 0, flipH: false, flipV: false };
    const fakeMask = { width: 800, height: 600, data: new Uint8ClampedArray(4) } as unknown as ImageData;

    downloadImage(source, transforms, defaultAdjustments, 'image/png', 1, 'photo.png', undefined, fakeMask);

    // Only one canvas created (no white fill canvas)
    expect(canvasCreateCount).toBe(1);
    // toBlob called on original canvas
    expect(mockCanvas.toBlob).toHaveBeenCalled();
  });

  test('JPEG without backgroundMask: no white fill', async () => {
    vi.resetModules();
    mockRenderToCanvas = vi.fn();
    vi.doMock('../utils/canvas', () => ({
      renderToCanvas: mockRenderToCanvas,
    }));
    const { downloadImage } = await import('../utils/download');

    const source = { width: 800, height: 600 } as ImageBitmap;
    const transforms: Transforms = { rotation: 0, freeRotation: 0, flipH: false, flipV: false };

    downloadImage(source, transforms, defaultAdjustments, 'image/jpeg', 0.85);

    // Only one canvas created
    expect(canvasCreateCount).toBe(1);
    // toBlob called on original canvas
    expect(mockCanvas.toBlob).toHaveBeenCalled();
  });
});
