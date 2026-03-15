# Feature Research

**Domain:** Browser-based image editor -- blur/sharpen filters, preset image filters, text overlay, drawing/annotation tools
**Researched:** 2026-03-14
**Confidence:** HIGH

## Context

This is a subsequent milestone (v3.0) for WebImager. The existing editor already ships: upload, crop, resize, rotate/flip, brightness/contrast/saturation/greyscale adjustments, AI background removal with color replacement, zoom/pan, transparency-aware export, and a glassmorphism bottom bar UI with 6 tabs. All processing is client-side via Canvas 2D API with a non-destructive render pipeline (`renderToCanvas()` rebuilds from `sourceImage` + parameters on every change).

This research focuses on the four new feature areas: blur/sharpen filters, preset filters, text overlay, and drawing/annotation.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any image editor that advertises filters, text, and drawing. Missing any of these makes the feature feel half-baked.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Gaussian blur with intensity slider | Every image editor has blur; the most basic filter operation | LOW | `ctx.filter = "blur(Npx)"` -- GPU-accelerated via the same CSS filter pipeline already used for brightness/contrast. Slots directly into existing `buildFilterString()`. Add a `blur: number` field to `Adjustments` (default 0, range 0-20px). |
| Sharpen with intensity slider | Users expect sharpen as the counterpart to blur | MEDIUM | No native `ctx.filter` sharpen exists. Requires convolution kernel via `getImageData`/`putImageData` pixel manipulation. Standard 3x3 kernel: `[0,-1,0, -1,5,-1, 0,-1,0]`. Intensity controlled by interpolating between identity kernel `[0,0,0, 0,1,0, 0,0,0]` and sharpen kernel. This is a new code path -- the existing pipeline uses only CSS filters. |
| 8-10 preset filters (sepia, vintage, warm, cool, B&W, etc.) | Instagram/phone cameras trained users to expect one-click filter presets | LOW | Achievable entirely via CSS filter string combinations (see Preset Filter Recipes below). No pixel manipulation needed. UI: grid of named buttons in a panel. Clicking one sets the filter, clicking again or "None" removes it. |
| Text overlay with font size and color | Minimum viable text tool; users need to put captions/labels on images | MEDIUM | Render via `ctx.fillText()` on an overlay canvas. Store as state object `{text, x, y, fontSize, color, fontFamily}` until applied. The overlay canvas is the key architectural addition. |
| Text drag-to-position | Users expect to place text by dragging, not entering coordinates | MEDIUM | Hit-testing on text bounding box via `ctx.measureText()`. Pointer events for drag. Must convert screen coordinates to image coordinates using inverse of zoom/pan transform: `imageX = (screenX - panOffset.x) / zoomLevel`. |
| Freehand pen drawing | Core annotation tool; users expect to scribble/mark up images | MEDIUM | Capture `pointermove` events, store as array of `{x,y}` points in image space. Render via `ctx.beginPath(); ctx.moveTo(); ctx.lineTo()` sequence. Use `ctx.lineJoin = "round"; ctx.lineCap = "round"` for smooth strokes. |
| Drawing color picker | Users need to choose annotation color | LOW | Preset color swatches (red, blue, green, yellow, white, black) plus optional `<input type="color">` for custom. Shared between text and drawing tools. |
| Drawing thickness control | Thin lines for detail, thick for emphasis | LOW | 3-4 preset sizes (2px, 4px, 8px, 16px) or a slider. Maps to `ctx.lineWidth`. |
| Rectangle shape annotation | Most basic shape for highlighting regions | LOW | Two-point interaction: pointerdown for corner 1, drag to corner 2. Render via `ctx.strokeRect()`. |
| Arrow annotation | The most-used annotation shape -- "look here" | MEDIUM | Line with arrowhead. Arrowhead requires trigonometry: compute angle from line direction, draw triangle at endpoint. ~20 lines of math, not complex but needs care. |
| Edit-until-applied pattern for text and drawing | PROJECT.md explicitly requires this; matches existing crop UX | MEDIUM | All overlays render on a separate canvas layer above the image canvas. "Apply" flattens them onto the image. Until applied, elements are movable/editable/deletable. This is the same modal pattern as crop mode. |
| Live preview for blur intensity | Users expect to see blur change as they drag the slider | LOW | Blur via `ctx.filter` is GPU-accelerated and renders instantly at any image size. Same live-preview behavior as existing brightness/contrast sliders. |
| Live preview for sharpen intensity | Users expect the same responsiveness as blur | MEDIUM | Sharpen via pixel manipulation is CPU-bound. For images > 2 megapixels, full-resolution sharpen on every slider tick will cause jank. Needs throttle/debounce: either render preview at reduced resolution during drag, or apply sharpen only on pointer release. |

