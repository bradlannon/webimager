# Phase 4: Background Removal Engine - Research

**Researched:** 2026-03-14
**Domain:** In-browser AI background removal (Web Worker + transformers.js + canvas compositing)
**Confidence:** HIGH

## Summary

This phase implements one-click AI background removal using `@huggingface/transformers` (v3.x) with the `briaai/RMBG-1.4` model running entirely in-browser via a Web Worker. The model is ~45MB (quantized uint8 ONNX), downloaded on first use from Hugging Face CDN and cached in the browser. The worker performs inference off the main thread, returning an alpha mask that gets composited into the existing canvas rendering pipeline using `globalCompositeOperation = 'destination-in'`.

The architecture integrates with the existing non-destructive pipeline: the mask is stored at source image dimensions in the Zustand store, and `renderToCanvas()` applies it after transforms/crop/adjustments. The existing CSS `.checkerboard-bg` class on the canvas element already shows through transparent pixels, so no additional checkerboard rendering is needed for the basic case. A dark mode variant of the checkerboard CSS should be added.

**Primary recommendation:** Use `AutoModel.from_pretrained` with explicit processor config in a dedicated Web Worker file. Store the mask as `ImageData` at source dimensions. Composite mask in `renderToCanvas()` after all other operations using a temporary canvas with `destination-in`. Wire progress via `postMessage` from worker `progress_callback`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Own collapsible "Background" section in the sidebar (consistent with Adjustments, Crop, Resize sections)
- Single toggle button: shows "Remove Background" initially, changes to "Restore Background" after removal
- Button disabled during crop mode (consistent with how other controls behave during crop)
- "Reset All" clears background removal along with everything else (restores original background)
- Progress feedback appears inside the Background sidebar section (replaces the Remove button while processing)
- Two separate stages with labels: "Downloading model..." with progress bar, then "Removing background..." with progress bar
- Cancel button shown alongside progress bar during both download and inference
- Always show progress bar (even on subsequent uses when model is cached)
- Confirm before downloading: inline message with explanation + "Download & Continue" button
- Message includes privacy angle: "One-time ~45MB download. Runs entirely in your browser -- your photo never leaves your device."
- On subsequent uses (model cached), skip confirmation and go straight to inference
- On download failure: show error message with "Try Again" button (no auto-retry)
- Existing CSS checkerboard background is sufficient -- transparent areas show through naturally
- Checkerboard adapts to dark/light mode: light gray in light mode, darker variant in dark mode
- Mask always remains correct through all transforms (rotate, flip, crop, adjustments)
- Background removal works on any edit state -- mask stored at source dimensions, adapts to transforms

### Claude's Discretion
- Exact checkerboard colors for dark mode variant
- Button icon design (scissors, wand, eraser, etc.)
- Cancel button style and placement relative to progress bar
- How the sidebar section expands/collapses during progress states
- Loading/processing animation details

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BGREM-01 | User can remove image background with one click using in-browser AI model | @huggingface/transformers v3.x + briaai/RMBG-1.4 in Web Worker; AutoModel + AutoProcessor pattern documented below |
| BGREM-02 | User sees a progress bar during model download on first use (~45MB) | progress_callback in from_pretrained reports status: initiate/download/progress/done with loaded/total bytes |
| BGREM-03 | User sees a progress/loading indicator during background removal inference | Worker posts "inferring" status; inference is ~1-5 seconds so an indeterminate or pulsing progress bar is appropriate |
| BGREM-04 | Transparent areas display on checkerboard background | Existing `.checkerboard-bg` CSS class on canvas already handles this; add dark mode variant |
| BGREM-05 | User can restore the original background with one click | Store `backgroundRemoved: boolean` + `backgroundMask: ImageData | null` in Zustand; toggling flag skips mask compositing in renderToCanvas |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @huggingface/transformers | ^3.8 | In-browser ML inference (model loading, preprocessing, ONNX runtime) | De facto standard for client-side ML; handles model download, caching, ONNX execution, tensor ops |
| briaai/RMBG-1.4 | ONNX uint8 quantized | Background removal model (~45MB) | Best quality/size ratio for browser; well-tested with transformers.js; IS-Net architecture |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Web Workers API | Browser native | Off-main-thread inference | Always -- model loading and inference MUST run in worker to avoid UI freezing |
| Vite worker support | Built-in | Worker bundling with `new Worker(new URL(...), { type: 'module' })` | Worker file import pattern; handles both dev and production builds |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| RMBG-1.4 | MODNet (Xenova/modnet) | MODNet is smaller but lower quality on complex edges; RMBG-1.4 is the community standard |
| AutoModel (low-level) | pipeline("image-segmentation") | Pipeline is simpler but gives less control over progress and mask post-processing; AutoModel + AutoProcessor gives full control |
| @huggingface/transformers v3 | v4 (preview) | v4 has new WebGPU runtime but is still in preview (next tag); v3 is stable and sufficient |

