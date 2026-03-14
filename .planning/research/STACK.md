# Technology Stack: Background Removal Addition

**Project:** WebImager v2.0 -- AI Background Removal
**Researched:** 2026-03-14
**Scope:** New dependencies only (existing stack validated in v1.0)

## Recommended Stack Addition

### Core ML Library

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `@huggingface/transformers` | ^3.8.1 | ML inference runtime for browser | The de facto standard for running ML models in-browser. Handles ONNX model loading, WASM/WebGPU execution, and provides a high-level `pipeline()` API. Published under the official HuggingFace org (replaces the deprecated `@xenova/transformers`). WebGPU acceleration when available, WASM fallback for all browsers. No separate `onnxruntime-web` install needed -- it is bundled. MIT licensed. | HIGH |

### Model

| Model | Size (quantized) | Purpose | Why | Confidence |
|-------|-------------------|---------|-----|------------|
| `briaai/RMBG-1.4` (uint8) | ~45 MB | Background segmentation mask | Best browser-compatible background removal model available. RMBG-2.0 exists and has better accuracy (90% vs 74%) but is NOT supported in-browser -- blocked by an onnxruntime-web bug (microsoft/onnxruntime#21968) and produces "Unsupported model type" errors in transformers.js (huggingface/transformers.js#1107). RMBG-1.4 quantized (uint8) delivers excellent quality at ~45 MB, well within acceptable range for a one-time lazy download. Handles arbitrary subjects (products, animals, objects, people). | HIGH |

### No Additional Libraries Needed

The existing stack handles everything else:

| Concern | Existing Solution | Notes |
|---------|-------------------|-------|
| State management | Zustand (v5.0.11, already installed) | Add `backgroundMask`, loading/error states to `EditorStore` |
| Image compositing | Canvas 2D API (already used) | Apply alpha mask via `globalCompositeOperation = 'destination-in'` |
| Transparency display | `drawCheckerboard()` (already in `canvas.ts`) | Checkerboard already renders behind transparent areas |
| Download as PNG | Download util (already implemented) | PNG preserves transparency automatically |
| UI framework | React 19 + Tailwind v4 (already installed) | One new button/panel component |
| Build tooling | Vite 6.x (already installed) | Needs minor config additions (see below) |
| Icons | lucide-react (already installed) | Has suitable icons for background removal UI |

## Vite Configuration Changes Required

The existing `vite.config.ts` needs two additions for ONNX/WASM compatibility:

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  worker: {
    format: 'es',
  },
});
```

**Why these changes:**
- `optimizeDeps.exclude`: Vite's dependency pre-bundling attempts to parse WASM imports inside `@huggingface/transformers` and fails. Excluding it lets the browser handle WASM loading natively. This is a well-documented requirement across multiple sources.
- `worker.format: 'es'`: The background removal worker uses dynamic `import()` to load the transformers library lazily; this requires ES module format in workers.

## Architecture Integration Points

### Web Worker (critical -- do not skip)

Background removal MUST run in a Web Worker. The RMBG-1.4 model inference takes 2-10 seconds depending on image size and device hardware. Running on the main thread would freeze the entire UI.

**Pattern:** Create `src/workers/backgroundRemoval.worker.ts` that:
1. Receives image data via `postMessage` (as `ImageBitmap` -- transferable, zero-copy)
2. Loads the model on first call via `pipeline('image-segmentation', 'briaai/RMBG-1.4')` (lazy init)
3. Caches the pipeline instance for subsequent calls (model stays in memory)
4. Returns the alpha mask as `ImageData` or `ImageBitmap` via `postMessage`
5. Reports download progress events back to main thread for progress bar

Vite supports `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })` natively -- no extra plugins needed.

### Canvas Pipeline Integration

The mask from the model integrates into the existing `renderToCanvas()` in `src/utils/canvas.ts`:

1. Model produces a segmentation mask (grayscale image where white = foreground)
2. Store the mask as an `ImageBitmap` in Zustand state (new `backgroundMask` field)
3. In `renderToCanvas()`, after drawing the image with transforms/adjustments, apply the mask:
   ```typescript
   if (backgroundMask) {
     ctx.globalCompositeOperation = 'destination-in';
     ctx.drawImage(backgroundMask, 0, 0, ctx.canvas.width, ctx.canvas.height);
     ctx.globalCompositeOperation = 'source-over';
   }
   ```
4. The existing `drawCheckerboard()` function handles transparency display
5. Mask must be regenerated if user applies transforms/crop AFTER background removal

### Store Additions

Add to `EditorStore` interface (in `src/store/editorStore.ts`):
```typescript
// Background removal state
backgroundMask: ImageBitmap | null;
isRemovingBackground: boolean;
backgroundRemovalProgress: number;       // 0-100 for model download
backgroundRemovalError: string | null;

