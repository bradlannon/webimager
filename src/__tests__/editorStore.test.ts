import { describe, test, expect, beforeEach } from 'vitest'
import { useEditorStore } from '../store/editorStore'
import { defaultAdjustments } from '../types/editor'

describe('editorStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useEditorStore.setState({
      sourceImage: null,
      originalFile: null,
      wasDownscaled: false,
      transforms: { rotation: 0, flipH: false, flipV: false },
    })
  })

  describe('rotateRight', () => {
    test('from 0 produces 90', () => {
      useEditorStore.getState().rotateRight()
      expect(useEditorStore.getState().transforms.rotation).toBe(90)
    })

    test('from 90 produces 180', () => {
      useEditorStore.setState({ transforms: { rotation: 90, flipH: false, flipV: false } })
      useEditorStore.getState().rotateRight()
      expect(useEditorStore.getState().transforms.rotation).toBe(180)
    })

    test('from 180 produces 270', () => {
      useEditorStore.setState({ transforms: { rotation: 180, flipH: false, flipV: false } })
      useEditorStore.getState().rotateRight()
      expect(useEditorStore.getState().transforms.rotation).toBe(270)
    })

    test('from 270 produces 0', () => {
      useEditorStore.setState({ transforms: { rotation: 270, flipH: false, flipV: false } })
      useEditorStore.getState().rotateRight()
      expect(useEditorStore.getState().transforms.rotation).toBe(0)
    })
  })

  describe('rotateLeft', () => {
    test('from 0 produces 270', () => {
      useEditorStore.getState().rotateLeft()
      expect(useEditorStore.getState().transforms.rotation).toBe(270)
    })

    test('from 270 produces 180', () => {
      useEditorStore.setState({ transforms: { rotation: 270, flipH: false, flipV: false } })
      useEditorStore.getState().rotateLeft()
      expect(useEditorStore.getState().transforms.rotation).toBe(180)
    })

    test('from 180 produces 90', () => {
      useEditorStore.setState({ transforms: { rotation: 180, flipH: false, flipV: false } })
      useEditorStore.getState().rotateLeft()
      expect(useEditorStore.getState().transforms.rotation).toBe(90)
    })

    test('from 90 produces 0', () => {
      useEditorStore.setState({ transforms: { rotation: 90, flipH: false, flipV: false } })
      useEditorStore.getState().rotateLeft()
      expect(useEditorStore.getState().transforms.rotation).toBe(0)
    })
  })

  describe('flipHorizontal', () => {
    test('toggles flipH from false to true', () => {
      useEditorStore.getState().flipHorizontal()
      expect(useEditorStore.getState().transforms.flipH).toBe(true)
    })

    test('toggles flipH from true to false', () => {
      useEditorStore.setState({ transforms: { rotation: 0, flipH: true, flipV: false } })
      useEditorStore.getState().flipHorizontal()
      expect(useEditorStore.getState().transforms.flipH).toBe(false)
    })
  })

  describe('flipVertical', () => {
    test('toggles flipV from false to true', () => {
      useEditorStore.getState().flipVertical()
      expect(useEditorStore.getState().transforms.flipV).toBe(true)
    })

    test('toggles flipV from true to false', () => {
      useEditorStore.setState({ transforms: { rotation: 0, flipH: false, flipV: true } })
      useEditorStore.getState().flipVertical()
      expect(useEditorStore.getState().transforms.flipV).toBe(false)
    })
  })

  describe('adjustments', () => {
    test('initial state has default adjustments', () => {
      const { adjustments } = useEditorStore.getState()
      expect(adjustments).toEqual(defaultAdjustments)
    })

    test('setAdjustment sets brightness', () => {
      useEditorStore.getState().setAdjustment('brightness', 150)
      expect(useEditorStore.getState().adjustments.brightness).toBe(150)
    })

    test('setAdjustment sets contrast', () => {
      useEditorStore.getState().setAdjustment('contrast', 80)
      expect(useEditorStore.getState().adjustments.contrast).toBe(80)
    })

    test('setAdjustment sets saturation', () => {
      useEditorStore.getState().setAdjustment('saturation', 0)
      expect(useEditorStore.getState().adjustments.saturation).toBe(0)
    })

    test('toggleGreyscale toggles from false to true', () => {
      useEditorStore.getState().toggleGreyscale()
      expect(useEditorStore.getState().adjustments.greyscale).toBe(true)
    })

    test('toggleGreyscale toggles from true to false', () => {
      useEditorStore.setState({
        adjustments: { ...defaultAdjustments, greyscale: true },
      })
      useEditorStore.getState().toggleGreyscale()
      expect(useEditorStore.getState().adjustments.greyscale).toBe(false)
    })
  })

  describe('resetAll', () => {
    test('returns transforms to defaults', () => {
      useEditorStore.setState({ transforms: { rotation: 180, flipH: true, flipV: true } })
      useEditorStore.getState().resetAll()
      const { transforms } = useEditorStore.getState()
      expect(transforms.rotation).toBe(0)
      expect(transforms.flipH).toBe(false)
      expect(transforms.flipV).toBe(false)
    })

    test('returns adjustments to defaults', () => {
      useEditorStore.setState({
        adjustments: { brightness: 150, contrast: 80, saturation: 50, greyscale: true },
      })
      useEditorStore.getState().resetAll()
      expect(useEditorStore.getState().adjustments).toEqual(defaultAdjustments)
    })
  })

  describe('setImage', () => {
    test('stores bitmap and resets transforms', () => {
      // Set some transforms first
      useEditorStore.setState({ transforms: { rotation: 90, flipH: true, flipV: true } })

      // Create a mock ImageBitmap
      const mockBitmap = { close: () => {}, width: 100, height: 200 } as unknown as ImageBitmap
      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' })

      useEditorStore.getState().setImage(mockBitmap, mockFile, false)

      const state = useEditorStore.getState()
      expect(state.sourceImage).toBe(mockBitmap)
      expect(state.originalFile).toBe(mockFile)
      expect(state.wasDownscaled).toBe(false)
      expect(state.transforms.rotation).toBe(0)
      expect(state.transforms.flipH).toBe(false)
      expect(state.transforms.flipV).toBe(false)
      expect(state.adjustments).toEqual(defaultAdjustments)
    })

    test('closes previous bitmap when setting new image', () => {
      let closeCalled = false
      const oldBitmap = { close: () => { closeCalled = true }, width: 100, height: 200 } as unknown as ImageBitmap
      useEditorStore.setState({ sourceImage: oldBitmap })

      const newBitmap = { close: () => {}, width: 300, height: 400 } as unknown as ImageBitmap
      const mockFile = new File([''], 'test2.jpg', { type: 'image/jpeg' })

      useEditorStore.getState().setImage(newBitmap, mockFile, true)

      expect(closeCalled).toBe(true)
      expect(useEditorStore.getState().sourceImage).toBe(newBitmap)
      expect(useEditorStore.getState().wasDownscaled).toBe(true)
    })
  })
})