**Installation:**
```bash
npm install @huggingface/transformers
```

No other new dependencies needed -- Web Workers, Canvas API, and ImageData are all browser-native.

## Architecture Patterns

### Recommended Project Structure
```
src/
  workers/
    backgroundRemoval.worker.ts    # Web Worker: model loading + inference
  hooks/
    useBackgroundRemoval.ts        # Hook: worker lifecycle, progress state, cancel
    useRenderPipeline.ts           # MODIFIED: add mask compositing step
  components/
    BackgroundControls.tsx         # Sidebar section: button, progress, confirm dialog
    Sidebar.tsx                    # MODIFIED: add Background collapsible section
  store/
    editorStore.ts                 # MODIFIED: add backgroundRemoved, backgroundMask fields
  types/
    editor.ts                     # MODIFIED: add background removal types
  utils/
    canvas.ts                     # MODIFIED: add mask compositing to renderToCanvas
```

### Pattern 1: Web Worker with Message Protocol
**What:** Typed message-passing between main thread and worker for model download, inference, progress, cancellation, and errors
**When to use:** Always -- the only communication channel with workers

```typescript
// Message types (shared between main thread and worker)
type WorkerInMessage =
  | { type: 'load-model' }
  | { type: 'run-inference'; imageData: ImageData }
  | { type: 'cancel' };

type WorkerOutMessage =
  | { type: 'download-progress'; progress: number; loaded: number; total: number }
  | { type: 'model-ready' }
  | { type: 'inference-start' }
  | { type: 'inference-complete'; maskData: ImageData }
  | { type: 'error'; message: string }
  | { type: 'cancelled' };
```

### Pattern 2: Worker Model Loading with Progress
**What:** Load RMBG-1.4 model inside worker using AutoModel + AutoProcessor with progress_callback
**When to use:** On first user confirmation ("Download & Continue")

```typescript
// Source: HuggingFace transformers.js docs + remove-background-web example
// Inside worker file:
import { env, AutoModel, AutoProcessor, RawImage } from '@huggingface/transformers';

// Disable local model check (browser-only)
env.allowLocalModels = false;

const MODEL_ID = 'briaai/RMBG-1.4';

let model: Awaited<ReturnType<typeof AutoModel.from_pretrained>> | null = null;
let processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>> | null = null;

async function loadModel() {
  model = await AutoModel.from_pretrained(MODEL_ID, {
    config: { model_type: 'custom' },
    progress_callback: (info: { status: string; progress?: number; loaded?: number; total?: number; file?: string }) => {
      if (info.status === 'progress' && info.progress !== undefined) {
        self.postMessage({
          type: 'download-progress',
          progress: info.progress,
          loaded: info.loaded ?? 0,
          total: info.total ?? 0,
        });
      }
    },
  });

  processor = await AutoProcessor.from_pretrained(MODEL_ID, {
    config: {
      do_normalize: true,
      do_pad: false,
      do_rescale: true,
      do_resize: true,
      image_mean: [0.5, 0.5, 0.5],
      image_std: [1, 1, 1],
      feature_extractor_type: 'ImageFeatureExtractor',
      resample: 2,
      rescale_factor: 0.00392156862745098,  // 1/255
      size: { width: 1024, height: 1024 },
    },
  });

  self.postMessage({ type: 'model-ready' });
}
```

### Pattern 3: Inference and Mask Generation
**What:** Process image through model, get alpha mask, return as ImageData
**When to use:** Each time "Remove Background" is clicked

