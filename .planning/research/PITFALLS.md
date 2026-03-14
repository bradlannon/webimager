# Pitfalls Research

**Domain:** In-browser AI background removal added to existing canvas-based image editor
**Researched:** 2026-03-14
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: JPEG Export Destroys Transparency (Black/White Background Instead of Transparent)

**What goes wrong:**
After removing the background, the canvas contains pixels with alpha=0 (transparent). The user downloads as JPEG -- which does not support alpha channels -- and gets a black or white background instead of the transparent result they expected. The current DownloadPanel defaults to JPEG format, so this will bite most users immediately.

**Why it happens:**
The existing download pipeline (`downloadImage` in `utils/download.ts`) passes the format directly to `canvas.toBlob()`. JPEG encoding flattens alpha to opaque, and browsers fill transparent regions with black by default. The current code has no awareness of whether the image contains transparency.

**How to avoid:**
- When background removal is active, auto-switch the download format to PNG and disable or warn on JPEG selection
- If the user insists on JPEG, composite the transparent image onto a white canvas before encoding (`ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h)` before `drawImage`)
- Add a `hasTransparency` flag to the editor store that tracks whether background removal has been applied
- Update the DownloadPanel to show a warning: "JPEG does not support transparency. Transparent areas will appear white."

**Warning signs:**
- DownloadPanel defaults to JPEG with no format intelligence
- No store state tracking whether the image has transparency
- No pre-fill of white background before JPEG export
- Users reporting "black background" on downloaded images

**Phase to address:**
Export/download integration phase. Must be implemented alongside or immediately after the background removal feature, not deferred.

---

### Pitfall 2: ML Inference Blocks the Main Thread, Freezing the UI for 5-30 Seconds

**What goes wrong:**
Running the segmentation model (RMBG-1.4 or similar, ~40M parameters) on the main thread freezes the entire browser tab. The user clicks "Remove Background," the UI becomes completely unresponsive for 5-30 seconds depending on image size and device. No spinner, no progress, no cancel. On mobile, the browser may show "Page Unresponsive" and offer to kill the tab.

**Why it happens:**
The simplest Transformers.js integration runs `pipeline('image-segmentation', model)` directly in the component or an async function. While the model inference is technically asynchronous at the ONNX level, the WASM execution still heavily blocks the main thread. Developers see `await` and assume it is non-blocking -- it is not.

**How to avoid:**
- Run ALL model loading and inference inside a dedicated Web Worker
- Use `postMessage` with transferable objects (`ImageData.data.buffer`) to avoid copying pixel data between threads
- Set `env.backends.onnx.wasm.proxy = true` in Transformers.js to proxy WASM execution to a worker thread automatically
- Show an immediate loading state with a progress indicator before inference starts
- Consider a cancel mechanism (terminate the worker and spawn a new one)

**Warning signs:**
- No Web Worker file in the project
- Model inference called directly in React components or Zustand actions
- No loading/progress UI for background removal
- `env.backends.onnx.wasm.proxy` not set to `true`

**Phase to address:**
Core architecture phase -- the worker infrastructure must be designed before integrating the model. Retrofitting a worker around a main-thread implementation is a near-total rewrite of the integration code.

---

### Pitfall 3: Model Download is 30-90MB and Has No Progress Feedback or Caching Strategy

**What goes wrong:**
The ONNX model file for background removal is typically 30-90MB (RMBG-1.4 quantized is ~30MB, full precision ~90MB). On first use, this downloads with no progress indication. The user clicks "Remove Background," waits 10-45 seconds with no feedback, thinks the app is broken, and closes the tab -- aborting the download. On subsequent visits, the model may re-download if caching is not configured.

**Why it happens:**
Transformers.js uses the browser Cache API internally, but developers do not realize: (1) the initial download needs explicit progress feedback, (2) the cache can be evicted by the browser under storage pressure, and (3) the model must be served with correct `Cache-Control` headers if self-hosted.

