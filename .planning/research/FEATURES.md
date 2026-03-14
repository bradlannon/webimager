# Feature Research

**Domain:** In-browser AI background removal for a client-side image editor
**Researched:** 2026-03-14
**Confidence:** HIGH

## Context

This is a subsequent milestone for WebImager v2.0. The existing v1.0 editor already ships upload, resize, crop, rotate/flip, brightness/contrast/saturation/greyscale, and JPEG/PNG download. All processing is client-side. This research focuses specifically on the background removal feature being added.

The v1.0 FEATURES.md (researched 2026-03-13) covered the general editor feature landscape. This document supersedes it for the v2.0 milestone scope.

## Competitive Landscape Context

Background removal is dominated by server-side tools (remove.bg, Photoroom, Canva) that require accounts and have free-tier limits. WebImager's angle is unique: **fully client-side, no upload, no account, unlimited use, integrated into an editor**. This is not competing on removal quality (server-side models with large GPUs will always win on edge cases). It is competing on privacy, simplicity, and the integrated editing workflow.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist when they click "Remove Background." Missing any of these and the feature feels broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| One-click background removal | Every competitor does this in a single click. Users expect zero configuration before seeing a result. | MEDIUM | Core ML inference pipeline. `@imgly/background-removal` wraps ONNX Runtime Web with ISNET model. Returns a PNG blob with alpha channel. Main implementation work is integrating the model, running inference in a Web Worker, and wiring the mask into the render pipeline. |
| Transparent background preview | Users need to see what they got. A checkerboard pattern behind the subject is the universal transparency indicator (Photoshop, Figma, every design tool uses this). | LOW | Draw a checkerboard pattern on the canvas beneath the masked image. Toggle between original view and removed-background view. |
| Loading/progress feedback | The ML model is ~10MB on first download and inference takes 1-5 seconds. Without feedback, users assume the app crashed. | LOW | `@imgly/background-removal` supports progress callbacks for model download and inference stages. Show a progress bar or percentage during download, spinner during inference. |
| PNG export with transparency | The primary use case: get a subject on a transparent background for compositing elsewhere. | LOW | WebImager already exports PNG via `canvas.toBlob('image/png')`. The work is ensuring the alpha channel from the mask survives through `renderToCanvas()`. Currently the pipeline uses `ImageBitmap` which supports alpha. Verify the render pipeline does not flatten alpha (e.g., by drawing onto a white-filled canvas). |
| JPEG export handles missing background | JPEG has no alpha channel. If user exports as JPEG after removal, the transparent area must become white (not black, not garbage pixels). | LOW | When format is `image/jpeg`, fill the canvas with white before compositing the masked image. Simple but easy to forget -- results in a black background if missed. |
| Revert to original | Users expect to undo the removal if results are bad or they change their mind. | LOW | WebImager's non-destructive pipeline already preserves the source `ImageBitmap`. Add a `backgroundRemoved` flag to `EditorState`. The mask is applied at render time, not baked into the source. A "Restore Background" button toggles the flag. |
| Works on common subjects | People, products, animals, objects on reasonably distinct backgrounds. Users expect these to work without manual intervention. | N/A (model quality) | ISNET/U2NET models handle these well. Hair detail on complex backgrounds is where quality drops. This is acceptable -- all free tools have this limitation. |

### Differentiators (Competitive Advantage)

