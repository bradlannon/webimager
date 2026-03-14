# Architecture: In-Browser Background Removal Integration

**Domain:** AI-powered background removal for existing Canvas 2D image editor
**Researched:** 2026-03-14
**Overall confidence:** HIGH

## Executive Summary

Background removal integrates into WebImager's existing non-destructive pipeline as an **alpha mask stored alongside the source image**, applied during rendering via Canvas 2D `globalCompositeOperation: 'destination-in'`. The mask is generated once by a Transformers.js model running in a Web Worker, cached in the Zustand store, and composited at render time after transforms/crop and before adjustments. This keeps the operation non-destructive (the user can toggle it on/off), avoids pixel-baking, and fits cleanly into the existing `renderToCanvas()` flow.

## Existing Pipeline (Current State)

```
sourceImage (ImageBitmap)
    |
    v
renderToCanvas(ctx, source, transforms, adjustments, crop)
    |
    +-- Step 1: rotation/flip transforms (ctx.rotate, ctx.scale)
    +-- Step 2: crop extraction (offscreen canvas when crop active)
    +-- Step 3: ctx.filter adjustments (brightness, contrast, saturation, greyscale)
    |
    v
  <canvas> display
```

State shape:
```
EditorStore {
  sourceImage: ImageBitmap
  transforms: { rotation, flipH, flipV }
  adjustments: { brightness, contrast, saturation, greyscale }
  cropRegion: CropRegion | null
  cropMode: boolean
}
```

## Proposed Pipeline (With Background Removal)

```
sourceImage (ImageBitmap)
    |
    v
renderToCanvas(ctx, source, transforms, adjustments, crop, alphaMask?)
    |
    +-- Step 1: rotation/flip transforms
    +-- Step 2: crop extraction
    +-- Step 3: alpha mask compositing  <-- NEW
    +-- Step 4: ctx.filter adjustments (second drawImage pass when mask active)
    |
    v
  <canvas> display (checkerboard CSS behind for transparency)
```

### Why This Order

The alpha mask must be applied **after** transforms and crop, **before** ctx.filter adjustments:

1. **After transforms**: The mask is generated from the source image at its original orientation. When the user rotates/flips, the mask must be rotated/flipped identically. By compositing the mask after the same rotation/flip transforms are applied to both source and mask, they stay aligned.

2. **After crop**: The crop extracts a region from the transformed image. The mask must be cropped to match. Applying the mask after crop means we only need to draw the relevant portion of the mask.

3. **Before adjustments**: `ctx.filter` applies when drawing, not retroactively. If we applied the mask after `ctx.filter`, the filter would have already drawn opaque pixels everywhere. The mask zeroes out alpha on background pixels, and then adjustments modify the remaining foreground colors.

### Alternative Considered: Pre-baking the mask into sourceImage

Creating a new ImageBitmap with transparent background pixels baked in. Rejected because:
- Destroys non-destructive editing (cannot un-remove the background)
- JPEG sources have no alpha channel; would require conversion
- Inconsistent with how all other edits work as render-time parameters

## New State Shape

```typescript
// In types/editor.ts - NEW
interface BackgroundRemoval {
  enabled: boolean;          // Toggle on/off without losing mask
  mask: ImageBitmap | null;  // Alpha mask at source image dimensions
  status: 'idle' | 'loading-model' | 'processing' | 'ready' | 'error';
  progress: number;          // 0-100, for model download + inference
  error: string | null;
}

// In EditorStore - additions
interface EditorStore {
  // ... existing fields ...
  backgroundRemoval: BackgroundRemoval;

  // New actions
  removeBackground: () => void;        // Triggers Web Worker inference
  toggleBackground: () => void;        // Toggles enabled on/off
  clearBackgroundRemoval: () => void;   // Removes mask entirely
}
```

The mask is stored as an `ImageBitmap` at the **same dimensions as sourceImage**. This means:
- It does not need to be regenerated when transforms change
- It can be drawn with identical rotation/flip/crop transforms
- It is invalidated only when `sourceImage` changes (new image, resize)

## Component Boundaries

