import { describe, test, expect } from 'vitest'
import {
  cropToPixels,
  clampCrop,
  constrainToAspectRatio,
  flipCropH,
  flipCropV,
  rotateCropCW,
  rotateCropCCW,
  CROP_PRESETS,
} from '../utils/crop'

describe('cropToPixels', () => {
  test('converts percentage crop to pixel coordinates', () => {
    const result = cropToPixels({ x: 25, y: 25, width: 50, height: 50 }, 1000, 800)
    expect(result).toEqual({ sx: 250, sy: 200, sw: 500, sh: 400 })
  })

  test('full image crop returns full dimensions', () => {
    const result = cropToPixels({ x: 0, y: 0, width: 100, height: 100 }, 1000, 800)
    expect(result).toEqual({ sx: 0, sy: 0, sw: 1000, sh: 800 })
  })

  test('rounds pixel values', () => {
    const result = cropToPixels({ x: 33, y: 33, width: 33, height: 33 }, 100, 100)
    expect(result.sx).toBe(33)
    expect(result.sy).toBe(33)
    expect(result.sw).toBe(33)
    expect(result.sh).toBe(33)
  })

  test('clamps minimum sw/sh to 20px', () => {
    // 1% of 1000 = 10px, should be clamped to 20
    const result = cropToPixels({ x: 0, y: 0, width: 1, height: 1 }, 1000, 1000)
    expect(result.sw).toBe(20)
    expect(result.sh).toBe(20)
  })

  test('does not clamp sw/sh when above 20px', () => {
    const result = cropToPixels({ x: 0, y: 0, width: 5, height: 5 }, 1000, 1000)
    expect(result.sw).toBe(50)
    expect(result.sh).toBe(50)
  })
})

describe('clampCrop', () => {
  test('passes through valid crop unchanged', () => {
    const crop = { x: 10, y: 20, width: 50, height: 60 }
    expect(clampCrop(crop)).toEqual(crop)
  })

  test('clamps negative x to 0', () => {
    const result = clampCrop({ x: -5, y: 10, width: 50, height: 50 })
    expect(result.x).toBe(0)
  })

  test('clamps negative y to 0', () => {
    const result = clampCrop({ x: 10, y: -5, width: 50, height: 50 })
    expect(result.y).toBe(0)
  })

  test('clamps x+width to not exceed 100', () => {
    const result = clampCrop({ x: 80, y: 0, width: 50, height: 50 })
    expect(result.x + result.width).toBeLessThanOrEqual(100)
  })

  test('clamps y+height to not exceed 100', () => {
    const result = clampCrop({ x: 0, y: 80, width: 50, height: 50 })
    expect(result.y + result.height).toBeLessThanOrEqual(100)
  })

  test('enforces minimum width', () => {
    const result = clampCrop({ x: 50, y: 50, width: 0.5, height: 50 })
    expect(result.width).toBeGreaterThanOrEqual(1)
  })

  test('enforces minimum height', () => {
    const result = clampCrop({ x: 50, y: 50, width: 50, height: 0.5 })
    expect(result.height).toBeGreaterThanOrEqual(1)
  })
})

describe('constrainToAspectRatio', () => {
  test('constrains width 50%, height 50% with 16:9 ratio', () => {
    const result = constrainToAspectRatio(50, 50, 16 / 9, 1000, 1000)
    // 50% of 1000 = 500px wide. At 16:9 ratio, height = 500 / (16/9) = 281.25px
    // 281.25 / 1000 * 100 = 28.125%
    expect(result.width).toBeCloseTo(50, 1)
    expect(result.height).toBeCloseTo(28.125, 1)
  })

  test('fits by height when constrained height exceeds available', () => {
    // width=80%, height=20%, ratio=16/9 on 100x1000 image
    // 80% of 100 = 80px. At 16:9, height = 80/(16/9) = 45px = 4.5% of 1000
    // 4.5% < 20%, so should fit by width (use full width)
    // But if we flip: width=20%, height=80%, ratio=16/9 on 1000x100
    // 20% of 1000 = 200px. Height = 200/(16/9) = 112.5px = 112.5% of 100 -- exceeds!
    // So fit by height: 80% of 100 = 80px. Width = 80 * (16/9) = 142.2px = 14.2% of 1000
    const result = constrainToAspectRatio(20, 80, 16 / 9, 1000, 100)
    expect(result.height).toBeCloseTo(80, 1)
    expect(result.width).toBeCloseTo(14.222, 0)
  })

  test('1:1 ratio makes square in percentage space on non-square image', () => {
    // 50% width, 50% height, 1:1, on 1000x500
    // 50% of 1000 = 500px. At 1:1, height = 500px = 100% of 500. That's the max.
    // So fit by height: 50% of 500 = 250px. Width = 250px = 25% of 1000
    const result = constrainToAspectRatio(50, 50, 1, 1000, 500)
    expect(result.height).toBeCloseTo(50, 1)
    expect(result.width).toBeCloseTo(25, 1)
  })
})