Features that set WebImager apart. Not required for a working removal feature, but increase value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Solid color background replacement | Most free tools give transparent PNG only. Letting users pick white, black, or a custom color is a quick win. Product photographers for Amazon/eBay specifically need white backgrounds. | LOW | After generating the mask, composite the subject over a filled rectangle. A color picker with preset swatches (white, black, grey, custom). Minimal UI addition. |
| Combined with existing adjustments | WebImager already has brightness/contrast/saturation. Applying these to the subject after removal (e.g., brighten a dark product photo) is something standalone removal tools cannot do. This is the natural advantage of being an editor. | LOW | Already works if the render pipeline applies adjustments after masking. Verify render order: source -> crop -> mask -> adjustments -> export. No extra UI needed. |
| Edge softness / feathering slider | A single slider controlling mask edge softness prevents the harsh "cut out with scissors" look. Clipping Magic charges for this. Most free tools offer no edge control. | MEDIUM | Apply a Gaussian blur to the alpha mask before compositing. Map a 0-100% slider to a blur radius (0-5px). This is post-processing on the mask, not model re-inference. |
| Before/after comparison toggle | Quick flip between original and removed-background view. Useful for quality assessment and surprisingly satisfying to use. | LOW | A toggle button that swaps between rendering with and without the mask. Can reuse this pattern for future adjustment comparisons. |
| Privacy as a feature | "Your images never leave your device -- not even for AI processing." No competitor can say this because they all use server-side models. | LOW | Already have a privacy badge in v1. Update messaging to explicitly mention AI processing stays local. Zero implementation cost, high trust value. |
| Offline capability after first use | After the model downloads once, background removal works without internet. No competitor offers this. | MEDIUM | `@imgly/background-removal` can cache the model. Verify IndexedDB caching works across browsers. May need to configure `publicPath` and caching strategy. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems in WebImager's context.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Manual mask painting / brush tool | Users want to fix areas the AI missed by painting on the mask. | Requires a full brush engine (size, hardness, opacity), an undo stack for brush strokes, and effectively a layer system. Massive complexity jump that violates WebImager's "keep it simple" philosophy. Turns a one-click tool into Photoshop. | Accept that edge cases will not be perfect. The edge softness slider handles most "harsh edge" complaints. Users needing pixel-perfect masks should use Photopea or Photoshop. |
| Batch background removal | Process multiple images at once. | Violates the single-image workflow constraint in PROJECT.md. Each image takes 1-5 seconds of inference. Memory usage scales linearly. UI for managing a queue of results is a whole sub-product. | Stay single-image. Users needing batch should use remove.bg's API or similar. |
| Background replacement with uploaded image | Upload a second image as the new background (e.g., put yourself on a beach). | Introduces a second image pipeline, positioning/scaling/tiling controls, and layer compositing. Scope explosion. The UI for positioning a background image behind a subject is essentially building a layer system. | Offer solid color replacement. Users can download the transparent PNG and composite in Canva/Figma/anything. |
| Server-side fallback for better quality | Some models run better on GPU servers. Offer cloud option for hard cases. | Violates the core constraint: "All processing happens client-side." Introduces server costs, privacy concerns, API keys, authentication, and the need for a backend. Exactly what WebImager avoids. | Use the best client-side model available. ISNET via `@imgly/background-removal` is state-of-the-art for browser inference. Quality will improve as models and WebGPU support mature. |
| Multiple subject selection / instance segmentation | Let users choose which detected subjects to keep (e.g., keep person A but not person B). | Requires instance segmentation (per-object detection), not just foreground/background separation. Different model architecture, much more complex UI with selectable regions. | The model keeps all foreground subjects. Users can crop to isolate specific subjects (crop already exists in v1). |
| Real-time video background removal | Apply removal to webcam or video. | Entirely different technical domain. Still-image models run at 1-5 seconds per frame, far too slow for 30fps video. Architecture is completely different (streaming inference, temporal consistency). | Out of scope. This is an image editor. |
| Background blur (portrait mode effect) | Keep the background but blur it, like phone portrait mode. | Different from removal -- requires depth estimation or segmentation with a blur pass. The mask from background removal could theoretically be reused, but applying variable blur based on a binary mask looks cheap. Real portrait blur needs depth maps. | Defer to v3+ if there is demand. Would need a separate "portrait blur" feature, not a mode of background removal. |

## Feature Dependencies

```
[ML Model Loading + Caching]
    └──requires──> [One-click removal] (core inference)
                       └──enables──> [Transparent PNG export]
                       └──enables──> [Solid color replacement]
                       └──enables──> [Edge softness slider]
                       └──enables──> [Before/after toggle]
                       └──enables──> [JPEG white-fill compositing]

[Existing render pipeline]
    └──requires modification──> [Alpha channel preservation]
        └──enables──> [Transparent PNG export]

[Existing adjustments (brightness/contrast/saturation)]
    └──enhances──> [Background removal]
        (adjustments apply to the masked result -- verify pipeline order)

[Existing crop tool]
    └──enhances──> [Background removal]
        (crop after removal to tighten framing around subject)

[Existing PNG download]
    └──enables──> [Transparent PNG export]
        (format already supported; ensure alpha survives toBlob)
```

### Dependency Notes

- **One-click removal requires ML model loading:** The ONNX model must download (~10MB first time) and initialize before any inference. This is the critical path. Everything else depends on having a working foreground mask.
- **Transparent PNG export requires alpha channel preservation:** WebImager's `renderToCanvas()` must not flatten alpha. Currently it calls `ctx.drawImage()` which preserves alpha, but verify there is no `ctx.fillRect(white)` call clearing the canvas before drawing. JPEG export must explicitly fill white first.
- **Solid color replacement requires the mask:** Cannot replace the background without first having the foreground/background separation.
- **Edge softness requires the mask:** The feathering slider post-processes the alpha mask with a blur before compositing. Does not re-run inference.
- **Existing adjustments enhance removal for free:** If the render pipeline applies adjustments (brightness, contrast, etc.) after the mask, users can adjust the isolated subject. Verify the pipeline order does not apply adjustments before masking (which would adjust the background too, then remove it -- correct but wasteful).
- **Existing crop enhances removal for free:** Users can crop tightly around the subject after removal. Already works if crop applies in the pipeline regardless of mask state.

## MVP Definition

### Launch With (v2.0)

Minimum viable background removal -- what ships as the v2.0 feature.

