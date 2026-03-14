import { describe, test, expect } from 'vitest'
import { buildFilterString } from '../utils/canvas'
import { defaultAdjustments } from '../types/editor'

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
      })
    ).toBe('brightness(120%) contrast(110%) saturate(80%) grayscale(100%)')
  })
})
