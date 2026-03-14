# Project Research Summary

**Project:** WebImager v2.0 — AI Background Removal
**Domain:** In-browser ML inference integrated into existing canvas-based image editor
**Researched:** 2026-03-14
**Confidence:** HIGH

## Executive Summary

WebImager v2.0 adds client-side AI background removal to an existing non-destructive image editor. The research is unambiguous on the core approach: use `@huggingface/transformers` v3.x with the `briaai/RMBG-1.4` (uint8 quantized, ~45MB) model, running exclusively in a Web Worker, with the resulting alpha mask stored as an `ImageBitmap` in Zustand and composited into the existing `renderToCanvas()` pipeline via `globalCompositeOperation: 'destination-in'`. Only one new npm dependency is required. The existing stack (React 19, Vite 6, Zustand 5, Canvas 2D) handles everything else without modification.

The recommended approach is non-destructive by design: the mask is a render-time parameter, not baked into the source image. This means toggle on/off, rotation, flip, and crop all work correctly without re-running inference. WebImager's competitive angle — fully private, no account, no upload, integrated with editing tools — is genuine and not matched by any server-side competitor. The primary quality limitation (hair on complex backgrounds) is an accepted constraint shared by all free, in-browser tools.

The key risks are all architectural and must be addressed in the first implementation phase: main-thread inference would freeze the UI for 5-30 seconds (non-negotiable: use a Web Worker from day one), JPEG export silently destroys transparency (must white-fill before encode), and mask misalignment with transforms (mask must be stored at source dimensions and transformed identically to the source at render time). All three risks are well-documented with clear prevention strategies. None require novel research — they just require discipline in execution.

## Key Findings

### Recommended Stack

The only new dependency is `@huggingface/transformers@^3.8.1`. This replaces the deprecated `@xenova/transformers` (v2) and is the official HuggingFace package. It bundles `onnxruntime-web` internally — do not install `onnxruntime-web` separately. Two Vite config changes are required: `optimizeDeps.exclude: ['@huggingface/transformers']` (prevents Vite from breaking WASM loading) and `worker.format: 'es'` (required for dynamic imports in the Web Worker).

`@imgly/background-removal` was evaluated and rejected: AGPL license (viral, problematic for most projects), wraps the same ONNX models with less control, and offers no meaningful advantage. RMBG-2.0 was also evaluated and rejected: blocked by an `onnxruntime-web` bug, 366MB+ quantized model size, and "Unsupported model type" errors in Transformers.js as of March 2026.

**Core technologies:**
- `@huggingface/transformers@^3.8.1`: ML inference runtime — only viable option with correct licensing and browser support
- `briaai/RMBG-1.4` (uint8 quantized): segmentation model — ~45MB, browser-compatible, handles arbitrary subjects (people, products, animals, objects)
- Web Worker (native browser API): inference isolation — mandatory to prevent main-thread freeze during 2-10 second inference
- `ImageBitmap`: mask storage format — transferable, GPU-backed, closeable, consistent with existing sourceImage storage
- `globalCompositeOperation: 'destination-in'`: mask compositing — correct Canvas 2D primitive, avoids premultiplied alpha bugs from putImageData

### Expected Features

The MVP (v2.0) is tightly scoped. Every table-stakes item has clear implementation direction from existing code. Differentiators are identified for v2.x follow-up.

**Must have (v2.0 table stakes):**
- One-click "Remove Background" button — single entry point, no configuration before first result
- Progress indicator during model download and inference — prevents abandonment on first use (~45MB download, 2-10s inference)
- Transparent background preview with checkerboard — `drawCheckerboard()` already exists in `canvas.ts`
- Non-destructive mask with "Restore Background" toggle — source image preserved, mask is a render-time parameter
- PNG export preserving alpha channel — existing PNG download pipeline; verify no alpha flattening in render path
- JPEG export composited onto white background — must explicitly white-fill before encode; easy to miss, produces black background if omitted

**Should have (v2.x differentiators):**
- Solid color background replacement — highest-value differentiator, low effort; product photographers need white backgrounds specifically
- Edge softness/feathering slider — Gaussian blur on alpha mask, no re-inference required; addresses "cut out with scissors" look
- Before/after comparison toggle — low effort, good UX polish
- Model caching verification across browsers — IndexedDB/Cache API persistence, cross-session validation

**Defer (v3+):**
- Multiple model options (quality/speed tradeoff) — UI complexity for marginal gain
- Background blur/portrait mode — different technique requiring depth estimation, needs separate research
- WebGPU acceleration as explicit feature — browser support still maturing; Transformers.js auto-detects when available

