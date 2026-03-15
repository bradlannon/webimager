# Project Research Summary

**Project:** WebImager v3.0 — Editing Power Features
**Domain:** Browser-based image editor (Canvas 2D, client-side, zero-dependency extension)
**Researched:** 2026-03-14
**Confidence:** HIGH

## Executive Summary

WebImager v3.0 adds four major feature areas — blur/sharpen filters, preset image filters, text overlay, and drawing/annotation — to an existing non-destructive Canvas 2D render pipeline. All four areas can be built without introducing any new npm dependencies. The existing `ctx.filter` CSS string pipeline handles blur and all preset filter effects; sharpen requires a standard 3x3 convolution kernel via `getImageData`/`putImageData`; text and drawing use the project's established "edit-until-applied" overlay pattern already proven by the crop feature. The architecture is an evolutionary extension of what exists, not a rewrite.

The recommended build order is dependency-driven: first refactor `renderToCanvas` to accept an options object (one-time change, avoids cascading signature churn), then add blur/sharpen (extends existing pipeline, introduces the pixel-manipulation code path, and forces resolution of the Safari `ctx.filter` gap), then preset filters (one new store field, establishes the new Filters tab pattern), then text overlay (introduces the HTML+canvas overlay pattern), and finally drawing/annotation (most complex, builds on every prior phase). Each phase delivers independent, shippable value.

The most significant risk is the Safari `ctx.filter` gap — Safari has never shipped `CanvasRenderingContext2D.filter` enabled by default, meaning all existing adjustments (brightness, contrast, saturation) already silently fail on Safari. This must be resolved in Phase 1 because: (a) it affects the current app, not just v3.0, and (b) the fix benefits all filter features simultaneously. The second major risk is blur performance on large images — blur is O(n × r²) versus the O(n) cost of existing adjustments, requiring debouncing and/or preview-resolution rendering as part of the initial implementation.

## Key Findings

### Recommended Stack

All v3.0 features are implementable with zero new dependencies. The existing stack — Canvas 2D API, `ctx.filter` CSS string syntax, Zustand 5.x, React 19, Vite 6, TypeScript 5.8, Tailwind CSS v4 — covers every requirement. See `.planning/research/STACK.md` for full details.

**Core technologies:**
- `ctx.filter` (CSS string syntax): Blur and preset filters — already used for brightness/contrast/saturation; append `blur(Npx)` and preset strings to existing `buildFilterString()`
- SVG `feConvolveMatrix` via `ctx.filter = "url(#sharpen-N)"`: Sharpen — GPU-accelerated; pixel-loop fallback available if `url()` reference proves unreliable in Safari/Firefox
- Canvas 2D drawing API (`fillText`, `beginPath`, `lineTo`, `arc`, `strokeRect`): Text rendering and annotation shapes — native primitives, no library
- HTML `<div>` overlay (not canvas): Text editing UX — native cursor, selection, font rendering; converted to canvas pixels only on "Apply"
- Zustand store extension: New slices for `blur`, `sharpen`, `activeFilter`, `textMode`/`pendingText`/`appliedTexts`, `drawMode`/`pendingPaths`/`appliedDrawingData`

**Critical non-recommendation:** Do NOT use the object-based `new CanvasFilter()` API — it has no Safari support as of March 2026. The CSS string syntax (`ctx.filter = "blur(5px)"`) has Baseline 2024 support and is the correct choice.

### Expected Features

See `.planning/research/FEATURES.md` for the full feature matrix with complexity ratings and implementation notes.

**Must have (table stakes) — P1:**
- Gaussian blur slider (0-20px) — GPU-accelerated via `ctx.filter`, extends `buildFilterString()`
- Sharpen slider (0-100 intensity) — convolution kernel, new pixel-manipulation code path
- 8-10 preset filters (Sepia, Vintage, Warm, Cool, B&W, Fade, Vivid, Dramatic, Noir, Retro) — pure CSS filter string compositions
- Text overlay with font size, color, and drag-to-position — HTML overlay, edit-until-applied
- Freehand pen drawing with color and thickness controls — overlay canvas, smooth Bezier curves
- Arrow, rectangle, circle, and line shape annotations — canvas primitives on overlay canvas
- Edit-until-applied pattern for all overlays — matches existing crop UX
- Per-stroke undo and clear-all for drawing — array pop, cheap to implement

