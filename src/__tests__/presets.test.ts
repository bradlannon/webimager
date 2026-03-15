import { describe, test, expect } from 'vitest'
import { PRESETS, presetToCssFilter } from '../utils/presets'
import { defaultAdjustments } from '../types/editor'

describe('presets', () => {
  test('PRESETS has at least 11 entries', () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(11)
  })

  test('all preset ids are unique', () => {
    const ids = PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('all preset labels are unique', () => {
    const labels = PRESETS.map((p) => p.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  test('"none" preset adjustments equal defaultAdjustments', () => {
    const none = PRESETS.find((p) => p.id === 'none')
    expect(none).toBeDefined()
    expect(none!.adjustments).toEqual(defaultAdjustments)
  })

  test('all non-"none" presets produce a non-"none" filter string', () => {
    const nonNone = PRESETS.filter((p) => p.id !== 'none')
    expect(nonNone.length).toBeGreaterThanOrEqual(10)
    for (const preset of nonNone) {
      const filter = presetToCssFilter(preset.adjustments)
      expect(filter, `preset "${preset.id}" should produce a non-"none" filter`).not.toBe('none')
    }
  })

  test('presetToCssFilter produces valid CSS filter string format', () => {
    const sepia = PRESETS.find((p) => p.id === 'sepia')!
    const filter = presetToCssFilter(sepia.adjustments)
    // Should contain sepia token since sepia preset has sepia > 0
    expect(filter).toContain('sepia(')
    // Should be a space-separated list of CSS filter functions
    expect(filter).toMatch(/^[a-z-]+\(.+?\)(\s+[a-z-]+\(.+?\))*$/)
  })

  test('presetToCssFilter excludes sharpen (not a CSS filter)', () => {
    // dramatic preset has sharpen=10
    const dramatic = PRESETS.find((p) => p.id === 'dramatic')!
    const filter = presetToCssFilter(dramatic.adjustments)
    expect(filter).not.toContain('sharpen')
  })
})
