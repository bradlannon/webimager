import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadImage } from '../hooks/useImageLoader';
import { MAX_CANVAS_PIXELS } from '../utils/canvas';

// Mock createImageBitmap globally since jsdom doesn't support it
function makeFakeBitmap(width: number, height: number) {
  return {
    width,
    height,
    close: vi.fn(),
  } as unknown as ImageBitmap;
}

function makeFile(type: string, name = 'test-file'): File {
  return new File(['dummy'], name, { type });
}

describe('loadImage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue(makeFakeBitmap(800, 600))
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects non-image file (text/plain) with descriptive error', async () => {
    const file = makeFile('text/plain', 'readme.txt');
    await expect(loadImage(file)).rejects.toThrow(
      /unsupported file type|invalid/i
    );
  });

  it('rejects application/pdf files', async () => {
    const file = makeFile('application/pdf', 'doc.pdf');
    await expect(loadImage(file)).rejects.toThrow(
      /unsupported file type|invalid/i
    );
  });

  it('accepts image/jpeg file type', async () => {
    const file = makeFile('image/jpeg', 'photo.jpg');
    const result = await loadImage(file);
    expect(result.bitmap).toBeDefined();
    expect(result.bitmap.width).toBe(800);
  });

  it('accepts image/png file type', async () => {
    const file = makeFile('image/png', 'image.png');
    const result = await loadImage(file);
    expect(result.bitmap).toBeDefined();
  });

  it('accepts image/webp file type', async () => {
    const file = makeFile('image/webp', 'image.webp');
    const result = await loadImage(file);
    expect(result.bitmap).toBeDefined();
  });

  it('returns wasDownscaled=false for small images', async () => {
    const file = makeFile('image/jpeg', 'small.jpg');
    const result = await loadImage(file);
    expect(result.wasDownscaled).toBe(false);
  });

  it('returns wasDownscaled=true and calls createImageBitmap with resize options for oversized images', async () => {
    // First call returns an oversized bitmap, second call returns the downscaled one
    const oversizedWidth = 5000;
    const oversizedHeight = 5000; // 25M pixels > MAX_CANVAS_PIXELS (16.7M)
    const mockCreateImageBitmap = vi.fn()
      .mockResolvedValueOnce(makeFakeBitmap(oversizedWidth, oversizedHeight))
      .mockResolvedValueOnce(makeFakeBitmap(4096, 4096));

    vi.stubGlobal('createImageBitmap', mockCreateImageBitmap);

    const file = makeFile('image/jpeg', 'huge.jpg');
    const result = await loadImage(file);

    expect(result.wasDownscaled).toBe(true);
    // Should have been called twice: once for initial load, once for downscaled
    expect(mockCreateImageBitmap).toHaveBeenCalledTimes(2);
    // Second call should include resize options
    const secondCallArgs = mockCreateImageBitmap.mock.calls[1];
    expect(secondCallArgs[1]).toMatchObject({
      resizeQuality: 'high',
    });
    expect(secondCallArgs[1].resizeWidth).toBeDefined();
    expect(secondCallArgs[1].resizeHeight).toBeDefined();
  });
});