### Differentiators (Competitive Advantage)

Not expected in a lightweight browser editor, but would impress users and set WebImager apart.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Filter strength slider on presets | Most preset filters are binary on/off. A 0-100% strength slider lets users dial in the exact amount. Implementation: scale CSS filter parameter values proportionally (e.g., sepia at 50% strength = `sepia(40%)` instead of `sepia(80%)`). | MEDIUM | Strong differentiator -- most lightweight editors lack this. For CSS-filter-based presets, multiply each parameter by the strength percentage. |
| Smooth freehand with curve interpolation | Raw pointermove data produces jagged paths with too many points. Using quadratic Bezier curves between midpoints of consecutive segments produces smooth, professional-looking strokes. | LOW | ~20 lines of code. Use `ctx.quadraticCurveTo()` with midpoints as control points. Significant visual improvement over raw line segments. |
| Preset filter preview thumbnails | Show a small preview of each filter applied to the current image, like Instagram's filter picker | MEDIUM | Generate by rendering source at ~60x60px with each filter applied. Cache until image changes. Requires 8-10 mini canvas renders on image load (fast at thumbnail size). Major UX improvement. |
| Circle/ellipse shape | Adds versatility for highlighting round areas (faces, buttons) | LOW | `ctx.ellipse()` or `ctx.arc()`. Same two-point bounding-box interaction as rectangle. |
| Line shape | Simple straight line annotation | LOW | Two points, `ctx.moveTo(); ctx.lineTo()`. Trivial alongside arrow. |
| Text font family selector | Let users choose from 4-5 web-safe fonts | LOW | Sans-serif, serif, monospace, handwriting (cursive), display. `ctx.font` accepts CSS font strings. Keep selection small to avoid choice paralysis. |
| Undo last drawing stroke | Delete the most recent pen stroke or shape | LOW | Maintain an array of drawing operations. Pop the last one. Re-render remaining. Critical for usability -- without this, any mistake means clearing everything. |
| Clear all annotations button | Reset all text and drawings at once | LOW | Clear overlay canvas and empty operations array. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full layer system with per-layer opacity/blending | "Real" editors have layers | Fundamentally changes architecture from parameter-based pipeline to scene graph. Massive scope. PROJECT.md explicitly excludes this. | Edit-until-applied pattern: overlays are editable until flattened. 90% of the UX at 10% of the complexity. |
| Full undo/redo for all operations | Users want to undo everything | Requires either command pattern (inverse operations) or state snapshots (full ImageBitmap per step -- memory intensive). Listed as future candidate, not v3.0. | Per-tool undo: undo last stroke, undo text placement. Blur/sharpen/filters are non-destructive sliders (just move them back). Crop already has undo. |
| Rich text formatting (bold/italic/mixed sizes) | "Real" text tools have formatting | Canvas `fillText` does not support inline formatting. Each styled segment requires separate measuring and positioning. Complex layout logic for minimal gain. | Single-style text blocks: one font, one size, one color per element. Add multiple text elements for different styles. |
| Custom filter creation (adjust matrix values) | Power users want custom filters | Exposes convolution kernels and color matrices -- confuses 99% of users. Complex UI for minimal value. | 8-10 well-curated presets cover virtually all use cases. |
| Bezier pen tool (vector paths) | Design tools like Figma have this | Vector path editing is an entirely different interaction paradigm. Massive implementation effort. Not expected in a photo editor. | Freehand pen with smooth curves plus basic shapes. |
| Selective area blur (blur brush) | Blur just a face or region | Requires mask painting + per-pixel conditional blur. Introduces layer/mask complexity that PROJECT.md explicitly excludes. | Full-image blur with adjustable intensity. Users needing selective blur can crop-blur-recomposite externally. |
| Pressure-sensitive drawing | Drawing tablets support pressure for variable line width | Requires Pointer Events pressure API, variable-width stroke rendering (not a single `lineWidth`), and complex path rendering. Small user base. | Uniform-width strokes. Clean and predictable. |
| Text effects (shadow, outline, gradient) | Design tools offer these | Each effect adds UI controls and rendering complexity. `ctx.strokeText()` for outline is doable but shadow/gradient require multi-pass rendering. Scope creep. | Clean solid-color text. Users needing effects should use Canva/Figma. |