- [ ] One-click "Remove Background" button in the sidebar -- single entry point, no configuration needed
- [ ] ML inference via `@imgly/background-removal` running in a Web Worker to keep UI responsive
- [ ] Progress indicator during model download (first use) and inference
- [ ] Transparent background preview with checkerboard pattern on canvas
- [ ] Non-destructive mask in the render pipeline (toggle on/off, source image preserved)
- [ ] "Restore Background" button to revert
- [ ] PNG download preserves alpha channel (transparent background)
- [ ] JPEG download composites onto white background (not black)

### Add After Validation (v2.x)

Features to add once core removal is working and stable.

- [ ] Solid color background replacement (white, black, custom picker) -- highest-value differentiator, low effort
- [ ] Edge softness/feathering slider -- improves perceived quality significantly
- [ ] Before/after comparison toggle -- low effort, good UX polish
- [ ] Verify and optimize model caching in IndexedDB across browsers

### Future Consideration (v3+)

- [ ] Multiple model options (quality vs speed tradeoff) -- adds UI complexity for marginal gain
- [ ] Background blur / portrait mode effect -- needs separate research, different technique
- [ ] WebGPU acceleration for faster inference -- browser support still maturing

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| One-click removal | HIGH | MEDIUM | P1 |
| Progress indicator | HIGH | LOW | P1 |
| Transparent preview (checkerboard) | HIGH | LOW | P1 |
| PNG export with alpha | HIGH | LOW | P1 |
| JPEG white-fill compositing | MEDIUM | LOW | P1 |
| Revert to original | HIGH | LOW | P1 |
| Solid color replacement | MEDIUM | LOW | P2 |
| Edge softness slider | MEDIUM | MEDIUM | P2 |
| Before/after toggle | LOW | LOW | P2 |
| Model caching optimization | MEDIUM | MEDIUM | P2 |
| Background blur effect | LOW | HIGH | P3 |
| Multiple model options | LOW | HIGH | P3 |
| WebGPU acceleration | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v2.0 launch
- P2: Should have, add in v2.x
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | remove.bg | Photoroom | Canva | WebImager v2 (plan) |
|---------|-----------|-----------|-------|---------------------|
| One-click removal | Yes (server) | Yes (server) | Yes (server) | Yes (client-side) |
| Transparent PNG | Yes | Yes | Pro only | Yes (free) |
| Color replacement | White only (free) | Many options | Pro only | White, black, custom |
| Edge refinement | Paid tier | Basic | No | Feathering slider |
| Privacy (no upload) | No | No | No | **Yes** |
| Works offline | No | No | No | **Yes (after model cache)** |
| Integrated with editor | No (single purpose) | Yes (full suite) | Yes (full suite) | **Yes (resize, crop, adjust)** |
| Free / no account | Limited free tier | Limited free tier | Limited free tier | **Unlimited, no account** |
| Processing speed | ~2s (server GPU) | ~2s (server GPU) | ~3s (server GPU) | ~3-5s (client WASM) |
| Quality on hard cases | Excellent | Excellent | Good | Good (ISNET model) |
| Batch processing | Paid | Paid | Paid | No (by design) |

**WebImager's competitive position:** Cannot beat server-side tools on speed or quality for hard cases (hair on complex backgrounds). Wins on privacy, cost (truly free), offline capability, and the integrated editor workflow. The target user is someone who wants to remove a background, adjust the result, and download -- all without signing up or uploading their image to a server.

## Sources

- [IMG.LY: 20x Faster Browser Background Removal with ONNX Runtime](https://img.ly/blog/browser-background-removal-using-onnx-runtime-webgpu/) -- technical architecture, WebGPU performance benchmarks
- [@imgly/background-removal on npm](https://www.npmjs.com/package/@imgly/background-removal) -- primary client-side library, API reference
- [imgly/background-removal-js on GitHub](https://github.com/imgly/background-removal-js) -- source, configuration options, model details
- [Photoroom vs remove.bg comparison](https://www.photoroom.com/blog/photoroom-or-removebg) -- competitor feature analysis
- [remove.bg vs Photoroom definitive comparison](https://vertu.com/guides/remove-bg-vs-photoroom-the-definitive-comparison/) -- feature expectations
- [Top 10 AI Background Removal Tools 2026](https://www.scmgalaxy.com/tutorials/top-10-ai-background-removal-tools-in-2025-features-pros-cons-comparison/) -- market landscape
- [Client-Side AI in 2025](https://medium.com/@sauravgupta2800/client-side-ai-in-2025-what-i-learned-running-ml-models-entirely-in-the-browser-aa12683f457f) -- performance benchmarks, IndexedDB caching patterns
- [Clipping Magic](https://clippingmagic.com/) -- edge refinement feature reference
- [Webkul: Browser Based Background Remover using ONNX](https://webkul.com/blog/browser-based-background-remover-using-onnx/) -- implementation patterns

---
*Feature research for: In-browser AI background removal (v2.0 milestone)*
*Researched: 2026-03-14*