```typescript
// Inside worker, after model is loaded:
async function runInference(imageData: ImageData) {
  if (!model || !processor) throw new Error('Model not loaded');

  self.postMessage({ type: 'inference-start' });

  // Convert ImageData to RawImage
  const image = new RawImage(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
    4  // channels (RGBA)
  );

  // Preprocess
  const { pixel_values } = await processor(image);

  // Run inference
  const { output } = await model({ input: pixel_values });

  // Convert output tensor to mask, resize to original dimensions
  const mask = await RawImage.fromTensor(
    output[0].mul(255).to('uint8')
  ).resize(imageData.width, imageData.height);

  // Create ImageData with mask as alpha channel
  const maskImageData = new ImageData(imageData.width, imageData.height);
  const maskPixels = mask.data; // grayscale, 1 channel
  for (let i = 0; i < maskPixels.length; i++) {
    // Set all RGB to white, alpha from mask
    maskImageData.data[i * 4] = 255;     // R
    maskImageData.data[i * 4 + 1] = 255; // G
    maskImageData.data[i * 4 + 2] = 255; // B
    maskImageData.data[i * 4 + 3] = maskPixels[i]; // A from mask
  }

  self.postMessage(
    { type: 'inference-complete', maskData: maskImageData },
    // Transfer the underlying buffer for zero-copy
    [maskImageData.data.buffer]
  );
}
```

### Pattern 4: Mask Compositing in Render Pipeline
**What:** Apply the alpha mask to the rendered image using globalCompositeOperation
**When to use:** During every renderToCanvas call when backgroundRemoved is true

```typescript
// In renderToCanvas, AFTER drawing the image with transforms + adjustments + crop:
// The key insight: apply mask AFTER ctx.filter to avoid premultiplied alpha fringing

function applyBackgroundMask(
  ctx: CanvasRenderingContext2D,
  mask: ImageData,
  transforms: Transforms,
  crop?: CropRegion
) {
  // Create a temporary canvas with just the mask, transformed identically
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = ctx.canvas.width;
  maskCanvas.height = ctx.canvas.height;
  const maskCtx = maskCanvas.getContext('2d')!;

  // The mask is at source dimensions -- we need to transform it
  // identically to how the source image was transformed
  // (This follows the same transform logic as renderToCanvas)
  // ... apply same rotation, flip, crop transforms to mask ...

  // Then composite: keep only pixels where mask has alpha
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(maskCanvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over'; // Reset
}
```

### Pattern 5: Vite Web Worker Import
**What:** Import worker file using Vite's native Web Worker support
**When to use:** When creating the worker instance

```typescript
// In useBackgroundRemoval.ts hook:
const workerRef = useRef<Worker | null>(null);

// Create worker using Vite's native worker support
// The new URL() + import.meta.url pattern is required for Vite to bundle the worker
const worker = new Worker(
  new URL('../workers/backgroundRemoval.worker.ts', import.meta.url),
  { type: 'module' }
);
workerRef.current = worker;
```

### Anti-Patterns to Avoid
- **Running inference on main thread:** Model inference takes 1-5 seconds and will freeze the UI completely. ALWAYS use a Web Worker.
- **Applying ctx.filter after mask compositing:** Causes premultiplied alpha fringing (dark halos around edges). Apply filters BEFORE the destination-in mask step.
- **Storing mask at display dimensions:** The mask must be at source dimensions so it remains correct through transforms. Store once, transform at render time.
- **Using `?worker` import syntax:** While simpler, the `new URL()` constructor pattern is more explicit and better supported across Vite versions.
- **Not using transferable objects:** When posting ImageData between worker and main thread, transfer the underlying ArrayBuffer for zero-copy performance: `postMessage(msg, [imageData.data.buffer])`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ML inference runtime | Custom ONNX loading/execution | @huggingface/transformers | Handles ONNX session, tensor ops, model caching, WebAssembly backend |
| Image preprocessing | Manual resize/normalize/pad | AutoProcessor with config | The processor config (normalization, resize to 1024x1024, rescale) must exactly match training params |
| Model download + caching | Custom fetch + IndexedDB cache | transformers.js built-in caching | Library handles Cache API storage, CDN fetching, progress reporting |
| Tensor to image conversion | Manual array manipulation | RawImage.fromTensor() | Handles channel/dimension reordering, dtype conversion |
| Image resizing (mask) | Canvas-based resize | RawImage.resize() | Bilinear interpolation on raw pixel data, works in worker (no canvas needed) |

**Key insight:** The entire ML pipeline (download, cache, preprocess, infer, postprocess) is handled by `@huggingface/transformers`. The only custom code needed is the worker message protocol, the mask compositing into the canvas pipeline, and the UI state management.

## Common Pitfalls

