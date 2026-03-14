import { describe, test, expect, vi } from 'vitest'
import { limitSize, renderToCanvas, drawCheckerboard } from '../utils/canvas'

describe('limitSize', () => {
  test('image under 16,777,216 pixels returns original dimensions and wasDownscaled=false', () => {
    const result = limitSize(1920, 1080) // 2,073,600 pixels
    expect(result.width).toBe(1920)
    expect(result.height).toBe(1080)
    expect(result.wasDownscaled).toBe(false)
  })

  test('image over 16,777,216 pixels returns scaled dimensions and wasDownscaled=true', () => {
    const result = limitSize(6000, 4000) // 24,000,000 pixels
    expect(result.wasDownscaled).toBe(true)
    expect(result.width * result.height).toBeLessThanOrEqual(16_777_216)
    expect(result.width).toBeLessThan(6000)
    expect(result.height).toBeLessThan(4000)
  })

  test('scaled dimensions maintain aspect ratio', () => {
    const originalRatio = 6000 / 4000
    const result = limitSize(6000, 4000)
    const scaledRatio = result.width / result.height
    expect(Math.abs(originalRatio - scaledRatio)).toBeLessThan(0.01)
  })

  test('image exactly at 16,777,216 pixels returns original dimensions', () => {
    // 4096 x 4096 = 16,777,216
    const result = limitSize(4096, 4096)
    expect(result.width).toBe(4096)
    expect(result.height).toBe(4096)
    expect(result.wasDownscaled).toBe(false)
  })
})

describe('renderToCanvas', () => {
  function createMockContext() {
    const canvas = { width: 0, height: 0 }
    const ctx = {
      canvas,
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D
    return { ctx, canvas }
  }

  function createMockSource(width: number, height: number) {
    return { width, height } as unknown as ImageBitmap
  }

  test('with rotation=0, flipH=false, flipV=false, canvas dimensions match source', () => {
    const { ctx, canvas } = createMockContext()
    const source = createMockSource(800, 600)
    renderToCanvas(ctx, source, { rotation: 0, flipH: false, flipV: false })
    expect(canvas.width).toBe(800)
    expect(canvas.height).toBe(600)
  })

  test('with rotation=90, canvas width=source.height, canvas height=source.width', () => {
    const { ctx, canvas } = createMockContext()
    const source = createMockSource(800, 600)
    renderToCanvas(ctx, source, { rotation: 90, flipH: false, flipV: false })
    expect(canvas.width).toBe(600)
    expect(canvas.height).toBe(800)
  })

  test('with rotation=270, canvas dimensions are swapped', () => {
    const { ctx, canvas } = createMockContext()
    const source = createMockSource(800, 600)
    renderToCanvas(ctx, source, { rotation: 270, flipH: false, flipV: false })
    expect(canvas.width).toBe(600)
    expect(canvas.height).toBe(800)
  })

  test('with rotation=180, canvas dimensions match source', () => {
    const { ctx, canvas } = createMockContext()
    const source = createMockSource(800, 600)
    renderToCanvas(ctx, source, { rotation: 180, flipH: false, flipV: false })
    expect(canvas.width).toBe(800)
    expect(canvas.height).toBe(600)
  })

  test('applies correct canvas transform calls', () => {
    const { ctx } = createMockContext()
    const source = createMockSource(800, 600)
    renderToCanvas(ctx, source, { rotation: 90, flipH: true, flipV: false })

    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.translate).toHaveBeenCalled()
    expect(ctx.rotate).toHaveBeenCalledWith((90 * Math.PI) / 180)
    expect(ctx.scale).toHaveBeenCalledWith(-1, 1)
    expect(ctx.drawImage).toHaveBeenCalledWith(source, -source.width / 2, -source.height / 2)
    expect(ctx.restore).toHaveBeenCalled()
  })

  test('with flipV=true, calls scale(1, -1)', () => {
    const { ctx } = createMockContext()
    const source = createMockSource(800, 600)
    renderToCanvas(ctx, source, { rotation: 0, flipH: false, flipV: true })
    expect(ctx.scale).toHaveBeenCalledWith(1, -1)
  })
})

describe('drawCheckerboard', () => {
  test('fills the entire canvas area with tiles', () => {
    const fillRectCalls: Array<[number, number, number, number]> = []
    const ctx = {
      fillStyle: '',
      fillRect: vi.fn((...args: [number, number, number, number]) => {
        fillRectCalls.push(args)
      }),
    } as unknown as CanvasRenderingContext2D

    drawCheckerboard(ctx, 16, 16, 8)

    // 16x16 area with 8px tiles = 4 tiles total (2x2 grid)
    expect(fillRectCalls.length).toBe(4)
  })
})