| Component | Responsibility | Status |
|-----------|---------------|--------|
| `renderToCanvas()` in `utils/canvas.ts` | Composites alpha mask into render pipeline | MODIFIED |
| `useRenderPipeline.ts` | Subscribes to `backgroundRemoval.enabled` + `.mask` | MODIFIED |
| `BackgroundRemovalControls.tsx` | UI for remove/toggle/progress/status | NEW |
| `Sidebar.tsx` | Adds BackgroundRemovalControls section | MODIFIED |
| `bgRemovalWorker.ts` | Web Worker running Transformers.js inference | NEW |
| `useBgRemoval.ts` | Hook managing worker lifecycle and store updates | NEW |
| `editorStore.ts` | New state slice for backgroundRemoval | MODIFIED |
| `types/editor.ts` | New BackgroundRemoval interface | MODIFIED |
| `download.ts` | Already calls renderToCanvas; gets mask for free | MINOR CHANGE (JPEG fallback) |
| `Canvas.tsx` | Already uses checkerboard CSS class for transparency | UNCHANGED |

## Detailed Data Flow

### 1. User Clicks "Remove Background"

```
BackgroundRemovalControls (button click)
    |
    v
useBgRemoval hook
    |-- extracts pixel data from sourceImage via offscreen canvas
    |-- sets store status: 'loading-model'
    |-- posts ImageData buffer to Web Worker (transferable, zero-copy)
    |
    v
bgRemovalWorker.ts (Web Worker thread)
    |-- imports @huggingface/transformers (AutoModel, AutoProcessor, RawImage)
    |-- loads briaai/RMBG-1.4 model (cached after first download)
    |-- posts progress messages back to main thread
    |-- runs inference: pixel_values -> model -> output tensor
    |-- converts output tensor to single-channel mask (0-255)
    |-- posts mask ArrayBuffer back (transferable, zero-copy)
    |
    v
useBgRemoval hook (main thread)
    |-- receives mask ArrayBuffer from worker
    |-- converts single-channel mask to RGBA ImageBitmap (R=G=B=255, A=mask)
    |-- updates store: { mask: ImageBitmap, status: 'ready', enabled: true }
    |
    v
useRenderPipeline reacts to state change
    |-- passes mask to renderToCanvas()
    |-- canvas re-renders with transparent background
```

### 2. renderToCanvas with Mask (Modified Algorithm)

New signature:
```typescript
export function renderToCanvas(
  ctx: CanvasRenderingContext2D,
  source: ImageBitmap,
  transforms: Transforms,
  adjustments?: Adjustments,
  crop?: CropRegion,
  alphaMask?: ImageBitmap | null  // NEW parameter
): void
```

**No-crop path (modified):**
```
1. Set canvas size to rotated dimensions
2. ctx.save()
3. Apply rotation/flip transforms (translate, rotate, scale)
4. drawImage(source)  -- draws opaque image
5. IF alphaMask:
   a. globalCompositeOperation = 'destination-in'
   b. drawImage(alphaMask) with same transform offset  -- keeps only foreground
   c. globalCompositeOperation = 'source-over'  -- reset
6. ctx.restore()
7. IF adjustments AND alphaMask:
   a. Copy canvas to temp canvas
   b. clearRect on main canvas
   c. ctx.filter = buildFilterString(adjustments)
   d. drawImage(tempCanvas, 0, 0)  -- redraws with filter applied
8. IF adjustments AND NOT alphaMask:
   a. (existing path: filter was set before drawImage in step 4)
```

The extra canvas copy in step 7 only occurs when BOTH background removal AND adjustments are active. When neither is active, the existing fast path is untouched.

**Crop path (modified):**
```
1. Render source with rotation/flip to offscreen canvas (existing)
2. IF alphaMask:
   a. Apply mask to offscreen canvas via destination-in  -- NEW
3. Extract crop region from offscreen to output canvas (existing)
4. Apply ctx.filter adjustments (existing, but needs second-pass if mask active)
```

### 3. Mask as RGBA ImageBitmap

When the worker returns single-channel mask data (Uint8ClampedArray, one byte per pixel, 0=background, 255=foreground), the main thread converts it:

```typescript
function maskToImageBitmap(
  maskData: Uint8ClampedArray,
  width: number,
  height: number
): Promise<ImageBitmap> {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < maskData.length; i++) {
    rgba[i * 4]     = 255;          // R (white)
    rgba[i * 4 + 1] = 255;          // G
    rgba[i * 4 + 2] = 255;          // B
    rgba[i * 4 + 3] = maskData[i];  // A = mask value
  }
  return createImageBitmap(new ImageData(rgba, width, height));
}
```

This ImageBitmap is stored in the Zustand store and drawn with `globalCompositeOperation: 'destination-in'`, which retains destination pixels only where the mask has non-zero alpha.