**Anti-features (explicitly excluded):**
- Manual mask painting/brush tool — requires full brush engine, undo stack, layer system; scope explosion
- Batch background removal — violates single-image workflow constraint
- Server-side fallback for quality — violates client-side constraint; introduces backend, API keys, privacy concerns

### Architecture Approach

The mask integrates as an optional fourth parameter to `renderToCanvas()`. The pipeline order is: source image → rotation/flip transforms → crop extraction → alpha mask compositing (NEW) → `ctx.filter` adjustments. This order is mandatory: mask must come after transforms/crop (so coordinates align) and before `ctx.filter` (which must operate on opaque pixels to avoid premultiplied alpha color fringing). When both mask and adjustments are active, a second canvas copy-and-redraw pass is required. The Web Worker holds the loaded model in memory between calls, sends pixel data via transferable `ArrayBuffer` (zero-copy), and returns a single-channel mask that the main thread converts to an RGBA `ImageBitmap`.

**Major components:**
1. `src/workers/bgRemovalWorker.ts` (NEW) — Transformers.js model loading, inference, progress reporting; model cached in worker memory after first load
2. `src/hooks/useBgRemoval.ts` (NEW) — worker lifecycle management, store updates, pixel data extraction from sourceImage
3. `src/utils/canvas.ts` (MODIFIED) — `renderToCanvas()` gains `alphaMask?` parameter; compositing via `destination-in`; second-pass filter handling when mask active
4. `src/store/editorStore.ts` (MODIFIED) — new `backgroundRemoval` state slice: `{ enabled, mask, status, progress, error }`
5. `src/components/BackgroundRemovalControls.tsx` (NEW) — remove button, progress bar, restore button, status display
6. `src/utils/download.ts` (MINOR CHANGE) — white-fill before JPEG encode when mask active

### Critical Pitfalls

1. **Main-thread inference freezes UI 5-30 seconds** — Non-negotiable: ALL model loading and inference must run in a Web Worker. `await` on WASM execution is not non-blocking on the main thread. Design the Worker first; retrofitting is a near-total rewrite of the integration layer.

2. **JPEG export silently destroys transparency** — The existing DownloadPanel defaults to JPEG. When background removal is active, auto-switch to PNG and/or white-fill before JPEG encode. Add `hasTransparency` awareness to the store. Missing this is the most common user-visible bug.

3. **Mask misalignment after rotation/flip/crop** — The mask is generated from the source image at its original orientation. It must be drawn with identical transforms applied. Store mask at source dimensions; apply same rotation/flip/crop transforms to mask at render time. Do not apply mask as a post-pipeline step to the final rendered output.

4. **Canvas premultiplied alpha causes edge fringing** — `ctx.filter` (brightness/contrast) applied to semi-transparent pixels produces color shifts at edges. Apply `ctx.filter` to the opaque source first, then composite the alpha mask. Use `globalCompositeOperation: 'destination-in'`, not `putImageData`, for mask application.

5. **Memory exhaustion on large images** — Source + mask + temp canvas + model weights (~45MB) can reach 400MB+ on a 4000x3000 image, crashing mobile Safari. Call `ImageBitmap.close()` on intermediate bitmaps, downscale input to the model's native resolution (~1024px), release temporary canvases with `canvas.width = 0`.

## Implications for Roadmap

### Phase 1: Worker Infrastructure and Model Integration

**Rationale:** Everything else depends on the Web Worker and model pipeline being correct. The architectural decisions made here — worker message protocol, model caching, progress reporting — are load-bearing for all subsequent phases. Retrofitting a worker around a main-thread implementation is effectively a rewrite of the integration layer.

**Delivers:** Working background removal in isolation (no UI polish, no edge cases handled). Proves the inference pipeline end-to-end: click → worker → model inference → mask returned → mask stored.

**Addresses:** One-click removal, progress indicator, ML model loading and caching

**Avoids:** Main-thread blocking (Pitfall 2), model download UX failure (Pitfall 3), WebGPU/WASM backend detection failure (Pitfall 7)

**Implementation order within phase:**
1. `npm install @huggingface/transformers` + Vite config changes (`optimizeDeps.exclude`, `worker.format: 'es'`)
2. `BackgroundRemoval` interface in `types/editor.ts`
3. `backgroundRemoval` state slice in `editorStore.ts`
4. `bgRemovalWorker.ts` with model loading, inference, progress messages, WASM backend default
5. `useBgRemoval.ts` hook with worker lifecycle management

**Research flag:** Standard patterns — well-documented Transformers.js Worker integration with reference implementations from Addy Osmani and Wes Bos. No additional phase research needed.