**Should have (competitive) — P2:**
- Smooth freehand via quadratic Bezier midpoint interpolation — ~20 lines of code, major visual quality improvement
- Text font family selector (5-6 web-safe fonts) — CSS font strings, zero loading cost

**Defer (v3.0+ / future):**
- Preset filter strength slider — good differentiator, add after core presets ship
- Preset filter preview thumbnails — polish feature; render at thumbnail size, cache per image
- Full undo/redo history — PROJECT.md lists as future candidate
- Layer system, rich text, custom filter matrix, Bezier pen tool — anti-features; out of scope by design

### Architecture Approach

The v3.0 architecture extends the existing `renderToCanvas` pipeline with three additions: (1) blur/sharpen fields in `Adjustments` and a new sharpen convolution render step, (2) an `activeFilter` store field that composes preset CSS filter strings with manual adjustment strings in `buildFilterString()`, and (3) an overlay layer pattern for text and drawing where editable content lives outside the main pipeline and is composited into the output after all base-image processing. Applied text (`appliedTexts: TextOverlay[]`) and applied drawing (`appliedDrawingData: ImageData | null`) render at the end of every pipeline pass — keeping them visually above filters and masks without baking into `sourceImage`. See `.planning/research/ARCHITECTURE.md` for the full component tree, store shape, and per-file change lists.

**Updated render pipeline order (9 steps):**
1. Apply transforms (rotate, flip) — existing
2. Apply crop — existing
3. Apply `ctx.filter` string (adjustments + `activeFilter` preset) — modified
4. Draw image to canvas — existing
5. Apply sharpen convolution — new
6. Apply background mask (destination-in) — existing
7. Fill replacement color (destination-over) — existing
8. Render applied texts (`ctx.fillText`) — new
9. Composite applied drawing data — new

**Major new components:**
1. `src/utils/sharpen.ts` — convolution kernel function (`applySharpen`)
2. `src/types/filters.ts` + `src/components/FilterControls.tsx` — preset data and selection UI
3. `src/types/text.ts` + `src/components/TextOverlayElement.tsx` + `src/components/TextControls.tsx` — text overlay system
4. `src/types/drawing.ts` + `src/components/DrawingOverlay.tsx` + `src/components/DrawControls.tsx` — drawing overlay system

**First action before any feature work:** Refactor `renderToCanvas` from 7 positional parameters to an options object. One-time change; prevents four rounds of cascading signature churn.

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for all 8 pitfalls, integration gotchas, performance traps, and the full "Looks Done But Isn't" verification checklist.