### Pitfall 1: Premultiplied Alpha Fringing
**What goes wrong:** Dark halos appear around the edges of the subject after background removal, especially visible on light backgrounds
**Why it happens:** When `ctx.filter` (brightness, contrast, etc.) is applied after the `destination-in` mask compositing, the browser multiplies the alpha into the color channels, creating fringing artifacts
**How to avoid:** Apply `ctx.filter` BEFORE the mask compositing step. The render pipeline order must be: draw image -> apply filter -> apply mask (destination-in)
**Warning signs:** Visible dark edge outlines when adjustments are applied to a background-removed image

### Pitfall 2: Worker Not Bundled Correctly
**What goes wrong:** Worker file not found in production, or imports don't resolve
**Why it happens:** Vite needs the `new URL('./worker.ts', import.meta.url)` pattern to detect and bundle workers. Dynamic paths or variables break detection.
**How to avoid:** Use the exact static pattern: `new Worker(new URL('../workers/file.ts', import.meta.url), { type: 'module' })`. Both the URL constructor and Worker constructor must be in the same expression.
**Warning signs:** 404 errors in production for worker file; worker works in dev but fails in build

### Pitfall 3: Memory Leaks from Unclosed Workers
**What goes wrong:** Memory grows with each background removal operation
**Why it happens:** Workers persist after use, model stays in memory, ImageData buffers accumulate
**How to avoid:** Keep a single worker instance alive (model stays loaded); transfer ArrayBuffers instead of copying; clean up worker on component unmount
**Warning signs:** Increasing memory usage in DevTools after repeated operations

### Pitfall 4: Mask/Image Dimension Mismatch After Transforms
**What goes wrong:** Mask doesn't align with image after rotation or flip
**Why it happens:** Mask is stored at source dimensions but rendered image has been rotated/flipped/cropped
**How to avoid:** Apply the EXACT same transform pipeline to the mask as to the source image in renderToCanvas. The mask must go through identical rotation, flip, and crop operations.
**Warning signs:** Mask shifted or rotated incorrectly after applying transforms

### Pitfall 5: Model Download Blocks Worker
**What goes wrong:** Cannot cancel model download once started
**Why it happens:** `from_pretrained` is a single async call; there's no built-in abort mechanism
**How to avoid:** For cancellation during download, terminate the worker entirely and create a new one. For cancellation during inference, use an AbortController if supported, or accept that inference (~1-5 sec) cannot be interrupted and only cancel the result handling.
**Warning signs:** Cancel button does nothing during download

### Pitfall 6: Processor Config Mismatch
**What goes wrong:** Model produces garbage output or very poor quality masks
**Why it happens:** The AutoProcessor config must exactly match the model's training preprocessing (normalization mean/std, resize dimensions, rescale factor)
**How to avoid:** Use the exact config from the official example: `image_mean: [0.5, 0.5, 0.5]`, `image_std: [1, 1, 1]`, `size: { width: 1024, height: 1024 }`, `rescale_factor: 0.00392156862745098`
**Warning signs:** All-black or all-white masks, distorted mask shapes

## Code Examples

### Complete Worker File Structure
```typescript
// src/workers/backgroundRemoval.worker.ts
// Source: HuggingFace remove-background-web example + official docs

import {
  env,
  AutoModel,
  AutoProcessor,
  RawImage,
} from '@huggingface/transformers';

env.allowLocalModels = false;

const MODEL_ID = 'briaai/RMBG-1.4';

let model: any = null;
let processor: any = null;

self.onmessage = async (e: MessageEvent) => {
  const { type } = e.data;

  try {
    switch (type) {
      case 'load-model':
        await loadModel();
        break;
      case 'run-inference':
        await runInference(e.data.imageData);
        break;
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

async function loadModel() {
  model = await AutoModel.from_pretrained(MODEL_ID, {
    config: { model_type: 'custom' },
    progress_callback: (info: any) => {
      if (info.status === 'progress') {
        self.postMessage({
          type: 'download-progress',
          progress: info.progress ?? 0,
          loaded: info.loaded ?? 0,
          total: info.total ?? 0,
        });
      }
    },
  });

  processor = await AutoProcessor.from_pretrained(MODEL_ID, {
    config: {
      do_normalize: true,
      do_pad: false,
      do_rescale: true,
      do_resize: true,
      image_mean: [0.5, 0.5, 0.5],
      image_std: [1, 1, 1],
      feature_extractor_type: 'ImageFeatureExtractor',
      resample: 2,
      rescale_factor: 0.00392156862745098,
      size: { width: 1024, height: 1024 },
    },
  });

  self.postMessage({ type: 'model-ready' });
}

async function runInference(imageData: ImageData) {
  if (!model || !processor) throw new Error('Model not loaded');

  self.postMessage({ type: 'inference-start' });

  const image = new RawImage(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
    4
  );

  const { pixel_values } = await processor(image);
  const { output } = await model({ input: pixel_values });

  const mask = await RawImage.fromTensor(
    output[0].mul(255).to('uint8')
  ).resize(imageData.width, imageData.height);

  // Build RGBA ImageData from grayscale mask
  const resultData = new ImageData(imageData.width, imageData.height);
  for (let i = 0; i < mask.data.length; i++) {
    resultData.data[i * 4] = 255;
    resultData.data[i * 4 + 1] = 255;
    resultData.data[i * 4 + 2] = 255;
    resultData.data[i * 4 + 3] = mask.data[i];
  }

  self.postMessage(
    { type: 'inference-complete', maskData: resultData },
    [resultData.data.buffer]
  );
}
```