**How to avoid:**
- Show a progress bar during model download with estimated size ("Downloading AI model... 12MB / 30MB")
- Transformers.js provides download progress callbacks -- use `progress_callback` in the pipeline options
- Pre-populate the cache on user opt-in ("Enable AI features" button that triggers the download proactively)
- If self-hosting model files, set `Cache-Control: public, max-age=31536000, immutable` headers
- Consider using a quantized (int8) model variant to reduce download from ~90MB to ~30MB
- Show "Model cached" vs "First download required" in the UI

**Warning signs:**
- No progress callback wired up during model loading
- No visual feedback between clicking "Remove Background" and getting a result
- Model re-downloads on page reload (check Network tab)
- No consideration of model file hosting (CDN, self-hosted, or Hugging Face default)

**Phase to address:**
Model integration phase. Progress feedback and caching must be part of the initial model loading implementation, not an afterthought.

---

### Pitfall 4: Alpha Mask Applied Incorrectly to Existing Non-Destructive Pipeline

**What goes wrong:**
The current pipeline (`renderToCanvas` in `utils/canvas.ts`) renders transforms and adjustments from the source `ImageBitmap`. Background removal produces a mask/alpha channel that must be composited. If the mask is applied at the wrong stage (before rotation, after crop, etc.), the mask and image become misaligned. The mask corresponds to the source image dimensions and orientation -- if transforms are applied to the image but not the mask, the background bleeds through or the foreground gets clipped.

**Why it happens:**
The existing pipeline operates on `ImageBitmap` with transforms as parameters. The segmentation model outputs a mask for the un-transformed source image. Developers apply the mask to the final rendered output, but the mask coordinates correspond to the pre-transform source. Rotation, flip, and crop all change the spatial relationship between mask and image.

**How to avoid:**
- Apply the mask to the source image BEFORE the render pipeline processes transforms -- create a new `ImageBitmap` with the background already removed, then let the existing pipeline handle rotation/flip/crop as usual
- Store `backgroundRemovedImage: ImageBitmap | null` in the Zustand store alongside `sourceImage`
- When background removal is active, the render pipeline uses `backgroundRemovedImage` instead of `sourceImage` as its input
- This approach requires zero changes to the existing `renderToCanvas` function

**Warning signs:**
- Mask applied as a post-processing step after `renderToCanvas`
- Mask coordinates not transforming with rotation/flip
- Transparent "holes" appear in wrong places after rotating a background-removed image
- Alpha artifacts along edges after cropping

**Phase to address:**
Core integration phase. The architectural decision of WHERE in the pipeline the mask is applied determines the complexity of everything else.

---

### Pitfall 5: Canvas Premultiplied Alpha Causes Edge Fringing Artifacts

**What goes wrong:**
After applying the segmentation mask, the edges of the foreground subject show white or dark fringing -- a visible "halo" of semi-transparent pixels that look wrong against the checkerboard or any new background. This is especially noticeable on hair, fur, and other fine details.

**Why it happens:**
Canvas 2D uses premultiplied alpha internally. When you use `putImageData` with semi-transparent pixels, the browser premultiplies RGB by alpha. When the canvas is then composited (drawn onto another canvas, exported, or displayed over the CSS checkerboard), the premultiplication creates fringing. Additionally, `ctx.filter` (used for brightness/contrast) applied to semi-transparent pixels produces different results than applying filters to the opaque original -- the filter operates on premultiplied values, causing color shifts at transparent edges.

**How to avoid:**
- Apply `ctx.filter` adjustments (brightness, contrast, saturation) to the image BEFORE applying the alpha mask, not after. The current pipeline does this correctly if the mask is baked into a separate `ImageBitmap` -- `ctx.filter` on a fully opaque source produces correct results, then the alpha from the mask is composited afterward
- Use `globalCompositeOperation = 'destination-in'` to apply the mask rather than manual pixel manipulation -- this avoids the putImageData premultiplication issue
- For edge refinement, apply a 1-2px feather to the mask to smooth the alpha transition and reduce hard fringing
- Test with dark-haired subjects on light backgrounds and light-haired subjects on dark backgrounds -- these expose fringing most visibly

**Warning signs:**
- White or dark "halo" around the subject edges
- Edge quality looks worse after applying brightness/contrast adjustments
- Manual `putImageData`/`getImageData` loops used for mask application instead of compositing operations
- No feathering or edge refinement on the mask