1. **Safari `ctx.filter` silently does nothing** — `CanvasRenderingContext2D.filter` is disabled by default in all Safari versions through Safari 26.4 (WebKit Bug #198416, open since 2019). ALL existing adjustments currently fail silently on Safari. Resolve in Phase 1 via runtime feature detection + polyfill (`context-filter-polyfill`) or manual `getImageData` fallback. Do not add more `ctx.filter` usage before choosing the Safari strategy.

2. **Blur performance freezes on large images** — Blur is O(n × r²); dragging the slider on a 4000×3000 image causes 500ms–2s freezes per tick. Must debounce (150–200ms) and/or render preview at 1/4 resolution during drag. This is part of the initial blur implementation, not a follow-up.

3. **Drawing strokes disappear on pipeline re-render** — The render pipeline clears the canvas on every render. Drawing directly to the main canvas is fundamentally broken with this architecture. A separate overlay `<canvas>` must hold pending strokes; they composite into the pipeline output only on "Apply."

4. **Coordinate misalignment with zoom and pan** — Screen pointer coordinates must be un-transformed through CSS display scaling, zoom level, and pan offset to map correctly to image space. A `screenToCanvas()` utility must be built and tested at multiple zoom levels before any pointer-based drawing or text drag feature works.

5. **Preset filters must be separate from manual adjustments** — Implementing presets via `setAdjustment()` calls destroys the user's manual settings. Store `activeFilter: string | null` independently. Compose filter strings as preset + adjustments in `buildFilterString()`. Users can tweak a preset and remove it without losing their manual values.

## Implications for Roadmap

Research points clearly to a four-phase structure following a mandatory Step 0 refactor. All phases are independent of each other in that each delivers shippable value, but they must be built in the stated order due to architectural dependencies.

### Step 0: Refactor `renderToCanvas` Signature
**Rationale:** Every subsequent phase adds parameters to this function. Refactoring to an options object now avoids four rounds of signature changes and cascading call-site updates across `useRenderPipeline`, `downloadImage`, and `applyResize`. One PR, zero risk if done before any feature code.
**Delivers:** Clean options-based `RenderOptions` interface; all existing call sites updated once.
**Avoids:** Cascading churn across all four feature phases.

### Phase 1: Blur, Sharpen, and Safari Compatibility
**Rationale:** Extends the existing pipeline with minimal architectural change. Establishes the pixel-manipulation code path (sharpen convolution). Forces the Safari `ctx.filter` decision now — a fix that benefits all existing adjustments, not just v3.0 blur. Blur performance debouncing is part of the initial implementation. Lowest risk, foundational.
**Delivers:** Blur slider, sharpen slider, Safari-safe filter rendering for all adjustments.
**Addresses:** Blur (table stakes), sharpen (table stakes), blur performance, Safari compatibility.
**Avoids:** Safari `ctx.filter` failure (Pitfall 1), blur performance freeze (Pitfall 6), sharpen-as-CSS-filter mistake (Pitfall 2), blur bleed into background mask edges (integration gotcha).
**Research flag:** Low — blur/sharpen patterns are well-documented. One open question: whether SVG `feConvolveMatrix` via `url()` is reliable enough in Safari/Firefox for the sharpen path. Test both SVG and `getImageData` approaches during implementation; choose based on results.

### Phase 2: Preset Filters
**Rationale:** Depends on the updated `buildFilterString` from Phase 1. Introduces one new store field (`activeFilter`) and one new BottomBar tab, establishing the tab-addition pattern for Phases 3 and 4. No overlay or mode complexity. All preset effects are pure CSS filter string compositions — zero pixel manipulation.
**Delivers:** 8-10 named filter presets with visual selection UI; preset/adjustment interaction model (independent, composing).
**Addresses:** Preset filters (table stakes), preset/adjustment independence requirement.
**Avoids:** Preset-overwrites-adjustments conflict (Pitfall 5), greyscale/preset CSS filter ordering bug (integration gotcha).
**Research flag:** None needed — CSS filter string composition is fully documented and proven.

### Phase 3: Text Overlay
**Rationale:** Introduces the edit-until-applied overlay pattern for non-crop features. Uses an HTML `<div>` overlay during editing (native text input UX) and `ctx.fillText` on apply. Simpler than drawing: no real-time stroke rendering, no multi-tool management. Validates the "applied overlays composited at render time" architecture before drawing depends on it. Establishes the `screenToCanvas` coordinate utility that drawing will reuse.
**Delivers:** Text overlay with drag-to-position, font/size/color controls, bold/italic, edit-until-applied workflow, baked-in on apply.
**Addresses:** Text overlay (table stakes), drag-to-position (table stakes).
**Avoids:** Canvas-only text that cannot be edited after placement (Pitfall 8), pixel-coordinate storage that breaks on zoom/resize (Pitfall 4).
**Research flag:** Low — HTML overlay + `ctx.fillText` pattern is well-understood. Main implementation validation: font rendering parity between HTML preview and canvas apply output; test with multiple fonts and small sizes.

### Phase 4: Drawing and Annotation
**Rationale:** Most complex feature. Depends on the overlay canvas pattern (a second `<canvas>` element, not HTML), the `screenToCanvas` utility from Phase 3, and the `exitAllModes()` mode-exclusivity helper validated in Phase 3. Multiple tools (pen, arrow, rect, circle, line) share infrastructure. Per-stroke undo via array pop is built into the design.
**Delivers:** Freehand pen (quadratic Bezier-smoothed), arrow, rectangle, circle, and line annotations; color/thickness controls; per-stroke undo; clear-all; edit-until-applied with overlay canvas.
**Addresses:** All annotation tools (table stakes), smooth freehand (P2 differentiator).
**Avoids:** Drawing to main canvas causing strokes to vanish on re-render (Pitfall 7), coordinate misalignment (Pitfall 4 — solved by Phase 3 utility), drawing/pan pointer conflict (mode-exclusivity gotcha).
**Research flag:** Low — pen, shapes, and arrowhead trigonometry are standard patterns with no ambiguity. Main effort is implementation volume, not research.

### Phase Ordering Rationale

- **Step 0 before everything:** Signature refactor is a pure enabler. Easier before new parameters exist than after.
- **Filters before overlays:** Blur/sharpen and presets are independent of the overlay pattern. Building them first validates pipeline extension before introducing overlay complexity.
- **Phase 1 before Phase 2:** `buildFilterString` changes in Phase 1 are a prerequisite for preset filter string composition in Phase 2.
- **Text before drawing:** Text validates "composited at render time" with simpler state (one object vs. array of paths). It also establishes the `screenToCanvas` utility drawing needs. Text mistakes are cheaper to learn from.
- **Drawing last:** Highest complexity, most failure modes, requires every prior pattern to be in place.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (blur/sharpen):** Two open questions need resolution during implementation: (a) whether SVG `feConvolveMatrix` via `ctx.filter = "url(#id)"` is reliable in Safari and Firefox (have the `getImageData` fallback ready), and (b) which Safari strategy to adopt — polyfill (`context-filter-polyfill`) vs. manual `getImageData` fallback vs. scoped support declaration. Test on actual Safari before writing Phase 1 implementation code.

Phases with standard patterns (research-phase not needed):
- **Step 0:** Mechanical refactor, no ambiguity.
- **Phase 2:** Pure CSS filter string composition. Fully documented by MDN.
- **Phase 3:** HTML overlay + `ctx.fillText`. Established pattern in this codebase already (see CropOverlay).
- **Phase 4:** Overlay canvas + pointer events + basic trigonometry. Well-documented; effort is implementation volume, not research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All choices rely on MDN-documented native browser APIs and already-installed packages. Zero new dependencies means zero version risk. The SVG `feConvolveMatrix` sharpen path is the only unvalidated approach; a `getImageData` fallback exists and is equally well-documented. |
| Features | HIGH | Scope is tightly bounded by PROJECT.md constraints. Table-stakes features are consistent across research and competitor analysis. Anti-features are well-reasoned against architecture constraints. |
| Architecture | HIGH | Research is grounded in the actual codebase (real file names, function signatures, store shape). All patterns extend proven patterns already present in the project (edit-until-apply from crop, overlay positioning from CropOverlay, percentage coordinates from crop). |
| Pitfalls | HIGH | Safari `ctx.filter` gap confirmed by Can I Use data and WebKit bug tracker. Performance characteristics confirmed by browser bug reports. Coordinate transform requirements confirmed by existing crop implementation. |

**Overall confidence:** HIGH

### Gaps to Address

- **Safari `ctx.filter` baseline (confirm before Phase 1):** Test the current app on Safari immediately to confirm whether existing brightness/contrast/saturation sliders already fail. If they do, this is a pre-existing bug that blocks all filter work on iOS. The resolution (polyfill vs. `getImageData` fallback) must be decided before Phase 1 work begins.
- **SVG filter `url()` reliability in Firefox and Safari:** The recommended sharpen approach uses `ctx.filter = "url(#sharpen-N)"`. Validate with a quick prototype before committing to it. `getImageData` pixel convolution is the trivially available fallback.
- **Bottom bar tab count on mobile:** Adding 3 tabs (Filters, Text, Draw) to the existing 6 creates 9 icon-only tabs at ~35px each = 315px on a 320px screen. Test on actual mobile hardware before finalizing tab layout. Fallback: merge Filters into the Adjustments tab as a sub-section, keeping new standalone tabs to 2.
- **Font rendering parity (HTML vs. canvas):** The text overlay shows an HTML `<div>` during editing and switches to `ctx.fillText` on apply. Minor differences in kerning and anti-aliasing are expected and acceptable; validate during Phase 3 that they do not produce a jarring visual shift, particularly at small font sizes.

## Sources

### Primary (HIGH confidence)
- [MDN: CanvasRenderingContext2D.filter](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter) — `ctx.filter` CSS string support, blur syntax, Baseline 2024 status
- [MDN: fillText / TextMetrics](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillText) — canvas text rendering and bounding box measurement
- [MDN: feConvolveMatrix](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feConvolveMatrix) — SVG convolution filter for sharpening
- [MDN: Pixel manipulation with canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas) — ImageData, getImageData, putImageData
- [MDN: Drawing shapes with canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_shapes) — path, arc, rect, shape drawing reference
- [MDN: CSS filter functions](https://developer.mozilla.org/en-US/docs/Web/CSS/filter) — sepia, hue-rotate, and other preset filter functions
- [Can I Use: CanvasRenderingContext2D.filter](https://caniuse.com/mdn-api_canvasrenderingcontext2d_filter) — Safari support status: disabled by default through Safari 26.4
- [WebKit Bug #198416](https://bugs.webkit.org/show_bug.cgi?id=198416) — ctx.filter disabled in Safari, open since 2019
- Existing codebase (`src/utils/canvas.ts`, `src/store/editorStore.ts`, `src/hooks/useRenderPipeline.ts`, `src/components/Canvas.tsx`, `src/components/BottomBar.tsx`) — primary architectural source

### Secondary (MEDIUM confidence)
- [web.dev: Image filters with canvas](https://web.dev/canvas-imagefilters/) — convolution kernel patterns, sharpen kernel values `[0,-1,0,-1,5,-1,0,-1,0]`
- [IMG.LY: How to apply filters in JavaScript](https://img.ly/blog/how-to-apply-filters-in-javascript/) — CSS filter composition techniques
- [Viget: Instagram-style filters in HTML5 Canvas](https://www.viget.com/articles/instagram-style-filters-in-html5-canvas) — preset filter CSS recipes
- [Coding Dude: CSS Image Effects for Vintage Photos](https://www.coding-dude.com/wp/css/css-image-effects/) — warm/cool/vintage filter CSS recipes
- [Envato Tuts+: Canvas Drawing Tool with Vanilla JavaScript](https://webdesign.tutsplus.com/how-to-create-a-canvas-drawing-tool-with-vanilla-javascript--cms-108856t) — freehand drawing implementation patterns
- [Mozilla Bug #1498291](https://bugzilla.mozilla.org/show_bug.cgi?id=1498291) — CSS blur effects performance characterization

### Tertiary (LOW confidence)
- [GitHub Gist: mikecao sharpen function](https://gist.github.com/mikecao/65d9fc92dc7197cb8a7c) — reference pixel-level sharpen kernel implementation; math is standard, source is community
- [context-filter-polyfill (GitHub: davidenke)](https://github.com/davidenke/context-filter-polyfill) — potential Safari `ctx.filter` polyfill; needs evaluation before adoption

---
*Research completed: 2026-03-14*
*Ready for roadmap: yes*