### Sending Source Image to Worker
```typescript
// Main thread: extract source image pixels and send to worker
// Must render source at its native dimensions to get pixel data
function getSourceImageData(source: ImageBitmap): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0);
  return ctx.getImageData(0, 0, source.width, source.height);
}

// Send to worker with transferable
const imageData = getSourceImageData(sourceImage);
worker.postMessage(
  { type: 'run-inference', imageData },
  [imageData.data.buffer]
);
```

### Zustand Store Extension
```typescript
// Add to EditorStore interface:
backgroundRemoved: boolean;
backgroundMask: ImageData | null;

// Add actions:
setBackgroundMask: (mask: ImageData) => void;
clearBackgroundMask: () => void;
toggleBackground: () => void;

// Implementation:
backgroundRemoved: false,
backgroundMask: null,

setBackgroundMask: (mask) => set({ backgroundMask: mask, backgroundRemoved: true }),
clearBackgroundMask: () => set({ backgroundMask: null, backgroundRemoved: false }),
toggleBackground: () => set((s) => ({ backgroundRemoved: !s.backgroundRemoved })),

// Extend resetAll:
resetAll: () => set({
  transforms: { ...defaultTransforms },
  adjustments: { ...defaultAdjustments },
  cropRegion: null,
  cropMode: false,
  cropAspectRatio: null,
  backgroundRemoved: false,
  backgroundMask: null,
}),

// Extend setImage (clear mask when new image loaded):
setImage: (bitmap, file, wasDownscaled) => {
  // ... existing code ...
  set({ /* existing fields */, backgroundRemoved: false, backgroundMask: null });
},
```