## Feature Dependencies

```
[Blur slider]
    (no dependencies -- extends existing buildFilterString())

[Sharpen slider]
    (no dependencies on other v3 features -- but requires new getImageData pixel manipulation path)

[Preset filters]
    └──benefits from──> [Blur] (some presets could include blur)
    └──benefits from──> [Sharpen] (some presets could include sharpen)
    └──independent of──> [Text and Drawing]

[Overlay canvas layer] (KEY ARCHITECTURAL ADDITION)
    └──enables──> [Text overlay]
    └──enables──> [Freehand drawing]
    └──enables──> [Shape annotation]
    └──enables──> [Edit-until-applied pattern]
    └──requires──> [Screen-to-image coordinate transform]

[Text overlay]
    └──requires──> [Overlay canvas layer]
    └──requires──> [Screen-to-image coordinate transform]
    └──shares UI──> [Color picker] with [Drawing tools]

[Freehand drawing]
    └──requires──> [Overlay canvas layer]
    └──requires──> [Drawing state management] (operations array)

[Shape annotation (arrow, rect, circle, line)]
    └──requires──> [Overlay canvas layer]
    └──shares──> [Drawing state management] with [Freehand drawing]
    └──shares UI──> [Color picker, thickness control] with [Freehand drawing]

[Apply/flatten action]
    └──requires──> [Overlay canvas layer]
    └──composites overlay onto image canvas, creates new sourceImage
```

### Dependency Notes

- **Overlay canvas layer is the single most important architectural addition.** A second `<canvas>` positioned over the image canvas, sharing identical zoom/pan CSS transforms, holding all editable annotations. This enables text, drawing, and shapes simultaneously. When "Apply" is called, the overlay composites onto the image at image-space resolution (not screen resolution) and becomes the new `sourceImage`.
- **Screen-to-image coordinate transform is critical.** With zoom/pan active, screen coordinates from pointer events must map to image-space coordinates: `imageX = (screenX - canvasRect.left - panOffset.x) / zoomLevel`. The existing `zoomLevel` and `panOffset` in the store provide the data; the inverse transform is straightforward but must be pixel-accurate.
- **Blur/sharpen and preset filters are completely independent of text/drawing.** They extend the existing non-destructive Adjustments pipeline. Can be built in total isolation as a first phase.
- **Text and drawing share the overlay canvas, color picker, and apply mechanism.** Building them in the same phase avoids duplicating the overlay infrastructure. However, text and drawing are independent of each other and could theoretically be split.

## Implementation Phases

### Phase 1: Filters (blur, sharpen, presets)

Extends existing infrastructure with minimal architectural change.

- [ ] Blur slider (0-20px) -- add `blur` field to `Adjustments`, extend `buildFilterString()`
- [ ] Sharpen slider -- new `applySharpen()` utility using convolution kernel on ImageData, called as post-processing step in render pipeline
- [ ] Sharpen performance strategy: throttle during drag, full-res on release for images > 2MP
- [ ] 8-10 preset filter grid UI in bottom bar panel
- [ ] Preset selection applies a named CSS filter string, overriding/combining with manual adjustments
- [ ] "None" option to clear active preset

### Phase 2: Text overlay

Introduces the overlay canvas architecture.

- [ ] Overlay `<canvas>` element, absolutely positioned over image canvas, matching zoom/pan transforms
- [ ] Screen-to-image coordinate transform utility
- [ ] Text input UI: text field, font size slider, color picker, font family selector
- [ ] Text state object in store: `{text, x, y, fontSize, color, fontFamily}`
- [ ] Drag-to-position via pointer events on overlay canvas
- [ ] Tap-to-edit: clicking existing text re-opens input for editing
- [ ] Apply button: flatten text onto image (composite overlay at image resolution, create new sourceImage)
- [ ] Cancel/delete option before applying

### Phase 3: Drawing and annotation

Shares overlay canvas from Phase 2.

- [ ] Tool selector UI: pen, arrow, rectangle, circle, line
- [ ] Drawing operations array in store: each entry is `{type, points, color, thickness}`
- [ ] Freehand pen: capture pointermove, store points, render with round line caps/joins
- [ ] Shape tools: two-point interaction (pointerdown + drag + pointerup) for arrow, rectangle, circle, line
- [ ] Arrow rendering: line + triangular arrowhead at endpoint using angle math
- [ ] Undo last stroke (pop from operations array, re-render)
- [ ] Clear all annotations button
- [ ] Apply/flatten to commit all drawings to image (same mechanism as text apply)