describe('flipCropH', () => {
  test('mirrors crop horizontally', () => {
    // Crop on left 25% of image: x=0, width=25 → should become x=75
    const result = flipCropH({ x: 0, y: 10, width: 25, height: 50 })
    expect(result).toEqual({ x: 75, y: 10, width: 25, height: 50 })
  })

  test('centered crop stays centered', () => {
    const result = flipCropH({ x: 25, y: 25, width: 50, height: 50 })
    expect(result).toEqual({ x: 25, y: 25, width: 50, height: 50 })
  })

  test('full image crop stays full', () => {
    const result = flipCropH({ x: 0, y: 0, width: 100, height: 100 })
    expect(result).toEqual({ x: 0, y: 0, width: 100, height: 100 })
  })
})

describe('flipCropV', () => {
  test('mirrors crop vertically', () => {
    // Crop on top 25%: y=0, height=25 → should become y=75
    const result = flipCropV({ x: 10, y: 0, width: 50, height: 25 })
    expect(result).toEqual({ x: 10, y: 75, width: 50, height: 25 })
  })

  test('centered crop stays centered', () => {
    const result = flipCropV({ x: 25, y: 25, width: 50, height: 50 })
    expect(result).toEqual({ x: 25, y: 25, width: 50, height: 50 })
  })
})

describe('rotateCropCW', () => {
  test('rotates crop 90° clockwise', () => {
    // Top-left corner crop → should become top-right corner
    const result = rotateCropCW({ x: 0, y: 0, width: 25, height: 50 })
    expect(result).toEqual({ x: 50, y: 0, width: 50, height: 25 })
  })

  test('full image stays full', () => {
    const result = rotateCropCW({ x: 0, y: 0, width: 100, height: 100 })
    expect(result).toEqual({ x: 0, y: 0, width: 100, height: 100 })
  })
})

describe('rotateCropCCW', () => {
  test('rotates crop 90° counter-clockwise', () => {
    // Top-left corner crop → should become bottom-left corner
    const result = rotateCropCCW({ x: 0, y: 0, width: 25, height: 50 })
    expect(result).toEqual({ x: 0, y: 75, width: 50, height: 25 })
  })

  test('CW then CCW returns to original', () => {
    const original = { x: 10, y: 20, width: 30, height: 40 }
    const rotated = rotateCropCW(original)
    const back = rotateCropCCW(rotated)
    expect(back.x).toBeCloseTo(original.x)
    expect(back.y).toBeCloseTo(original.y)
    expect(back.width).toBeCloseTo(original.width)
    expect(back.height).toBeCloseTo(original.height)
  })
})

describe('CROP_PRESETS', () => {
  test('contains Free preset with null ratio', () => {
    const free = CROP_PRESETS.find((p) => p.label === 'Free')
    expect(free).toBeDefined()
    expect(free!.ratio).toBeNull()
  })

  test('contains 1:1 square preset', () => {
    const square = CROP_PRESETS.find((p) => p.ratio === 1)
    expect(square).toBeDefined()
  })

  test('contains 4:3 preset', () => {
    const preset = CROP_PRESETS.find((p) => p.ratio !== null && Math.abs(p.ratio - 4 / 3) < 0.001)
    expect(preset).toBeDefined()
  })

  test('contains 16:9 preset', () => {
    const preset = CROP_PRESETS.find((p) => p.ratio !== null && Math.abs(p.ratio - 16 / 9) < 0.001)
    expect(preset).toBeDefined()
  })

  test('contains 3:2 preset', () => {
    const preset = CROP_PRESETS.find((p) => p.ratio !== null && Math.abs(p.ratio - 3 / 2) < 0.001)
    expect(preset).toBeDefined()
  })

  test('contains 4:5 Instagram portrait preset', () => {
    const preset = CROP_PRESETS.find((p) => p.label.includes('Instagram') && p.ratio !== null && Math.abs(p.ratio - 4 / 5) < 0.001)
    expect(preset).toBeDefined()
  })

  test('contains 1.91:1 Facebook preset', () => {
    const preset = CROP_PRESETS.find((p) => p.label.includes('Facebook') && p.ratio !== null && Math.abs(p.ratio - 1.91) < 0.001)
    expect(preset).toBeDefined()
  })

  test('contains 5:7 preset', () => {
    const preset = CROP_PRESETS.find((p) => p.ratio !== null && Math.abs(p.ratio - 5 / 7) < 0.001)
    expect(preset).toBeDefined()
  })

  test('contains 4:5 8x10 print preset', () => {
    const preset = CROP_PRESETS.find((p) => p.label.includes('8x10') || (p.label.includes('Print') && p.ratio !== null && Math.abs(p.ratio - 4 / 5) < 0.001))
    expect(preset).toBeDefined()
  })
})
