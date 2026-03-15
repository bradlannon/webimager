import { describe, test, expect } from 'vitest'
import { applySharpen } from '../utils/sharpen'

// Helper: create a mock CanvasRenderingContext2D with known pixel data
function createMockCtx(width: number, height: number, pixelData: Uint8ClampedArray) {
  const sourceImageData = { width, height, data: new Uint8ClampedArray(pixelData) } as unknown as ImageData
  let outputData: Uint8ClampedArray | null = null

  const ctx = {
    canvas: { width, height },
    getImageData: () => sourceImageData,
    createImageData: (w: number, h: number) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
    }),
    putImageData: (imgData: ImageData) => {
      outputData = new Uint8ClampedArray(imgData.data)
    },
    get _outputData(): Uint8ClampedArray {
      return outputData ?? new Uint8ClampedArray(pixelData.length)
    },
  } as unknown as CanvasRenderingContext2D & { _outputData: Uint8ClampedArray }

  return ctx
}

describe('applySharpen', () => {
  test('intensity=0 returns pixels unchanged (identity)', () => {
    const w = 3, h = 3
    const data = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 100
      data[i + 1] = 150
      data[i + 2] = 200
      data[i + 3] = 255
    }
    const ctx = createMockCtx(w, h, data)
    applySharpen(ctx, 0)
    // With intensity=0, output should equal input
    for (let i = 0; i < data.length; i++) {
      expect(ctx._outputData[i]).toBe(data[i])
    }
  })

  test('intensity=50 produces sharpened pixel values (center pixel enhanced)', () => {
    const w = 3, h = 3
    const data = new Uint8ClampedArray(w * h * 4)
    // Set all pixels to 100
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 100
      data[i + 1] = 100
      data[i + 2] = 100
      data[i + 3] = 255
    }
    // Set center pixel to 150
    const centerIdx = (1 * w + 1) * 4
    data[centerIdx] = 150
    data[centerIdx + 1] = 150
    data[centerIdx + 2] = 150

    const ctx = createMockCtx(w, h, data)
    applySharpen(ctx, 50)

    // Center pixel should be enhanced (higher than 150) because
    // sharpen kernel enhances center relative to neighbors
    const outCenter = (1 * w + 1) * 4
    expect(ctx._outputData[outCenter]).toBeGreaterThan(150)
  })

  test('clamps output to 0-255 range', () => {
    const w = 3, h = 3
    const data = new Uint8ClampedArray(w * h * 4)
    // Set all neighbors to 0
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
      data[i + 3] = 255
    }
    // Set center pixel to 255
    const centerIdx = (1 * w + 1) * 4
    data[centerIdx] = 255
    data[centerIdx + 1] = 255
    data[centerIdx + 2] = 255

    const ctx = createMockCtx(w, h, data)
    applySharpen(ctx, 100)

    // All values should be in 0-255
    for (let i = 0; i < ctx._outputData.length; i += 4) {
      expect(ctx._outputData[i]).toBeGreaterThanOrEqual(0)
      expect(ctx._outputData[i]).toBeLessThanOrEqual(255)
      expect(ctx._outputData[i + 1]).toBeGreaterThanOrEqual(0)
      expect(ctx._outputData[i + 1]).toBeLessThanOrEqual(255)
      expect(ctx._outputData[i + 2]).toBeGreaterThanOrEqual(0)
      expect(ctx._outputData[i + 2]).toBeLessThanOrEqual(255)
    }
  })

  test('preserves alpha channel', () => {
    const w = 3, h = 3
    const data = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 100
      data[i + 1] = 100
      data[i + 2] = 100
      data[i + 3] = 128  // Semi-transparent
    }
    const ctx = createMockCtx(w, h, data)
    applySharpen(ctx, 50)

    // All alpha values should remain 128
    for (let i = 3; i < ctx._outputData.length; i += 4) {
      expect(ctx._outputData[i]).toBe(128)
    }
  })

  test('copies edge pixels from source (1px border unchanged)', () => {
    const w = 5, h = 5
    const data = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4
        data[idx] = (x + y * w) % 256
        data[idx + 1] = (x + y * w + 1) % 256
        data[idx + 2] = (x + y * w + 2) % 256
        data[idx + 3] = 255
      }
    }
    const ctx = createMockCtx(w, h, data)
    applySharpen(ctx, 100)

    // Check that edge pixels match source
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
          const idx = (y * w + x) * 4
          expect(ctx._outputData[idx]).toBe(data[idx])
          expect(ctx._outputData[idx + 1]).toBe(data[idx + 1])
          expect(ctx._outputData[idx + 2]).toBe(data[idx + 2])
          expect(ctx._outputData[idx + 3]).toBe(data[idx + 3])
        }
      }
    }
  })
})