### Defer to Future

- [ ] Filter strength slider on presets -- nice differentiator, add after core presets work
- [ ] Preset filter preview thumbnails -- polish feature
- [ ] Full undo/redo history -- PROJECT.md lists as future candidate
- [ ] Text effects (shadow, outline) -- scope creep

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Blur slider | HIGH | LOW | P1 |
| Sharpen slider | HIGH | MEDIUM | P1 |
| Preset filters (8-10) | HIGH | LOW | P1 |
| Overlay canvas layer | HIGH (enables text+drawing) | MEDIUM | P1 |
| Text overlay with drag positioning | HIGH | MEDIUM | P1 |
| Freehand pen drawing | HIGH | MEDIUM | P1 |
| Arrow annotation | HIGH | MEDIUM | P1 |
| Rectangle annotation | MEDIUM | LOW | P1 |
| Circle annotation | MEDIUM | LOW | P1 |
| Line annotation | MEDIUM | LOW | P1 |
| Color picker + thickness controls | HIGH | LOW | P1 |
| Edit-until-applied (text + drawing) | HIGH | MEDIUM | P1 |
| Undo last drawing stroke | HIGH | LOW | P1 |
| Clear all annotations | MEDIUM | LOW | P1 |
| Smooth freehand (Bezier curves) | MEDIUM | LOW | P2 |
| Text font family selector | MEDIUM | LOW | P2 |
| Filter strength slider | MEDIUM | MEDIUM | P2 |
| Preset filter thumbnails | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v3.0 launch
- P2: Should have, add if time permits during v3.0
- P3: Nice to have, defer to future

## Preset Filter Recipes

All achievable via CSS filter string combinations through `ctx.filter`, fitting directly into the existing `buildFilterString()` approach. No pixel manipulation needed.

| Preset | CSS Filter String | Character |
|--------|-------------------|-----------|
| **Sepia** | `sepia(80%) saturate(120%) brightness(105%)` | Warm brown tones, classic old-photo look |
| **Vintage** | `sepia(40%) contrast(90%) brightness(105%) saturate(80%)` | Faded, slightly warm, low contrast |
| **Warm** | `sepia(20%) saturate(130%) brightness(105%) hue-rotate(-10deg)` | Pushed toward orange/gold tones |
| **Cool** | `sepia(20%) saturate(110%) brightness(100%) hue-rotate(180deg)` | Pushed toward blue tones |
| **B&W** | `grayscale(100%) contrast(110%)` | High-contrast monochrome |
| **Fade** | `contrast(80%) brightness(110%) saturate(70%)` | Washed-out, low-saturation, dreamy |
| **Vivid** | `saturate(180%) contrast(115%) brightness(102%)` | Punchy, oversaturated colors |
| **Dramatic** | `contrast(140%) brightness(90%) saturate(120%)` | Deep shadows, strong contrast |
| **Noir** | `grayscale(100%) contrast(150%) brightness(90%)` | Film-noir high-contrast B&W |
| **Retro** | `sepia(30%) hue-rotate(340deg) saturate(140%) contrast(90%)` | 70s color cast, warm magenta tint |

**Integration approach:** A preset is a named filter string. When a preset is active, its filter string replaces the manual adjustment sliders' output in `buildFilterString()`. The blur slider should compose with presets (blur + sepia = a blurry vintage look). Sharpen applies as a separate post-processing step regardless.

## Technical Integration Notes

### How blur fits the existing pipeline
Add `blur: number` (default 0) to the `Adjustments` interface. In `buildFilterString()`, append `blur(${adjustments.blur}px)` when non-zero. Composes naturally with existing brightness/contrast/saturation. GPU-accelerated, no performance concern.

### How sharpen fits the existing pipeline
Sharpen cannot use `ctx.filter`. It must run as a post-processing step:
1. `renderToCanvas()` produces the image with all CSS filters applied
2. New `applySharpen(ctx, intensity)` reads pixel data via `getImageData()`
3. Applies 3x3 convolution kernel with intensity-weighted interpolation
4. Writes result via `putImageData()`

For performance on large images: use `requestAnimationFrame` throttling during slider drag, or apply to a downscaled preview canvas and only do full-resolution on slider release.