**Phase to address:**
Mask compositing phase. Edge quality is the primary quality differentiator between "demo-grade" and "production-grade" background removal.

---

### Pitfall 6: Memory Exhaustion from Multiple Large Bitmaps

**What goes wrong:**
Background removal requires holding multiple large data structures simultaneously: the source `ImageBitmap`, the segmentation mask, a temporary canvas for mask application, and the resulting background-removed `ImageBitmap`. For a 4000x3000 image, each uncompressed bitmap is ~48MB (4000 * 3000 * 4 bytes RGBA). With source + mask + temp canvas + result, peak memory usage hits ~200MB for a single operation. On mobile Safari (with ~300MB canvas memory budget), this crashes the tab.

**Why it happens:**
Developers do not track the lifecycle of intermediate bitmaps and canvases. The model itself also consumes 100-200MB of WASM heap memory. Combined with the image data, total memory can hit 400MB+, well beyond mobile browser limits.

**How to avoid:**
- Close intermediate `ImageBitmap` objects immediately after use with `.close()` -- the existing codebase already does this for `sourceImage` swaps, so follow the same pattern
- Use `canvas.width = 0; canvas.height = 0` to release temporary canvas memory
- Downscale oversized images before feeding them to the model -- most segmentation models accept 1024x1024 or 512x512 input anyway, so downscaling is both a memory optimization and a model requirement
- Run the model on a downscaled version, then upscale the mask back to original dimensions for application
- Set `canvas.width = 0` on temporary canvases created during mask application
- Consider `ImageBitmap.close()` on the pre-removal source if the user confirms they want to keep the result

**Warning signs:**
- No `.close()` calls on intermediate ImageBitmap objects
- Temporary canvases created but never cleaned up
- Full-resolution image passed directly to the model (unnecessary; models resize internally anyway)
- Memory usage climbs with each "remove background" attempt (check browser task manager)
- Mobile users reporting tab crashes during background removal

**Phase to address:**
Core integration phase. Memory management must be designed into the mask-application pipeline from the start.

---

### Pitfall 7: WebGPU/WASM Backend Detection and Fallback Handled Incorrectly

**What goes wrong:**
The app tries to use WebGPU for faster inference but crashes or silently fails on browsers/devices that do not support it (Safari as of early 2026, older Chrome, all Firefox). The developer tests on Chrome with WebGPU and ships, then users on Safari get a blank result, an error, or infinite loading.

**Why it happens:**
WebGPU support is still not universal. Checking `navigator.gpu` is not sufficient -- the adapter may be null, or the device may lack required features. Transformers.js may fall back to WASM automatically, but the fallback behavior is not always reliable, and the performance characteristics change dramatically (WebGPU: 1-3s inference, WASM: 5-30s inference).

**How to avoid:**
- Default to WASM backend, which works everywhere -- do not default to WebGPU
- If using WebGPU as an optimization, wrap in a try/catch with explicit fallback: attempt WebGPU, on failure fall back to WASM
- Test on Safari (no WebGPU), Firefox (no WebGPU), Chrome (WebGPU available), and mobile Safari
- Adjust the loading/progress UI to account for WASM being 3-10x slower than WebGPU
- Set `device: 'cpu'` (WASM) as default in Transformers.js pipeline options, not `device: 'webgpu'`

**Warning signs:**
- `device: 'webgpu'` hardcoded without fallback
- No try/catch around model initialization
- Only tested on Chrome desktop
- No error handling for model loading failures
- Different behavior on Safari vs Chrome with no explanation