### Dark Mode Checkerboard CSS
```css
/* Add to index.css alongside existing .checkerboard-bg */
@media (prefers-color-scheme: dark) {
  .checkerboard-bg {
    background-image:
      linear-gradient(45deg, #404040 25%, transparent 25%),
      linear-gradient(-45deg, #404040 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #404040 75%),
      linear-gradient(-45deg, transparent 75%, #404040 75%);
    background-color: #333333;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pipeline API for background removal | AutoModel + AutoProcessor (low-level) | transformers.js v3 | More control over progress, preprocessing config, and output handling |
| importScripts() in workers | ESM imports in module workers | Widespread browser support ~2023 | Workers can import npm packages directly; Vite bundles them |
| Copy ArrayBuffer in postMessage | Transfer ArrayBuffer | Always available, underused | Zero-copy data transfer between threads; critical for large images |
| transformers.js v2 (Xenova/) | v3 (@huggingface/) | 2024 | New package scope, WebGPU support, better typing |

**Deprecated/outdated:**
- `Xenova/` model namespace: models have been migrated to `onnx-community/` or maintained under original orgs like `briaai/`
- `pipeline("image-segmentation")`: Works but gives less control; AutoModel is preferred for custom progress and mask handling

## Open Questions

1. **RawImage constructor signature in v3**
   - What we know: The example code uses `new RawImage(data, width, height, channels)` -- this is from the official remove-background-web example
   - What's unclear: The exact TypeScript types for RawImage constructor may need casting; the library's TS definitions may not perfectly match runtime behavior
   - Recommendation: Use `any` types for model/processor variables initially; add specific types once working

2. **Model caching detection**
   - What we know: transformers.js uses the Cache API to store downloaded model files
   - What's unclear: How to reliably detect if the model is already cached (to skip the first-use confirmation)
   - Recommendation: Try loading with a short timeout or check Cache API directly; alternatively, store a flag in localStorage after first successful download

3. **Cancel during inference**
   - What we know: There's no built-in abort for ONNX inference once started
   - What's unclear: Whether terminating the worker mid-inference causes issues with cache corruption
   - Recommendation: For download cancellation, terminate worker + create new one. For inference cancellation (~1-5 sec), just discard the result when it arrives rather than terminating.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x with jsdom |
| Config file | vite.config.ts (vitest reads from this) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BGREM-01 | Store accepts mask, toggles backgroundRemoved state | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "background"` | No - Wave 0 |
| BGREM-01 | Worker message protocol sends/receives correct types | unit | `npx vitest run src/__tests__/backgroundRemoval.test.ts` | No - Wave 0 |
| BGREM-02 | Progress callback values propagate to hook state | unit | `npx vitest run src/__tests__/backgroundRemoval.test.ts -t "progress"` | No - Wave 0 |
| BGREM-03 | Inference status updates propagate to hook state | unit | `npx vitest run src/__tests__/backgroundRemoval.test.ts -t "inference"` | No - Wave 0 |
| BGREM-04 | Dark mode checkerboard CSS exists | unit | `npx vitest run src/__tests__/components.test.tsx -t "checkerboard"` | No - Wave 0 |
| BGREM-05 | toggleBackground flips backgroundRemoved; resetAll clears mask | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "background"` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/editorStore.test.ts` -- extend with background removal state tests (backgroundRemoved, backgroundMask, toggleBackground, clearBackgroundMask, resetAll clears mask)
- [ ] `src/__tests__/backgroundRemoval.test.ts` -- new file for worker message protocol unit tests (mock Worker, verify message types/payloads)
- [ ] Worker tests will need to mock `@huggingface/transformers` since actual model loading requires network

## Sources

### Primary (HIGH confidence)
- [HuggingFace transformers.js official docs - hub/PretrainedOptions](https://huggingface.co/docs/transformers.js/en/api/utils/hub) - progress_callback interface, from_pretrained options
- [HuggingFace transformers.js official docs - models API](https://huggingface.co/docs/transformers.js/en/api/models) - AutoModel, AutoModelForImageSegmentation
- [HuggingFace remove-background-web example](https://github.com/huggingface/transformers.js-examples/tree/main/remove-background-web) - Complete working implementation with AutoModel + AutoProcessor + RawImage for RMBG-1.4
- [briaai/RMBG-1.4 model card](https://huggingface.co/briaai/RMBG-1.4) - Model architecture, config requirements
- [Vite Web Workers documentation](https://vite.dev/guide/features) - Worker import patterns, module worker support
- [MDN globalCompositeOperation](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation) - destination-in compositing behavior

### Secondary (MEDIUM confidence)
- [transformers.js GitHub issue #1312](https://github.com/huggingface/transformers.js/issues/1312) - ProgressInfo TypeScript types: union type with status: initiate/download/progress/done/ready
- [transformers.js GitHub issue #1401](https://github.com/huggingface/transformers.js/issues/1401) - progress_callback data structure: {file, loaded, name, progress, status, total}
- [@huggingface/transformers npm](https://www.npmjs.com/package/@huggingface/transformers) - Latest stable version v3.8.1
- [transformers.js v3 announcement](https://huggingface.co/blog/transformersjs-v3) - v3 architecture, WebGPU support, new package scope

### Tertiary (LOW confidence)
- [Transformers.js v4 preview](https://huggingface.co/blog/transformersjs-v4) - v4 in preview as of Feb 2026; not recommended for production yet

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - RMBG-1.4 with transformers.js v3 is well-documented and widely used for this exact use case
- Architecture: HIGH - Web Worker + message protocol is the only viable pattern for non-blocking ML inference; canvas compositing with destination-in is well-established
- Pitfalls: HIGH - Premultiplied alpha fringing and worker bundling issues are well-documented in the community
- Code examples: MEDIUM - Based on official HuggingFace example code, but some TypeScript types may need adjustment at implementation time

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable ecosystem, no breaking changes expected in v3.x)