---

### Phase 2: Canvas Pipeline Integration

**Rationale:** Mask compositing must be correct before any UI is built on top of it. Getting the render pipeline order wrong (mask before transforms, or after `ctx.filter`) causes visual bugs that are hard to diagnose once UI is layered on top.

**Delivers:** Correct transparent canvas rendering with mask applied through all transform/crop combinations. The "Looks Done But Isn't" checklist items for rotation, crop, and adjustments all pass.

**Addresses:** Transparent background preview, non-destructive mask toggle, alpha channel preservation in the full render pipeline

**Avoids:** Mask/pipeline misalignment (Pitfall 4), canvas premultiplied alpha fringing (Pitfall 5), memory exhaustion (Pitfall 6)

**Critical verification steps (from PITFALLS.md checklist):**
- Remove background → rotate 90 → verify mask aligned correctly
- Remove background → crop → verify transparent areas remain correct
- Remove background → adjust brightness → verify no color fringing at mask edges
- Remove background → resize → verify alpha preserved in new ImageBitmap
- Run on a 4000x3000 image on iOS Safari → verify no tab crash

**Research flag:** Standard Canvas 2D compositing patterns. MDN documentation is authoritative. No additional research needed.

---

### Phase 3: Export Handling

**Rationale:** Export correctness must be addressed before the feature ships to users. The existing DownloadPanel defaults to JPEG, which silently destroys transparency — the highest-probability user-visible bug. Isolating this as its own phase ensures it gets explicit attention before UI polish begins.

**Delivers:** Correct download behavior for both PNG (alpha preserved) and JPEG (white-filled). Format selector updated with transparency awareness. Users warned or auto-redirected when selecting JPEG with an active mask.

**Addresses:** JPEG export behavior, PNG export alpha preservation, format selector intelligence

**Avoids:** JPEG transparency loss (Pitfall 1) — transparent areas producing black background on download

**Implementation within phase:**
- `download.ts`: detect `backgroundRemoval.enabled`, white-fill before JPEG encode
- `DownloadPanel`: auto-switch to PNG when background removed, show JPEG warning if user overrides
- Verification: download background-removed image as JPEG → confirm white background, not black

**Research flag:** Well-understood JPEG alpha behavior. No additional research needed.

---

### Phase 4: UI and UX Polish

**Rationale:** With correct functionality proven in Phases 1-3, UI can be built confidently without architectural surprises. Building UI before the pipeline is correct leads to throwaway rework.

**Delivers:** `BackgroundRemovalControls` component, progress bar with MB indication, Restore Background button, sidebar integration, model size disclosure on first use

**Addresses:** All v2.0 table-stakes UX requirements — complete the feature for launch

**Avoids:** UX pitfalls from PITFALLS.md: no progress during download, no undo, no completion confirmation, no transparency-aware format guidance

**Research flag:** Standard React component patterns. No additional research needed.

---

### Phase 5: Differentiators (v2.x)

**Rationale:** Delivers competitive advantages after the core feature is stable and validated with real users.

**Delivers:** Solid color background replacement (highest priority), edge softness/feathering slider, before/after comparison toggle

**Addresses:** All "Should have" features from FEATURES.md

**Implementation notes:**
- Color replacement: composite subject over a filled rectangle; color picker with white/black/grey presets plus custom
- Edge feathering: Gaussian blur on alpha mask before `destination-in` compositing; no re-inference, pure post-processing
- Before/after toggle: conditional mask parameter in `renderToCanvas()` call — already built into the render pipeline

**Research flag:** Standard patterns. No additional research needed.

---

### Phase Ordering Rationale

- **Worker before canvas pipeline:** The worker message protocol determines what data the canvas pipeline receives. Designing the pipeline before the worker means refactoring the worker API to match pipeline requirements discovered later.
- **Canvas pipeline before UI:** UI components bind to store state and the pipeline's data shapes. Building UI first causes frequent API churn as the pipeline evolves.
- **Export before polish:** A feature that silently corrupts downloads is a correctness bug, not a polish gap. Export correctness ships with the feature, not after.
- **Differentiators last:** All differentiators (color replacement, feathering, before/after toggle) are additive operations that depend on having a correct alpha mask. None affect the core pipeline.

### Research Flags

Needs `/gsd:research-phase` during planning:
- **None identified.** All phases use well-documented browser APIs and Transformers.js patterns. Reference implementations exist and have HIGH-confidence sources.

