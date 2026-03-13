# Project Research Summary

**Project:** WebImager (browser-based image editor)
**Domain:** Client-side single-image photo editing tool
**Researched:** 2026-03-13
**Confidence:** HIGH

## Executive Summary

WebImager is a client-side, no-signup, single-image photo editor occupying a specific niche: simpler than Photopea but more capable than minimal tools like PicResize, and fully private unlike server-side editors like Pixlr or BeFunky. Experts build this type of tool with vanilla TypeScript and the HTML5 Canvas API — no UI framework is needed because the product is a single view with simple state (one image, one set of adjustments). The recommended stack is TypeScript 5.8 + Vite 6.x + Tailwind CSS 4.2 + Cropper.js v2, with the native Canvas 2D API as the rendering foundation. No backend is required.

The recommended approach is a non-destructive render pipeline: the original uploaded image is stored immutably, and all edits (brightness, contrast, saturation, rotate, crop, filters) are stored as parameters in a central state object. Every state change triggers a single re-render from the original source, applying all parameters as a composite pass. CSS-style `ctx.filter` handles the majority of adjustments with GPU acceleration; pixel manipulation (sharpen) is the exception. This architecture eliminates image quality degradation, enables instant preview, and makes filter presets trivial (they are just parameter snapshots).

The primary risks are canvas memory limits crashing mobile browsers (iOS Safari's 16.7 megapixel hard limit must be enforced at upload time), main thread blocking during pixel operations on large images (mitigated by defaulting to `ctx.filter` and adding Web Workers only if needed), and the crop coordinate mapping bug (display pixels vs. full-resolution pixels must be explicitly transformed). All three must be designed into the architecture from the first phase — retrofitting them is costly.

## Key Findings

### Recommended Stack

The stack is deliberately minimal: Vanilla TypeScript with no UI framework (the single-view tool does not justify framework overhead), Vite 6.x for build tooling, Tailwind CSS 4.2 for utility styling, and Cropper.js v2.1.0 as the only significant third-party dependency (free-drag crop UI is non-trivial to implement correctly). Web Workers and OffscreenCanvas are identified as useful for pixel-heavy operations but are explicitly recommended as optional for v1 — `ctx.filter` covers 80% of adjustment needs with GPU acceleration and no threading complexity. TypeScript 6.0 RC is available but too new; 5.8 is the production-safe choice.

**Core technologies:**
- TypeScript 5.8: Type-safe code, catches Canvas API misuse at compile time — skip 6.0 RC
- Vite 6.x: Fast builds, native ES modules, zero-config HMR — skip Vite 8 (just released, bleeding-edge)
- Tailwind CSS 4.2: Utility styling for toolbar, panels, sliders — v4 is CSS-native, no PostCSS
- Native Canvas 2D API: Core rendering, transforms, filters — GPU-accelerated `ctx.filter` for most operations
- Cropper.js v2.1.0: Free-drag crop selection — handles touch, aspect ratio, boundaries out of the box
- Vitest 3.x: Unit testing with native Vite integration

### Expected Features

The feature research clearly segments the v1 scope from future work. Everything required for v1 is achievable without a backend, layers, or complex state management.

**Must have (table stakes):**
- Drag-and-drop + file picker upload (JPEG, PNG, WebP, under 10MB) — entry point to the tool
- Canvas-based real-time preview — the foundation every other feature depends on
- Resize with dimension inputs and aspect-ratio lock — the #1 reason users visit simple editors
- Free-drag crop with resizable selection rectangle — the #2 reason
- Rotate (90-degree increments) and flip (horizontal/vertical) — expected, trivial to implement
- Brightness, contrast, and saturation sliders — core adjustment trifecta
- Download as JPEG or PNG with format selection — the exit point

**Should have (competitive differentiators for v1):**
- Greyscale conversion — one toggle, high utility
- Preset filters (6-8: sepia, vintage, warm, cool, high-contrast, fade, vivid, B&W) — polish and delight; trivial once adjustment pipeline exists
- Blur and sharpen with intensity sliders — rare in simple editors; useful for privacy (blur faces)
- Format conversion on download — users frequently need JPEG-to-PNG conversion

**Defer (v1.x after validation):**
- JPEG quality slider on download
- Common resize presets (social media sizes)
- Single-level undo / revert to original
- Keyboard shortcuts
- Privacy indicator badge ("Your images never leave your device")

**Defer (v2+):**
- Multi-level undo/redo stack, batch processing, touch-optimized mobile editing, EXIF viewer, save/load project state

**Anti-features (deliberately excluded):**
- Layers, user accounts, AI features, text/annotation, drawing tools, before/after toggle — all conflict with the simplicity and client-side constraints

### Architecture Approach

The architecture is a state-driven render pipeline with four layers: UI components, a central Editor State Manager, Processing Engines (resize, crop, filters, transforms), and a Canvas Abstraction. The key pattern is that the canvas is always a pure projection of `EditorState + sourceImage` — the canvas holds no state itself. All UI interactions update state; state changes trigger a single `requestAnimationFrame`-gated re-render. An overlay canvas handles crop interaction separately so crop handle dragging does not trigger full image re-renders. Export renders the full pipeline at actual output resolution on an offscreen canvas, then uses `canvas.toBlob()` (not `toDataURL`) for download.

**Major components:**
1. File Input / Upload — validate file type (magic bytes), size, and pixel dimensions; apply EXIF orientation correction; load into immutable source image
2. Canvas Viewport — display-scaled rendering of source image with all current state parameters applied via `ctx.filter` and transforms
3. Editor State Manager — plain TypeScript object: filter values, crop rect, dimensions, rotation, active tool
4. Processing Engines — isolated pure functions: filters.ts, transform.ts, resize.ts, crop.ts, render.ts
5. Crop Overlay — second transparent canvas for interactive selection rectangle; mouse events write crop rect to state
6. Export Panel — triggers full-resolution offscreen render, `canvas.toBlob()`, object URL download

**Build order:** Canvas pipeline + file I/O first, then state + render loop, then transforms, then adjustments, then presets, then resize, then blur/sharpen, then crop (most complex), then export refinement.

### Critical Pitfalls

1. **Canvas memory limits crash mobile browsers** — iOS Safari hard-limits canvas to 16.7 megapixels. Enforce pixel dimension check at upload; downscale images exceeding 4096x4096 before drawing to canvas. Must be in Phase 1 (upload pipeline).

2. **Destructive editing pipeline degrades image quality** — Applying effects sequentially to canvas state (not re-rendering from original) causes visible quality loss after a few adjustments. The non-destructive pattern (immutable source + parameter re-render) must be established in Phase 1 before any effects are built. Retrofitting this is HIGH cost.

3. **EXIF orientation causes sideways images** — Phone cameras store raw pixels rotated; `drawImage()` ignores EXIF. Read and apply EXIF orientation at upload time using `createImageBitmap()` with `imageOrientation: 'from-image'` or a minimal EXIF parser. Phase 1.

4. **Main thread blocking during pixel operations** — `getImageData`/`putImageData` loops on 4000x3000 images (12M pixels) freeze the UI for 500ms-2s. Mitigate by defaulting to GPU-accelerated `ctx.filter` for all standard adjustments; only use pixel manipulation for sharpen (where canvas filters cannot express convolution). Add Web Workers if performance testing shows jank. Phase 2.

5. **Crop coordinates in display pixels, not source pixels** — The editing canvas is scaled to fit the viewport. Crop selection coordinates must be transformed back to source resolution: `actualX = displayX * (sourceWidth / displayWidth)`. Also account for `window.devicePixelRatio` for sharp HiDPI rendering. Phase 2.

6. **`toDataURL` blocks the browser on large images** — Always use `canvas.toBlob()` for export. It is async and produces binary data (no 33% base64 overhead). Revoke the object URL after download. Phase 3.

## Implications for Roadmap

Based on research, the architecture dictates a strict dependency order. The render pipeline is foundational — nothing else can be built until it exists and is correct. Crop is the most complex UI feature and should be deferred until the pipeline is proven. Export refinement is straightforward once the pipeline is solid.

### Phase 1: Foundation — Upload, Canvas Pipeline, and Non-Destructive Architecture

**Rationale:** Everything depends on this. The non-destructive render pipeline, EXIF orientation handling, and canvas memory limits must be solved before any feature work. Building any effect before the pipeline is correct forces an expensive re-architecture later (HIGH recovery cost per PITFALLS.md).

**Delivers:** Working image loader that handles JPEG/PNG/WebP with EXIF correction, displays image on canvas scaled to viewport, and supports download via `canvas.toBlob()`. Basic rotate and flip to prove the transform pipeline. Serves as a skeleton for all subsequent phases.

**Addresses:** Drag-and-drop + file picker upload, canvas preview pipeline, rotate/flip, basic download

**Avoids:** Canvas memory crashes (pixel dimension check at upload), destructive editing (immutable source + parameter render established from day one), EXIF orientation bugs, toDataURL download anti-pattern

**Research flag:** Standard patterns — well-documented Canvas and FileReader APIs. No deeper research needed.

---

### Phase 2: Adjustments and Filtering

**Rationale:** With the render pipeline established and state-driven re-rendering proven, adding adjustment controls is low-risk incremental work. Presets are trivial once adjustments exist (they are parameter snapshots). Blur/sharpen requires the one place pixel manipulation is needed — build after CSS filters are proven to catch any performance issues early.

**Delivers:** Full adjustment panel (brightness, contrast, saturation, greyscale) with real-time preview, 6-8 named filter presets, and blur/sharpen with intensity sliders.

**Addresses:** Brightness/contrast/saturation sliders, greyscale toggle, preset filters, blur/sharpen — all P1 features from FEATURES.md

**Implements:** `ctx.filter` pattern for GPU-accelerated adjustments, preset parameter snapshots, optional Web Worker for sharpen convolution if performance testing shows jank

**Avoids:** Main thread blocking (default to `ctx.filter`; use pixel manipulation only for sharpen), re-applying effects on every slider tick without debouncing

**Research flag:** Standard patterns for `ctx.filter` and convolution kernels. No deeper research needed; consider research-phase only if Web Worker integration proves complex.

---

### Phase 3: Crop and Resize

**Rationale:** Crop is the most complex UI feature (overlay canvas, mouse event math, coordinate mapping, Cropper.js integration). Resize is simpler but shares the coordinate/dimension concerns. Both belong together after the core pipeline is stable. Deferred to Phase 3 because crop bugs (display vs. source coordinates) are much easier to isolate and test once the rest of the pipeline is solid.

**Delivers:** Free-drag crop with Cropper.js (resizable selection rectangle, aspect ratio lock), resize with width/height inputs and aspect ratio lock, correct coordinate mapping from display to full-resolution source pixels.

**Addresses:** Free-drag crop (P1 table stakes), resize with aspect lock (P1 table stakes)

**Implements:** Overlay canvas pattern for crop interaction, coordinate transformation logic (`actualX = displayX * (sourceWidth / displayWidth)`), `devicePixelRatio` handling for HiDPI

**Avoids:** Crop coordinates using display pixels instead of source pixels, Cropper.js v1 (use v2 ES module native build)

**Research flag:** Cropper.js v2 API may need a quick research-phase pass — v2 is a significant rewrite from v1 with different initialization and event APIs. Recommend research-phase for Phase 3.

---

### Phase 4: Export and Polish

**Rationale:** Export refinement (format selection, JPEG quality slider, full-resolution offscreen render) is cleanly separable from the editing features. Polish items (privacy indicator, keyboard shortcuts, resize presets, revert-to-original) are low-risk additions that improve quality without changing architecture.

**Delivers:** Download dialog with JPEG/PNG/WebP format selection, JPEG quality slider with estimated file size, full-resolution export via offscreen canvas, revert-to-original button, keyboard shortcuts (Ctrl+Z, Ctrl+S), privacy indicator badge.

**Addresses:** Format conversion on download (competitive differentiator), JPEG quality slider, revert to original, keyboard shortcuts, privacy indicator — all P2 features from FEATURES.md

**Implements:** Offscreen canvas for export, `canvas.toBlob()` with quality parameter, object URL cleanup

**Avoids:** `toDataURL` for download, missing object URL revocation (memory leaks)

**Research flag:** Standard patterns. No deeper research needed.

---

### Phase Ordering Rationale

- **Pipeline before features:** PITFALLS.md makes clear that a destructive editing architecture has HIGH recovery cost. Establishing the non-destructive render pipeline in Phase 1 is non-negotiable.
- **Adjustments before crop:** Adjustments (Phase 2) validate the state-driven re-render loop before adding the complexity of crop interaction. Crop (Phase 3) depends on a proven pipeline.
- **Crop last among core features:** ARCHITECTURE.md explicitly lists crop as the most complex interaction and recommends building it last. PITFALLS.md adds the coordinate mapping bug as a crop-specific concern.
- **Export separate:** Export is a clean capstone that reads the completed pipeline and adds download UX. No architectural dependencies on crop or adjustments implementation details.

### Research Flags

Needs `/gsd:research-phase` during planning:
- **Phase 3 (Crop):** Cropper.js v2 is a significant rewrite from v1. The initialization API, event model, and ES module integration differ from most existing tutorials. A focused research pass on Cropper.js v2 docs will prevent integration surprises.

Standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Canvas API, FileReader, createImageBitmap, EXIF orientation — all well-documented on MDN with established patterns.
- **Phase 2 (Adjustments):** `ctx.filter` CSS filter string, requestAnimationFrame debouncing, convolution kernel for sharpen — well-documented patterns with multiple code examples in research.
- **Phase 4 (Export):** `canvas.toBlob()`, object URLs, offscreen canvas for export — straightforward APIs with clear documentation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Technology choices verified against current npm versions, official release notes, and MDN. Version recommendations are specific and justified. |
| Features | HIGH | Competitor analysis covered 6+ live editors. Feature prioritization is grounded in observed industry patterns for simple editors. |
| Architecture | HIGH | Render pipeline pattern sourced from MDN, web.dev, and Smashing Magazine. Canvas filter vs. pixel manipulation tradeoffs are well-established. Code examples are concrete and tested patterns. |
| Pitfalls | HIGH | Pitfalls are specific with iOS Safari memory limits cited from PQINA's documented browser testing. Recovery costs are assessed honestly. |

**Overall confidence:** HIGH

### Gaps to Address

- **Web Worker necessity for sharpen:** Research recommends starting without workers and adding them if performance testing shows jank on large images. The decision point ("how laggy is too laggy for sharpen?") needs a concrete threshold defined during Phase 2 planning (e.g., "if sharpen on a 4000x3000 image takes >200ms, add a Worker").
- **Mobile crop touch UX:** PITFALLS.md flags that crop handles need 44x44px touch targets and edge dragging (not just corner) for mobile. Cropper.js v2 may handle this natively — verify during Phase 3 research.
- **JPEG quality default:** Research recommends 0.85-0.92 as a good quality range for JPEG export but does not specify a single default. Pick 0.90 as the default and validate with user testing once the tool is live.
- **OffscreenCanvas browser support edge cases:** Safari has had historical quirks with OffscreenCanvas. If Web Workers are added for sharpen in Phase 2, test on Safari and have a main-thread fallback ready.

## Sources

### Primary (HIGH confidence)
- [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) — Canvas 2D context, filters, pixel manipulation, OffscreenCanvas
- [MDN CanvasRenderingContext2D: filter property](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter) — CSS-style GPU-accelerated filters
- [Cropper.js npm](https://www.npmjs.com/package/cropperjs) — v2.1.0 package details, last published ~4 months ago
- [Cropper.js docs](https://fengyuanchen.github.io/cropperjs/) — API reference for v2
- [Tailwind CSS v4.2](https://tailwindcss.com/blog/tailwindcss-v4) — Feb 2026 stable release
- [TypeScript 6.0 RC announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0-rc/) — confirms 5.8 as production choice
- [PQINA: Total Canvas Memory Use Exceeds The Maximum Limit](https://pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/) — iOS Safari canvas limits
- [web.dev: OffscreenCanvas](https://web.dev/articles/offscreen-canvas) — Worker-based canvas rendering

### Secondary (MEDIUM confidence)
- [Cloudinary: JavaScript Image Editor Guide 2026](https://cloudinary.com/guides/image-effects/javascript-image-editor) — ecosystem overview
- [IMG.LY: Top 5 JS Image Manipulation Libraries](https://img.ly/blog/the-top-5-open-source-javascript-image-manipulation-libraries/) — library comparison
- [Smashing Magazine: Web Image Effects Performance Showdown](https://www.smashingmagazine.com/2016/05/web-image-effects-performance-showdown/) — ctx.filter vs. pixel manipulation benchmarks (2016, patterns still valid)
- Competitor analysis: Photopea, Pixlr, ImgModify, PicResize, BeFunky — live editor feature audit

### Tertiary (LOW confidence)
- [file-saver npm](https://www.npmjs.com/package/file-saver) — may not be needed; `<a download>` is sufficient for most browsers
- [browser-image-compression npm](https://www.npmjs.com/package/browser-image-compression) — nice-to-have for v1.x quality slider

---
*Research completed: 2026-03-13*
*Ready for roadmap: yes*