### Overlay canvas architecture
A second `<canvas>` absolutely positioned over the image canvas in the same container. Both canvases share the same CSS `transform: translate(${panX}px, ${panY}px) scale(${zoom})` so annotations visually align with the image. The overlay canvas dimensions match the image canvas dimensions.

Drawing/text coordinates are stored in image space (0 to imageWidth, 0 to imageHeight), not screen space, so they survive zoom/pan changes.

### Apply/flatten mechanism
When "Apply" is triggered:
1. Create an offscreen canvas at full image resolution
2. Draw the current rendered image onto it
3. Draw the overlay content at image-space coordinates (not screen-scaled)
4. Create new `ImageBitmap` from the composited result
5. Set as new `sourceImage`, reset overlay state
6. This bakes annotations permanently into the image (matches the crop apply pattern)

### Bottom bar tab organization
Adding 3 new features (Filters, Text, Draw) to the existing 6 tabs creates 9 tabs total. On mobile (320px width), 9 icon-only tabs at ~35px each = 315px -- tight but workable. Options if it feels cramped:
- Group "Filters" into the existing "Adjustments" tab as a sub-section (blur/sharpen sliders + preset grid)
- This reduces new tabs to 2 (Text, Draw), total = 8 tabs
- Or: use a horizontally scrollable tab bar on mobile

## Competitor Feature Analysis

| Feature | Photopea (web) | Pixlr E (web) | Canva (web) | WebImager v3 (plan) |
|---------|---------------|---------------|-------------|---------------------|
| Blur | Gaussian + lens + motion blur | Gaussian with radius | Simple blur slider | Single Gaussian blur slider via `ctx.filter` |
| Sharpen | Unsharp mask (amount/radius/threshold) | Sharpen + unsharp mask | None | Single sharpen slider via convolution kernel |
| Filter presets | None (manual adjustments) | ~20 presets with strength | 15+ presets with strength | 8-10 curated presets, no strength slider at launch |
| Text overlay | Full rich text, layers, effects | Text with fonts, effects | Full text with effects | Single-style text, drag to position, edit until applied |
| Freehand drawing | Full brush engine (pressure, opacity) | Pencil/brush tools | Draw tool | Freehand pen, uniform width, smooth curves |
| Shape annotation | Full vector shapes | Basic shapes | Extensive library | Arrow, rectangle, circle, line |
| Edit workflow | Layers (always editable) | Layers (always editable) | Layers (always editable) | Overlay-based edit-until-applied |

**Positioning:** WebImager does not compete with Photopea/Pixlr on feature depth. The value is zero-install, zero-account, privacy-first, fast. These v3.0 features move it from "basic editor" to "capable editor" while keeping the interface simple and the architecture client-side.

## Sources

- [MDN: CanvasRenderingContext2D.filter](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter) -- HIGH confidence. Authoritative reference for supported CSS filter functions on canvas. Confirms blur() is supported, sharpen is not.
- [web.dev: Image filters with canvas](https://web.dev/canvas-imagefilters/) -- HIGH confidence. Convolution kernel patterns, sharpen kernel values `[0,-1,0,-1,5,-1,0,-1,0]`, getImageData/putImageData workflow.
- [MDN: Pixel manipulation with canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas) -- HIGH confidence. ImageData API reference for sharpen implementation.
- [MDN: Drawing shapes with canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_shapes) -- HIGH confidence. Path, arc, rect, and shape drawing reference.
- [MDN: CSS filter functions](https://developer.mozilla.org/en-US/docs/Web/CSS/filter) -- HIGH confidence. Complete list of filter functions (sepia, hue-rotate, etc.) used in preset recipes.
- [IMG.LY: How to Apply Custom Image Filters in JavaScript](https://img.ly/blog/how-to-apply-filters-in-javascript/) -- MEDIUM confidence. Practical convolution filter implementation patterns.
- [Coding Dude: CSS Image Effects for Vintage Photos](https://www.coding-dude.com/wp/css/css-image-effects/) -- MEDIUM confidence. Warm/cool/vintage filter recipes using CSS filter combinations.
- [Envato Tuts+: Canvas Drawing Tool with Vanilla JavaScript](https://webdesign.tutsplus.com/how-to-create-a-canvas-drawing-tool-with-vanilla-javascript--cms-108856t) -- MEDIUM confidence. Freehand drawing implementation patterns without libraries.

---
*Feature research for: WebImager v3.0 Editing Power (blur/sharpen, presets, text, drawing)*
*Researched: 2026-03-14*