Standard patterns (research-phase not needed):
- **Phase 1:** Transformers.js Web Worker integration is documented with working reference implementations (Addy Osmani, Wes Bos, LogRocket)
- **Phase 2:** Canvas 2D `globalCompositeOperation` is authoritative MDN-documented behavior
- **Phase 3:** JPEG alpha flattening is a known browser behavior with a standard white-fill solution
- **Phase 4:** React progress/loading component patterns are standard
- **Phase 5:** Gaussian blur on ImageData and canvas color fill are basic Canvas 2D operations

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Single recommended library with clear rationale; alternatives explicitly evaluated and rejected with documented reasons (GitHub issues, npm audits, license review) |
| Features | HIGH | Table stakes established from competitor analysis (remove.bg, Photoroom, Canva); differentiators are concrete and implementation-defined with cost/value estimates |
| Architecture | HIGH | Existing codebase architecture well-understood; pipeline integration points are specified to the function-signature level with code examples |
| Pitfalls | HIGH | Pitfalls sourced from GitHub issues, production post-mortems, and reference implementations; all have concrete prevention strategies and recovery cost estimates |

**Overall confidence:** HIGH

### Gaps to Address

- **RMBG-1.4 licensing for commercial use:** The model uses a Creative Commons non-commercial license. Acceptable for a free static site. If WebImager ever monetizes, the model must be replaced with `Xenova/modnet` (MIT) or a commercially-licensed alternative. Flag this if commercialization is ever on the roadmap.

- **Mobile inference performance on mid-range Android:** Research characterizes WASM inference as 5-30 seconds. Actual performance on mid-range Android (not just desktop or iOS) is not precisely characterized. The progress bar and patience messaging are essential safeguards. Validate during Phase 1 testing on real devices.

- **Browser Cache API eviction for model caching:** Transformers.js uses the Cache API, which is subject to browser eviction under storage pressure. Research confirms caching works but does not quantify eviction likelihood in practice. Consider surfacing a "model downloaded" indicator so users understand why an occasional re-download occurs.

- **`applyResize` alpha preservation:** PITFALLS.md flags that `applyResize` creates a new `ImageBitmap` which may flatten alpha. The mask invalidation rules (resize clears mask) contain this risk, but the actual `applyResize` implementation should be verified during Phase 2 to confirm it does not silently produce an opaque ImageBitmap.

## Sources

### Primary (HIGH confidence)
- [@huggingface/transformers on npm](https://www.npmjs.com/package/@huggingface/transformers) — v3.8.1, library API reference
- [Transformers.js v3 announcement](https://huggingface.co/blog/transformersjs-v3) — WebGPU support, `@huggingface/transformers` package name
- [RMBG-1.4 Model Card](https://huggingface.co/briaai/RMBG-1.4) — model capabilities, quantization options, license
- [RMBG-2.0 onnxruntime-web bug](https://github.com/microsoft/onnxruntime/issues/21968) — why RMBG-2.0 is not viable in-browser
- [RMBG-2.0 Transformers.js issue](https://github.com/huggingface/transformers.js/issues/1107) — "Unsupported model type" error documentation
- [Canvas globalCompositeOperation MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation) — compositing operation behavior
- [Optimizing Transformers.js for Production - SitePoint](https://www.sitepoint.com/optimizing-transformers-js-production/) — Vite config patterns, `optimizeDeps.exclude` requirement

### Secondary (MEDIUM confidence)
- [Addy Osmani's bg-remove](https://github.com/addyosmani/bg-remove) — React + Transformers.js reference implementation
- [Wes Bos bg-remover](https://github.com/wesbos/bg-remover) — additional reference implementation
- [LogRocket: Background remover with Vue and Transformers.js](https://blog.logrocket.com/building-background-remover-vue-transformers-js/) — Worker architecture patterns
- [Canvas premultiplied alpha - DEV Community](https://dev.to/yoya/canvas-getimagedata-premultiplied-alpha-150b) — alpha fringing cause and explanation
- [ONNX Runtime Web WASM memory limits](https://github.com/microsoft/onnxruntime/issues/10957) — memory exhaustion characterization on mobile
- [BRIA RMBG-2.0 benchmarks](https://blog.bria.ai/benchmarking-blog/brias-new-state-of-the-art-remove-background-2.0-outperforms-the-competition) — 90% vs 74% accuracy comparison (quantifying RMBG-1.4 quality tradeoff)
- [IMG.LY: 20x Faster Browser Background Removal with ONNX Runtime](https://img.ly/blog/browser-background-removal-using-onnx-runtime-webgpu/) — WebGPU performance benchmarks, competitor feature context

---
*Research completed: 2026-03-14*
*Ready for roadmap: yes*