## Web Worker Architecture

### Why a Web Worker

Transformers.js model inference takes 2-10 seconds depending on image size and device. Running on the main thread would freeze the UI completely. The Web Worker:

- Keeps the UI responsive during inference
- Allows progress reporting via postMessage
- Model stays loaded in worker memory for subsequent uses
- Worker can be terminated on component unmount

### Worker Implementation Pattern

```typescript
// src/workers/bgRemovalWorker.ts
import { AutoModel, AutoProcessor, RawImage, env } from '@huggingface/transformers';

env.backends.onnx.wasm.proxy = false; // We ARE the worker, no nested proxy

let model: Awaited<ReturnType<typeof AutoModel.from_pretrained>> | null = null;
let processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>> | null = null;

const MODEL_ID = 'briaai/RMBG-1.4';

self.onmessage = async (e: MessageEvent) => {
  const { type, imageData, width, height } = e.data;

  if (type === 'process') {
    try {
      if (!model || !processor) {
        self.postMessage({ type: 'progress', stage: 'loading-model', progress: 10 });
        model = await AutoModel.from_pretrained(MODEL_ID, { dtype: 'q8' });
        processor = await AutoProcessor.from_pretrained(MODEL_ID);
        self.postMessage({ type: 'progress', stage: 'model-ready', progress: 50 });
      }

      self.postMessage({ type: 'progress', stage: 'processing', progress: 60 });
      const img = new RawImage(new Uint8ClampedArray(imageData), width, height, 4);
      const { pixel_values } = await processor(img);
      const { output } = await model({ input: pixel_values });

      const maskRaw = await RawImage.fromTensor(
        output[0].mul(255).to('uint8')
      ).resize(width, height);

      self.postMessage({
        type: 'result',
        maskData: maskRaw.data.buffer,
        width,
        height,
      }, [maskRaw.data.buffer]); // Transfer, don't copy

    } catch (error) {
      self.postMessage({ type: 'error', message: String(error) });
    }
  }
};
```

### Vite Web Worker Integration

Vite supports Web Workers natively:
```typescript
const worker = new Worker(
  new URL('../workers/bgRemovalWorker.ts', import.meta.url),
  { type: 'module' }
);
```

Vite config may need to exclude transformers from dep optimization:
```typescript
// vite.config.ts
optimizeDeps: {
  exclude: ['@huggingface/transformers']
}
```

## Model Selection

**Recommendation: `briaai/RMBG-1.4` via `@huggingface/transformers`**

| Criterion | RMBG-1.4 (Transformers.js) | @imgly/background-removal | RMBG-2.0 |
|-----------|---------------------------|---------------------------|-----------|
| Browser support | Stable, well-tested | Stable | Broken (onnxruntime-web bug) |
| Model size (quantized) | ~45 MB (q8) | ~45 MB | 366 MB+ (too large) |
| License | CC non-commercial | AGPL | CC non-commercial |
| API flexibility | Full control (AutoModel) | High-level only | N/A |
| WebGPU acceleration | Yes (optional) | Yes | N/A |
| Ecosystem | Large, active community | Single vendor | Not viable in browser |

**Why RMBG-1.4:** Best quality-to-size ratio for browser use. The q8 quantized model is ~45MB, acceptable as a one-time download cached by the browser. RMBG-2.0 would be better quality but is not viable in-browser (onnxruntime-web compatibility issues and 366MB+ model size).

**Licensing note:** RMBG-1.4 uses a Creative Commons non-commercial license. WebImager is a free, non-commercial static site -- this is acceptable. If commercialization is needed, `Xenova/modnet` (MIT license) is the fallback with lower quality.

## Edge Cases

### Mask Invalidation Rules

| Event | Clear mask? | Reason |
|-------|-------------|--------|
| New image uploaded | Yes | Different image, mask is meaningless |
| Resize applied | Yes | applyResize creates new sourceImage |
| Rotation/flip | No | Same pixels, just transformed at render time |
| Crop change | No | Mask applied before crop extraction |
| Adjustment change | No | Mask is independent of color adjustments |
| Reset all | Yes | Returns to initial state |

### JPEG Download with Active Mask

JPEG has no alpha channel. When background removal is active and user downloads as JPEG, the transparent background must be composited onto white:

```typescript
// In download.ts
if (format === 'image/jpeg' && alphaMask) {
  // Fill white background first
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // Then render masked image on top (source-over compositing)
}
```

