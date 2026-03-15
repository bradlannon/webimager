import { describe, test, expect, beforeEach, vi } from 'vitest'
import { useEditorStore } from '../store/editorStore'
import { defaultAdjustments, defaultCrop } from '../types/editor'

describe('editorStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useEditorStore.setState({
      sourceImage: null,
      originalFile: null,
      wasDownscaled: false,
      transforms: { rotation: 0, flipH: false, flipV: false },
      adjustments: { ...defaultAdjustments },
      cropRegion: null,
      cropMode: false,
      backgroundRemoved: false,
      backgroundMask: null,
      replacementColor: null,
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

    test('clears cropRegion and cropMode when setting new image', () => {
      useEditorStore.setState({
        cropRegion: { x: 10, y: 10, width: 50, height: 50 },
        cropMode: true,
      })

      const mockBitmap = { close: () => {}, width: 100, height: 200 } as unknown as ImageBitmap
      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' })

      useEditorStore.getState().setImage(mockBitmap, mockFile, false)

      expect(useEditorStore.getState().cropRegion).toBeNull()
      expect(useEditorStore.getState().cropMode).toBe(false)
    })
  })

  describe('crop mode', () => {
    test('enterCropMode sets cropMode to true and initializes cropRegion to defaultCrop', () => {
      useEditorStore.getState().enterCropMode()
      const state = useEditorStore.getState()
      expect(state.cropMode).toBe(true)
      expect(state.cropRegion).toEqual(defaultCrop)
    })

    test('enterCropMode preserves existing cropRegion', () => {
      const existingCrop = { x: 10, y: 20, width: 60, height: 70 }
      useEditorStore.setState({ cropRegion: existingCrop })
      useEditorStore.getState().enterCropMode()
      expect(useEditorStore.getState().cropRegion).toEqual(existingCrop)
      expect(useEditorStore.getState().cropMode).toBe(true)
    })

    test('exitCropMode sets cropMode to false but preserves cropRegion', () => {
      const crop = { x: 10, y: 20, width: 60, height: 70 }
      useEditorStore.setState({ cropMode: true, cropRegion: crop })
      useEditorStore.getState().exitCropMode()
      expect(useEditorStore.getState().cropMode).toBe(false)
      expect(useEditorStore.getState().cropRegion).toEqual(crop)
    })

    test('setCrop updates cropRegion with clamped values', () => {
      useEditorStore.getState().setCrop({ x: 10, y: 20, width: 50, height: 60 })
      expect(useEditorStore.getState().cropRegion).toEqual({ x: 10, y: 20, width: 50, height: 60 })
    })

    test('setCrop clamps invalid values', () => {
      useEditorStore.getState().setCrop({ x: -5, y: -10, width: 200, height: 200 })
      const crop = useEditorStore.getState().cropRegion!
      expect(crop.x).toBeGreaterThanOrEqual(0)
      expect(crop.y).toBeGreaterThanOrEqual(0)
      expect(crop.x + crop.width).toBeLessThanOrEqual(100)
      expect(crop.y + crop.height).toBeLessThanOrEqual(100)
    })

    test('applyCrop sets cropMode to false', () => {
      useEditorStore.setState({ cropMode: true, cropRegion: { x: 10, y: 10, width: 50, height: 50 } })
      useEditorStore.getState().applyCrop()
      expect(useEditorStore.getState().cropMode).toBe(false)
      expect(useEditorStore.getState().cropRegion).toEqual({ x: 10, y: 10, width: 50, height: 50 })
    })

    test('clearCrop nullifies cropRegion and sets cropMode to false', () => {
      useEditorStore.setState({ cropMode: true, cropRegion: { x: 10, y: 10, width: 50, height: 50 } })
      useEditorStore.getState().clearCrop()
      expect(useEditorStore.getState().cropRegion).toBeNull()
      expect(useEditorStore.getState().cropMode).toBe(false)
    })

    test('resetAll clears cropRegion and cropMode', () => {
      useEditorStore.setState({
        cropMode: true,
        cropRegion: { x: 10, y: 10, width: 50, height: 50 },
        transforms: { rotation: 90, flipH: true, flipV: true },
      })
      useEditorStore.getState().resetAll()
      expect(useEditorStore.getState().cropRegion).toBeNull()
      expect(useEditorStore.getState().cropMode).toBe(false)
    })
  })

  describe('background removal', () => {
    const mockMask = { data: new Uint8ClampedArray(4), width: 1, height: 1 } as unknown as ImageData

    test('initial state has backgroundRemoved=false and backgroundMask=null', () => {
      const state = useEditorStore.getState()
      expect(state.backgroundRemoved).toBe(false)
      expect(state.backgroundMask).toBeNull()
    })

    test('setBackgroundMask sets backgroundMask and backgroundRemoved=true', () => {
      useEditorStore.getState().setBackgroundMask(mockMask)
      const state = useEditorStore.getState()
      expect(state.backgroundMask).toBe(mockMask)
      expect(state.backgroundRemoved).toBe(true)
    })

    test('clearBackgroundMask sets both to null/false', () => {
      useEditorStore.setState({ backgroundMask: mockMask, backgroundRemoved: true })
      useEditorStore.getState().clearBackgroundMask()
      const state = useEditorStore.getState()
      expect(state.backgroundMask).toBeNull()
      expect(state.backgroundRemoved).toBe(false)
    })

    test('toggleBackground flips backgroundRemoved without changing backgroundMask', () => {
      useEditorStore.setState({ backgroundMask: mockMask, backgroundRemoved: true })
      useEditorStore.getState().toggleBackground()
      const state = useEditorStore.getState()
      expect(state.backgroundRemoved).toBe(false)
      expect(state.backgroundMask).toBe(mockMask)
    })

    test('resetAll clears backgroundRemoved and backgroundMask', () => {
      useEditorStore.setState({ backgroundMask: mockMask, backgroundRemoved: true })
      useEditorStore.getState().resetAll()
      const state = useEditorStore.getState()
      expect(state.backgroundRemoved).toBe(false)
      expect(state.backgroundMask).toBeNull()
    })

    test('setImage clears backgroundRemoved and backgroundMask', () => {
      useEditorStore.setState({ backgroundMask: mockMask, backgroundRemoved: true })
      const mockBitmap = { close: () => {}, width: 100, height: 200 } as unknown as ImageBitmap
      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' })
      useEditorStore.getState().setImage(mockBitmap, mockFile, false)
      const state = useEditorStore.getState()
      expect(state.backgroundRemoved).toBe(false)
      expect(state.backgroundMask).toBeNull()
    })
  })

  describe('replacementColor', () => {
    const mockMask = { data: new Uint8ClampedArray(4), width: 1, height: 1 } as unknown as ImageData

    test('setReplacementColor sets replacementColor to a hex value', () => {
      useEditorStore.getState().setReplacementColor('#ff0000')
      expect(useEditorStore.getState().replacementColor).toBe('#ff0000')
    })

    test('setReplacementColor(null) clears replacementColor to null', () => {
      useEditorStore.setState({ replacementColor: '#ff0000' })
      useEditorStore.getState().setReplacementColor(null)
      expect(useEditorStore.getState().replacementColor).toBeNull()
    })

    test('clearBackgroundMask also resets replacementColor to null', () => {
      useEditorStore.setState({ replacementColor: '#00ff00', backgroundMask: mockMask, backgroundRemoved: true })
      useEditorStore.getState().clearBackgroundMask()
      expect(useEditorStore.getState().replacementColor).toBeNull()
    })

    test('setImage resets replacementColor to null', () => {
      useEditorStore.setState({ replacementColor: '#0000ff' })
      const mockBitmap = { close: () => {}, width: 100, height: 200 } as unknown as ImageBitmap
      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' })
      useEditorStore.getState().setImage(mockBitmap, mockFile, false)
      expect(useEditorStore.getState().replacementColor).toBeNull()
    })

    test('resetAll resets replacementColor to null', () => {
      useEditorStore.setState({ replacementColor: '#ffffff' })
      useEditorStore.getState().resetAll()
      expect(useEditorStore.getState().replacementColor).toBeNull()
    })
  })

  // applyResize background state clearing
  describe('applyResize background state clearing', () => {
    const mockMask = { data: new Uint8ClampedArray(4), width: 1, height: 1 } as unknown as ImageData

    test('applyResize clears backgroundRemoved, backgroundMask, and replacementColor after resize', async () => {
      // Mock createImageBitmap (browser API not available in jsdom) to return a minimal bitmap
      const mockResizedBitmap = { close: vi.fn(), width: 50, height: 50 } as unknown as ImageBitmap
      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockResizedBitmap))

      // Stub document.createElement so applyResize gets a working canvas mock.
      // renderToCanvas sets ctx.canvas.width/height, so canvas must be a writable object
      // referenced by ctx.canvas.
      const mockCanvasDims = { width: 0, height: 0 }
      const mockCtx = {
        canvas: mockCanvasDims,
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        drawImage: vi.fn(),
        putImageData: vi.fn(),
        fillRect: vi.fn(),
        fillStyle: '',
        filter: 'none',
        globalCompositeOperation: 'source-over',
      }
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => mockCtx),
      }
      vi.stubGlobal('document', {
        createElement: vi.fn(() => mockCanvas),
      })

      // Provide a source image so applyResize does not bail early
      const mockSourceBitmap = { close: vi.fn(), width: 100, height: 100 } as unknown as ImageBitmap
      useEditorStore.setState({
        sourceImage: mockSourceBitmap,
        backgroundRemoved: true,
        backgroundMask: mockMask,
        replacementColor: '#ff0000',
      })

      await useEditorStore.getState().applyResize(50, 50)

      const state = useEditorStore.getState()
      expect(state.backgroundRemoved).toBe(false)
      expect(state.backgroundMask).toBeNull()
      expect(state.replacementColor).toBeNull()

      vi.unstubAllGlobals()
    })
  })
})
