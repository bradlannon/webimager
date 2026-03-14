import { describe, test, expect } from 'vitest'
import { calcResizeDimensions } from '../utils/crop'

describe('calcResizeDimensions', () => {
  describe('aspect locked', () => {
    test('changing width from 1000 to 500 on 1000x800 adjusts height to 400', () => {
      const result = calcResizeDimensions(1000, 800, 500, 800, true, false)
      expect(result.width).toBe(500)
      expect(result.height).toBe(400)
    })

    test('changing height from 800 to 400 on 1000x800 adjusts width to 500', () => {
      const result = calcResizeDimensions(1000, 800, 1000, 400, true, false)
      expect(result.width).toBe(500)
      expect(result.height).toBe(400)
    })

    test('doubling width doubles height', () => {
      const result = calcResizeDimensions(500, 300, 1000, 300, true, false)
      expect(result.width).toBe(1000)
      expect(result.height).toBe(600)
    })
  })

  describe('percentage mode', () => {
    test('50% on 1000x800 produces 500x400', () => {
      const result = calcResizeDimensions(1000, 800, 50, 0, false, true)
      expect(result.width).toBe(500)
      expect(result.height).toBe(400)
    })

    test('200% on 500x300 produces 1000x600', () => {
      const result = calcResizeDimensions(500, 300, 200, 0, false, true)
      expect(result.width).toBe(1000)
      expect(result.height).toBe(600)
    })

    test('100% returns same dimensions', () => {
      const result = calcResizeDimensions(800, 600, 100, 0, false, true)
      expect(result.width).toBe(800)
      expect(result.height).toBe(600)
    })
  })

  describe('bounds clamping', () => {
    test('clamps minimum to 1px', () => {
      const result = calcResizeDimensions(100, 100, 0, 0, false, false)
      expect(result.width).toBeGreaterThanOrEqual(1)
      expect(result.height).toBeGreaterThanOrEqual(1)
    })

    test('clamps maximum to 10000px', () => {
      const result = calcResizeDimensions(5000, 5000, 20000, 20000, false, false)
      expect(result.width).toBeLessThanOrEqual(10000)
      expect(result.height).toBeLessThanOrEqual(10000)
    })
  })

  describe('upscale detection', () => {
    test('marks as upscale when width exceeds current', () => {
      const result = calcResizeDimensions(500, 500, 1000, 500, false, false)
      expect(result.isUpscale).toBe(true)
    })

    test('marks as upscale when height exceeds current', () => {
      const result = calcResizeDimensions(500, 500, 500, 1000, false, false)
      expect(result.isUpscale).toBe(true)
    })

    test('not upscale when both dimensions are smaller', () => {
      const result = calcResizeDimensions(1000, 800, 500, 400, false, false)
      expect(result.isUpscale).toBe(false)
    })

    test('percentage 200% is upscale', () => {
      const result = calcResizeDimensions(500, 300, 200, 0, false, true)
      expect(result.isUpscale).toBe(true)
    })

    test('percentage 50% is not upscale', () => {
      const result = calcResizeDimensions(500, 300, 50, 0, false, true)
      expect(result.isUpscale).toBe(false)
    })
  })

  describe('no aspect lock', () => {
    test('uses exact target dimensions', () => {
      const result = calcResizeDimensions(1000, 800, 700, 300, false, false)
      expect(result.width).toBe(700)
      expect(result.height).toBe(300)
    })
  })
})