// Background removal actions
removeBackground: () => Promise<void>;
restoreBackground: () => void;
```

This follows the existing pattern of state + actions in the same store (matches `cropMode`, `cropRegion`, etc.).

## Model Loading Strategy

| Concern | Approach |
|---------|----------|
| **When to download** | Lazy -- only when user clicks "Remove Background" for the first time |
| **Model caching** | Browser Cache API via transformers.js built-in caching. Model downloads once from HuggingFace CDN, persists across browser sessions automatically |
| **Progress feedback** | Transformers.js emits download progress callbacks; wire to `backgroundRemovalProgress` in store for a progress bar |
| **Execution backend** | WebGPU if available (2-5x faster), automatic WASM fallback (works everywhere). Transformers.js handles detection and selection automatically |
| **Pipeline caching** | Keep the `pipeline()` instance alive in the worker after first creation. Subsequent removals on new images skip model loading entirely |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ML runtime | `@huggingface/transformers` | `@imgly/background-removal` (v1.7.0) | AGPL license (viral, incompatible with many projects). Community reports of slower performance. Wraps the same underlying ONNX models with less control over the pipeline. Larger bundle due to bundled model variants. |
| ML runtime | `@huggingface/transformers` | Raw `onnxruntime-web` | Too low-level. Would need to manually handle model downloading, caching, image preprocessing, postprocessing, and tensor management. Transformers.js wraps all of this with a clean `pipeline()` API. |
| Model | RMBG-1.4 (quantized) | RMBG-2.0 | Better quality but blocked from in-browser execution. ONNX files are 366 MB+ (quantized) vs 45 MB. Not viable for browser use as of March 2026. |
| Model | RMBG-1.4 | ModNet | ModNet only handles human/portrait segmentation well. RMBG-1.4 handles arbitrary subjects, which is essential for a general-purpose image editor. |
| Execution | Web Worker | Main thread | Model inference takes 2-10s. Main thread execution would freeze the entire UI. |
| Execution | Web Worker | SharedArrayBuffer | Requires COOP/COEP headers (`Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`), which complicates static site deployment on GitHub Pages and some CDNs. Standard Web Worker with transferable `ImageBitmap` is simpler and sufficient. |
| Worker comms | Raw `postMessage` | Comlink | The worker interface is trivially simple (send image, receive mask). Comlink's RPC abstraction adds a dependency for no benefit here. |

## What NOT to Add

| Library | Why Not |
|---------|---------|
| `onnxruntime-web` (direct) | Already bundled inside `@huggingface/transformers`. Adding separately causes version conflicts. |
| `@imgly/background-removal` | AGPL license, slower, wraps the same models with less control. |
| `@xenova/transformers` | Deprecated v2 package name. The same library is now published as `@huggingface/transformers` (v3+). |
| `comlink` | Worker communication is too simple to justify an abstraction library. |
| TensorFlow.js | Heavier runtime (~1.5 MB), worse model ecosystem for image segmentation, no advantage over ONNX for this task. |
| Any background removal API/server | Violates the core "client-side only, no server calls" constraint. |
| `fabric.js` / `konva.js` | Not needed. The existing Canvas 2D API with `globalCompositeOperation` handles mask compositing directly. |

## Installation

```bash
# Single new dependency
npm install @huggingface/transformers
```

One dependency. That is it.

## Hosting / Deployment Impact

The RMBG-1.4 model files (~45 MB quantized) are fetched from HuggingFace's CDN by default. This means:
- **Zero impact on bundle size** -- model is not bundled, it is fetched at runtime on first use
- **Zero deployment config changes** -- works on GitHub Pages, Netlify, Vercel as-is
- **Automatic caching** -- browser caches model files across sessions via Cache API
- **Self-hosting option** -- if offline support is desired later, copy model files to `/public/models/` and set `env.localModelPath`

## Browser Compatibility

| Browser | WASM (baseline) | WebGPU (accelerated) |
|---------|-----------------|---------------------|
| Chrome 113+ | Yes | Yes |
| Edge 113+ | Yes | Yes |
| Firefox 120+ | Yes | Behind flag |
| Safari 16.4+ | Yes | No (as of March 2026) |

All target browsers in the project constraints support WASM. WebGPU provides 2-5x speedup where available but is not required for functionality.

## Sources

- [Transformers.js v3 announcement](https://huggingface.co/blog/transformersjs-v3) -- WebGPU support, `@huggingface/transformers` package name
- [Transformers.js v4 preview](https://huggingface.co/blog/transformersjs-v4) -- Upcoming version, not yet stable (use v3)
- [@huggingface/transformers on npm](https://www.npmjs.com/package/@huggingface/transformers) -- v3.8.1, latest stable
- [RMBG-1.4 on HuggingFace](https://huggingface.co/briaai/RMBG-1.4) -- Model card, ONNX weights, quantization details
- [RMBG-2.0 browser blocker](https://huggingface.co/briaai/RMBG-2.0/discussions/12) -- transformers.js support discussion
- [RMBG-2.0 onnxruntime-web bug](https://github.com/microsoft/onnxruntime/issues/21968) -- Browser execution blocked
- [RMBG-2.0 unsupported model type](https://github.com/huggingface/transformers.js/issues/1107) -- transformers.js integration error
- [Addy Osmani's bg-remove](https://github.com/addyosmani/bg-remove) -- Reference React + transformers.js implementation
- [Wes Bos bg-remover](https://github.com/wesbos/bg-remover) -- Another reference implementation
- [Optimizing Transformers.js for Production](https://www.sitepoint.com/optimizing-transformers-js-production/) -- Vite config patterns, `optimizeDeps.exclude`
- [Transformers.js dtypes guide](https://huggingface.co/docs/transformers.js/en/guides/dtypes) -- Quantization options (uint8, fp16, etc.)
- [@imgly/background-removal on npm](https://www.npmjs.com/package/@imgly/background-removal) -- v1.7.0, AGPL license
- [BRIA RMBG-2.0 benchmarks](https://blog.bria.ai/benchmarking-blog/brias-new-state-of-the-art-remove-background-2.0-outperforms-the-competition) -- 90% vs 74% accuracy comparison