**Phase to address:**
Model integration phase. Backend selection and fallback must be part of the initial model loading setup.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Running model inference on main thread | No Web Worker setup needed | Freezes UI for 5-30s, unusable on mobile, no cancel capability | Never -- even for MVP, the worker is essential |
| Storing mask as separate canvas layer | Simpler initial implementation | Extra memory, compositing bugs with transforms, double-draw on every render | MVP only; replace with baked ImageBitmap before shipping |
| Loading full-precision model | Slightly better edge quality | 90MB download vs 30MB, 3x memory usage, longer inference | Never for browser use -- quantized models are the standard |
| Applying mask after render pipeline | No changes to existing renderToCanvas | Mask misaligns with rotation/flip/crop, edge artifacts with ctx.filter | Never -- apply mask to source before pipeline |
| Hardcoding model URL to Hugging Face CDN | No asset hosting needed | Depends on third-party uptime, no cache control, CORS issues on some deployments | Acceptable for development; self-host for production |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Transformers.js + Vite | Vite tries to optimize/bundle the ONNX Runtime WASM files, causing 404s or corrupt WASM | Exclude `@huggingface/transformers` and `onnxruntime-web` from Vite's `optimizeDeps`; configure `assetsInclude` for `.wasm` files; or use the CDN-hosted WASM files |
| Web Worker + Vite | Worker import paths break in production builds | Use Vite's `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })` syntax for correct bundling |
| Segmentation output + Canvas | Model outputs a grayscale mask or raw tensor, not an alpha-ready ImageData | Convert model output to a proper alpha mask: map mask values (0.0-1.0) to alpha channel (0-255), set RGB to the source image pixels |
| `ctx.filter` + transparency | Brightness/contrast filters on semi-transparent pixels produce incorrect colors | Apply filters to the opaque source image first, then composite the mask afterward |
| `ImageBitmap` + Web Worker | `ImageBitmap` created in worker cannot be drawn to main-thread canvas in some browsers | Transfer the `ImageBitmap` back to main thread via `postMessage` with transferable list; or transfer raw `ImageData` and create bitmap on main thread |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Feeding full-resolution image to model | 30s+ inference time, high memory | Downscale to model's native input size (typically 1024x1024), upscale mask back | Images > 2 megapixels |
| Re-running inference on every adjustment | Seconds-long delay on each brightness/contrast change | Cache the mask; only re-run inference when source image changes, not when adjustments change | Any adjustment slider interaction |
| Loading model eagerly on page load | 30-90MB download before user even needs it, wasted bandwidth | Lazy-load model on first "Remove Background" click; show download progress | Always -- most users may never use background removal |
| Not disposing ONNX session | WASM heap memory (~100-200MB) never freed | Call `session.release()` or let Transformers.js handle cleanup after inference; consider disposing when user loads a new image | After 2-3 background removal operations |
| Transferring ImageData by copy instead of transfer | Double memory spike (data exists in both threads briefly) | Use `postMessage(data, [data.buffer])` to transfer ownership, not copy | Images > 3 megapixels |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress during model download | User thinks app is frozen, closes tab, download wasted | Show progress bar with MB downloaded / total MB |
| "Remove Background" button with no indication of model size | User on mobile data unknowingly downloads 30MB+ | First-time tooltip: "This will download a 30MB AI model (one-time)" |
| No way to undo background removal | User removes background, adjusts, realizes removal was wrong, must re-upload | Store original source image; add "Restore Background" toggle |
| Background removal result looks bad on white canvas | Users expect to see the transparent result but see it against the editor's white/dark background | Show checkerboard pattern behind transparent areas (the CSS checkerboard-bg class already exists) |
| No visual difference between "processing" and "complete" | User does not know when removal is done | Transition from loading spinner to result with a brief animation or notification |
| JPEG selected after background removal | User downloads and loses transparency without understanding why | Auto-switch to PNG when background is removed; show explanation if user switches to JPEG |

## "Looks Done But Isn't" Checklist