### First-Use Model Download (~45MB)

- Show progress bar during download (worker sends progress messages)
- Transformers.js caches model via Cache API; subsequent uses load instantly
- Consider showing estimated download size in UI before user initiates
- On slow connections, the download could take 10-30 seconds

### Memory Management

- Call `ImageBitmap.close()` on old mask when new mask is generated or image changes
- Terminate Web Worker on component unmount
- Model weights (~45MB) stay in worker memory; acceptable for single-page app
- Peak memory during inference: source pixels + model weights + intermediate tensors

## Build Order

Based on dependency analysis of the existing codebase:

| Step | What | Depends On | Complexity |
|------|------|------------|------------|
| 1 | `types/editor.ts` -- BackgroundRemoval interface | Nothing | Low |
| 2 | `store/editorStore.ts` -- backgroundRemoval state slice + actions | Step 1 | Medium |
| 3 | `workers/bgRemovalWorker.ts` -- Web Worker with Transformers.js | npm install | High |
| 4 | `hooks/useBgRemoval.ts` -- Worker lifecycle + store sync | Steps 2, 3 | Medium |
| 5 | `utils/canvas.ts` -- renderToCanvas mask compositing | Step 1 | Medium |
| 6 | `hooks/useRenderPipeline.ts` -- Subscribe to mask state | Steps 2, 5 | Low |
| 7 | `components/BackgroundRemovalControls.tsx` -- UI | Steps 2, 4 | Medium |
| 8 | `components/Sidebar.tsx` -- Add controls section | Step 7 | Low |
| 9 | `utils/download.ts` -- JPEG white-background fallback | Step 5 | Low |
| 10 | Tests -- mask compositing, worker communication | Steps 1-9 | Medium |

## Patterns to Follow

### Pattern 1: Non-Destructive Mask as Render Parameter
The mask follows the same pattern as transforms and adjustments -- a parameter passed to `renderToCanvas()`, not baked into the source image. Toggle on/off without re-running inference. Download gets mask compositing for free.

### Pattern 2: Web Worker for Heavy Computation
Worker loads model once, keeps it in memory. Pixel data sent via transferable ArrayBuffer (zero-copy). Progress reported via postMessage. Consistent with browser best practices for ML inference.

### Pattern 3: Store-Driven Reactivity
Zustand selectors trigger re-renders when mask or enabled state changes:
```typescript
const mask = useEditorStore((s) => s.backgroundRemoval.mask);
const enabled = useEditorStore((s) => s.backgroundRemoval.enabled);
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Running Inference on Main Thread
Transformers.js on the main thread freezes UI for 2-10 seconds. Always use a Web Worker.

### Anti-Pattern 2: Baking Mask into Source Image
Creating a new ImageBitmap with transparent pixels destroys non-destructive editing and is inconsistent with the existing architecture.

### Anti-Pattern 3: Re-Running Inference on Transform Changes
The mask maps 1:1 to source image pixels. Rotating or flipping does not change which pixels are foreground. Apply the same transforms to the mask at render time.

### Anti-Pattern 4: Storing Mask as Canvas or ImageData
Use `ImageBitmap` -- it is transferable, GPU-backed, closeable, and consistent with how `sourceImage` is stored.

## Sources

- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js/index) -- HIGH confidence
- [RMBG-1.4 Model Card](https://huggingface.co/briaai/RMBG-1.4) -- HIGH confidence
- [RMBG-2.0 Transformers.js compatibility issue](https://github.com/huggingface/transformers.js/issues/1107) -- HIGH confidence
- [Canvas globalCompositeOperation MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation) -- HIGH confidence
- [Addy Osmani's bg-remove (reference implementation)](https://github.com/addyosmani/bg-remove) -- MEDIUM confidence
- [LogRocket: Background remover with Vue and Transformers.js](https://blog.logrocket.com/building-background-remover-vue-transformers-js/) -- MEDIUM confidence
- [@imgly/background-removal npm](https://www.npmjs.com/package/@imgly/background-removal) -- HIGH confidence (evaluated, not recommended)
- [RMBG-2.0 ONNX model sizes](https://huggingface.co/briaai/RMBG-2.0/tree/main/onnx) -- HIGH confidence
- [Wes Bos bg-remover](https://github.com/wesbos/bg-remover) -- MEDIUM confidence (reference implementation)

---
*Architecture research for: in-browser AI background removal integration*
*Researched: 2026-03-14*
