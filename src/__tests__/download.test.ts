import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { Transforms } from '../types/editor';
import { defaultAdjustments } from '../types/editor';

describe('downloadImage', () => {
  let mockCtx: Record<string, unknown>;
  let mockCanvas: Record<string, unknown>;
  let mockLink: Record<string, unknown>;
  let blobCallback: ((blob: Blob | null) => void) | null;
  let mockRenderToCanvas: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    blobCallback = null;
    mockCtx = {
      canvas: {},
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
    };
    mockCanvas = {
      getContext: vi.fn(() => mockCtx),
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
        if (tag === 'canvas') return mockCanvas;
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
    expect(mockRenderToCanvas).toHaveBeenCalledWith(mockCtx, source, transforms, defaultAdjustments);
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
});