- [ ] **JPEG export:** After removing background, download as JPEG -- verify transparent areas are white (not black) and user was warned about transparency loss
- [ ] **Rotation after removal:** Remove background, then rotate 90 degrees -- verify the mask rotates correctly with the image (no misaligned transparency)
- [ ] **Crop after removal:** Remove background, then crop -- verify transparent areas remain transparent in the cropped result
- [ ] **Adjustments after removal:** Remove background, then adjust brightness -- verify edge quality does not degrade (no color fringing at mask edges)
- [ ] **Resize after removal:** Remove background, then resize -- verify the `applyResize` function (which flattens to a new ImageBitmap) preserves the alpha channel
- [ ] **Mobile memory:** Run background removal on a 4000x3000 image on iOS Safari -- verify no tab crash
- [ ] **Model caching:** Remove background, reload the page, remove background again -- verify the model does not re-download (check Network tab)
- [ ] **Safari compatibility:** Run background removal on Safari (no WebGPU) -- verify it falls back to WASM and completes successfully
- [ ] **Cancel/new image:** Start background removal, then upload a new image before it finishes -- verify no orphaned worker, no stale result applied to the new image
- [ ] **Undo/restore:** Remove background, then click "Restore Background" -- verify the original image is fully restored with no quality loss

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| JPEG export destroys transparency | LOW | Add white-fill before JPEG encode and auto-format-switch. Isolated to download.ts. |
| Main thread blocking | HIGH | Requires creating a Web Worker, moving model code to worker, adding message protocol. Touches model loading, inference, and result handling. |
| No download progress | LOW | Wire up Transformers.js `progress_callback`. Isolated to model loading code. |
| Mask misalignment with transforms | HIGH | Requires rethinking where in the pipeline the mask is applied. May need to refactor renderToCanvas or add a pre-pipeline compositing step. |
| Edge fringing artifacts | MEDIUM | Switch from putImageData to compositing operations. May require adjusting mask application approach. |
| Memory exhaustion | MEDIUM | Add `.close()` calls and canvas cleanup. Requires tracing all intermediate objects through the pipeline. |
| WebGPU fallback failure | LOW | Wrap in try/catch, default to WASM. Isolated to model initialization. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| JPEG transparency loss | Export integration | Download background-removed image as JPEG; transparent areas should be white, not black |
| Main thread blocking | Worker architecture | Click "Remove Background" on a 4000x3000 image; UI sliders and buttons must remain responsive during inference |
| Model download UX | Model loading | On first click, progress bar shows MB downloaded; on second visit, model loads from cache in <1s |
| Mask/pipeline misalignment | Core integration | Remove background, rotate 90, flip horizontal, crop center -- all operations should produce correct transparent output |
| Edge fringing | Mask compositing | Inspect edges of a dark-haired subject on checkerboard; no white or dark halo should be visible |
| Memory exhaustion | Core integration | Run background removal on a 4000x3000 image on mobile Safari; tab should not crash; memory should return to baseline after operation |
| WebGPU fallback | Model loading | Test on Safari and Firefox; background removal should complete (slower) without errors |
| Stale result on new image | State management | Start removal, upload new image immediately; verify new image appears without the old mask applied |

## Sources

- [Transformers.js background removal with WebGPU - Medium](https://medium.com/myorder/building-an-ai-background-remover-using-transformer-js-and-webgpu-882b0979f916)
- [Building a background remover with Vue and Transformers.js - LogRocket](https://blog.logrocket.com/building-background-remover-vue-transformers-js/)
- [Addy Osmani's bg-remove (Transformers.js reference implementation) - GitHub](https://github.com/addyosmani/bg-remove)
- [Wes Bos bg-remover - GitHub](https://github.com/wesbos/bg-remover)
- [@imgly/background-removal WASM issues - GitHub](https://github.com/imgly/background-removal-js/issues/124)
- [ONNX Runtime Web WASM memory limits - GitHub Issue #10957](https://github.com/microsoft/onnxruntime/issues/10957)
- [ONNX Runtime Web iOS WASM failure - GitHub Issue #22086](https://github.com/microsoft/onnxruntime/issues/22086)
- [Canvas premultiplied alpha quantization - DEV Community](https://dev.to/yoya/canvas-getimagedata-premultiplied-alpha-150b)
- [ImageData alpha premultiplication spec discussion - WHATWG](https://github.com/whatwg/html/issues/5365)
- [OffscreenCanvas and Web Workers - MDN](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
- [Optimizing Transformers.js for Production - SitePoint](https://www.sitepoint.com/optimizing-transformers-js-production/)
- [Transformers.js v4 with WebGPU - adwaitx.com](https://www.adwaitx.com/transformers-js-v4-webgpu-browser-ai/)
- [Firefox JPEG alpha channel behavior - Mozilla Support](https://support.mozilla.org/en-US/questions/1528694)

---
*Pitfalls research for: in-browser AI background removal integration with canvas-based image editor*
*Researched: 2026-03-14*
