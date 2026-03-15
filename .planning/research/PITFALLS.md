# Pitfalls Research

**Domain:** Adding blur/sharpen filters, preset image filters, text overlay, and drawing/annotation to an existing Canvas 2D image editor with non-destructive render pipeline
**Researched:** 2026-03-14
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: ctx.filter Does Not Work on Safari -- Blur and Existing Adjustments Are Silently Broken

**What goes wrong:**
The project uses `ctx.filter = buildFilterString(adjustments)` for brightness, contrast, saturation, and greyscale. Adding blur via `ctx.filter = 'blur(5px)'` follows the same pattern. However, `CanvasRenderingContext2D.filter` is disabled by default in Safari (all versions through Safari 26.4 as of March 2026). This means ALL existing adjustment features (brightness, contrast, saturation, greyscale) and any new blur filter silently do nothing on Safari. The image renders without any adjustments applied.

**Why it happens:**
The `ctx.filter` property has 80.94% global browser support (Chrome 52+, Firefox 49+, Edge 79+) but Safari has never shipped it enabled by default. WebKit bug #198416 tracks this. The existing v1.0/v2.0 decision to use `ctx.filter` was noted as "GPU-accelerated, no pixel manipulation needed" but the Safari gap was not flagged. Developers testing on Chrome never notice the issue.

**How to avoid:**
- **Option A (recommended):** Detect `ctx.filter` support at runtime. If unsupported, fall back to manual pixel manipulation via `getImageData`/`putImageData` for adjustments and blur. This is slower but universal.
- **Option B:** Use the `context-filter-polyfill` library (GitHub: davidenke/context-filter-polyfill) which polyfills `ctx.filter` for Safari using `getImageData` internally.
- **Option C:** Accept Safari limitation and document it. This is the path of least resistance but means ~18% of desktop users and nearly all iOS users get no adjustments at all.
- For v3.0, if adding blur via `ctx.filter`, the Safari issue compounds -- now users lose blur AND all existing adjustments.
- Test the existing app on Safari right now to confirm whether adjustments already fail.

**Warning signs:**
- No browser detection or feature detection for `ctx.filter` in the codebase
- No polyfill or fallback path in `buildFilterString` or `renderToCanvas`
- All testing done on Chrome/Firefox only
- No Safari-specific test cases in the test suite
- Users on Safari/iOS reporting "adjustments do nothing"

**Phase to address:**
Blur/sharpen phase. Before adding blur via `ctx.filter`, decide on the Safari strategy. If choosing to polyfill or implement manual fallback, the fix benefits blur AND all existing adjustments simultaneously.

---

### Pitfall 2: Sharpen Has No ctx.filter Equivalent -- Requires Manual Pixel Convolution

**What goes wrong:**
Developers assume `ctx.filter = 'sharpen(1)'` exists analogously to `blur()`. It does not. The CSS/Canvas filter API provides `blur()`, `brightness()`, `contrast()`, `saturate()`, `grayscale()`, `sepia()`, `hue-rotate()`, `invert()`, `opacity()`, and `drop-shadow()`. There is no `sharpen()` filter. Sharpen requires manual convolution kernel processing via `getImageData`/`putImageData`.

**Why it happens:**
Blur is a standard CSS filter function. Developers see blur in the filter API and assume sharpen is its complement. It is not -- sharpen is a convolution operation that requires reading and writing individual pixels. The newer `CanvasFilter` API has `convolveMatrix` which could theoretically do this, but it has even worse browser support than `ctx.filter`.

**How to avoid:**
- Implement sharpen as a convolution kernel: `[0, -1, 0, -1, 5, -1, 0, -1, 0]` (standard 3x3 sharpen kernel)
- Use `getImageData` to read pixels, apply the convolution, `putImageData` to write the result
- This is a fundamentally different code path from `ctx.filter`-based adjustments -- plan the architecture accordingly
- Since sharpen already requires `getImageData`/`putImageData`, consider whether blur should also use manual convolution for consistency and Safari compatibility (see Pitfall 1)
- Keep the source/result buffers separate -- convolution cannot be done in-place (reading pixels you have already modified produces incorrect results)

**Warning signs:**
- Code tries to use `ctx.filter = 'sharpen(...)'` (will silently produce "none" filter)
- Sharpen implementation modifies pixel buffer in-place during convolution (causes smearing)
- No separate input/output buffer in the convolution code
- Performance is not tested on large images (convolution on a 4000x3000 image = 36M pixel operations per kernel element)

**Phase to address:**
Blur/sharpen phase. Sharpen must be architecturally designed before implementation because it introduces a new rendering approach (pixel manipulation) that the current pipeline does not use.

---

### Pitfall 3: Freehand Drawing and Text Cannot Be Non-Destructive Parameters Like Existing Edits

**What goes wrong:**
The existing pipeline renders everything from parameters: source image + transforms + adjustments + crop + mask = rendered output. Every render is a fresh pass from the source. Freehand drawing strokes and text overlays are spatial data (pixel positions, paths, strings with positions) that cannot be expressed as simple numeric parameters. Developers try to force them into the existing `renderToCanvas` function, making it impossibly complex, or they render directly to the display canvas and lose the drawing when the next render pass clears it.

**Why it happens:**
The non-destructive pipeline works by clearing the canvas and re-rendering from source on every state change. This is correct for transforms and adjustments. But drawing strokes are additive content -- they are layered ON TOP of the rendered image. If you re-render the image, the strokes are gone. If you bake the strokes into the source image, they become destructive (cannot be moved/edited/removed).

**How to avoid:**
- Use the "edit-until-applied" pattern already established by crop: strokes and text are editable overlays UNTIL the user explicitly applies them, at which point they are rasterized onto the source image
- Store pending drawing strokes as an array of path data (points, color, thickness) in Zustand state
- Store pending text as an object (text, font, size, color, x, y position) in Zustand state
- Render the base image via the existing pipeline, THEN draw pending strokes/text on top in a second pass
- When applied, render everything to an offscreen canvas, create a new `ImageBitmap`, and replace `sourceImage` -- this is exactly what `applyResize` already does
- After applying, clear the pending strokes/text state
- This means applied drawings become permanent and cannot be individually undone (same as crop behavior)

**Warning signs:**
- Trying to store drawing paths inside the `renderToCanvas` function's parameter list
- Drawing directly to `canvasRef` without going through the render pipeline
- Strokes disappear when the user adjusts brightness or rotates the image
- Text overlay position shifts when the canvas re-renders
- No "Apply" button for drawing/text (immediate destructive rendering)

**Phase to address:**
Drawing/annotation phase AND text overlay phase. The architectural pattern must be decided before either feature is built. Both features share the same "overlay until applied" lifecycle.

---

### Pitfall 4: Drawing/Text Coordinates Misalign with Zoom, Pan, and CSS Scaling

**What goes wrong:**
The user draws on the canvas while zoomed to 200% and panned to the right. The stroke appears in the wrong position because the pointer event coordinates are in screen space, but the canvas pixels are in image space. The CSS `transform: translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})` applied to the canvas wrapper means pointer coordinates must be un-transformed before mapping to canvas pixel coordinates.

**Why it happens:**
The Canvas component already handles this for crop (the CropOverlay uses percentage-based coordinates relative to the canvas rect). But drawing requires mapping screen coordinates to actual canvas pixel positions. There are THREE coordinate transformations in play: (1) CSS display scaling (canvas is fit-to-view, so its CSS size differs from its pixel dimensions), (2) zoom level (CSS `scale()` transform), and (3) pan offset (CSS `translate()` transform). Missing any one of these produces off-by-hundreds-of-pixels errors.

**How to avoid:**
- Create a utility function `screenToCanvas(clientX, clientY, canvasEl, zoomLevel, panOffset) => { x: number, y: number }` that handles all three transformations
- Step 1: Subtract the canvas element's bounding rect position to get coordinates relative to the element
- Step 2: Undo the CSS zoom/pan transform: `x = (clientX - panOffset.x) / zoomLevel`, `y = (clientY - panOffset.y) / zoomLevel`
- Step 3: Scale from CSS display size to canvas pixel dimensions: `x = x * (canvas.width / cssWidth)`, `y = y * (canvas.height / cssHeight)`
- Use this same utility for both drawing AND text drag positioning
- Test with: zoom at 100% (no transform), zoom at 200% centered, zoom at 200% panned, and at 25% (minified)

**Warning signs:**
- Drawing works at 100% zoom but strokes appear offset when zoomed in
- Strokes appear in the correct relative position but shift when panning
- Text drag positioning jumps to a different location on first move
- Drawing on a cropped image places strokes at incorrect positions
- No coordinate transformation utility shared between drawing and text features

**Phase to address:**
Drawing/annotation phase (first of the two overlay features). Build and test the coordinate mapping utility here so text overlay can reuse it.

---

### Pitfall 5: Preset Filters (Sepia, Vintage, etc.) Conflict with User Adjustments

**What goes wrong:**
The user sets brightness to 120% and contrast to 80%. Then they apply a "Vintage" preset that sets sepia + reduced saturation + warm tint. The preset overwrites the user's adjustments, or the adjustments and preset stack in an unexpected way (double-brightness, wrong color balance). The user has no way to get their manual adjustments back.

**Why it happens:**
Preset filters are conceptually a set of adjustments. The current `Adjustments` interface has `brightness`, `contrast`, `saturation`, and `greyscale`. A "Vintage" preset wants to set specific values for these AND add new properties (sepia, hue-rotate, color matrix). If presets modify the same `adjustments` state, they destroy the user's manual settings. If presets are a separate layer, the stacking order (preset first or adjustments first) affects the result.

**How to avoid:**
- Presets should be a SEPARATE state property, not modifications to `adjustments`. Store `activePreset: string | null` in the editor store.
- Build the filter string by composing preset filters THEN user adjustments: `ctx.filter = buildPresetString(preset) + ' ' + buildFilterString(adjustments)`. CSS filter functions compose left-to-right.
- This means the preset provides a "base look" and user adjustments fine-tune on top. Users can change presets without losing their brightness/contrast tweaks.
- Alternatively, presets could be a fixed set of filter values that replace adjustments, with a "Reset adjustments" action. This is simpler but less flexible.
- Either way, define the interaction model BEFORE implementing: does applying a preset reset adjustments? Stack with them? Replace them?

**Warning signs:**
- Preset implementation directly calls `setAdjustment` for each property
- No way to remove a preset without resetting all adjustments
- Preset + adjustment interaction not specified in requirements
- Filter string has conflicting values (e.g., `saturate(150%) saturate(80%)` -- which wins?)
- No "None" or "Original" preset option to clear the preset

**Phase to address:**
Preset filters phase. Must decide the preset/adjustment interaction model before building the UI.

---

### Pitfall 6: Blur on Large Images Causes Multi-Second Freeze During Live Preview

**What goes wrong:**
The user drags a blur slider. On every slider value change, the render pipeline re-renders the full image with `ctx.filter = 'blur(Xpx)'`. For a 4000x3000 image, Gaussian blur is computationally expensive -- each pixel requires sampling a kernel proportional to the blur radius. At blur radius 10px, this is ~400 samples per pixel times 12M pixels. The browser freezes for 500ms-2s on each slider tick, making the slider feel broken.

**Why it happens:**
The existing adjustments (brightness, contrast, saturation) are cheap `ctx.filter` operations -- they are per-pixel multiplications with no neighbor sampling. Blur is fundamentally different: it is an O(n * r^2) operation where n = pixel count and r = blur radius. The current pipeline re-renders on every state change with no throttling or preview optimization.

**How to avoid:**
- **Debounce or throttle** the blur slider: only re-render after the user stops dragging for 150-200ms, showing the last rendered frame during drag
- **Preview at reduced resolution:** During slider interaction, render to a canvas at 1/4 resolution (1000x750 instead of 4000x3000), then render full resolution on slider release
- **Use `requestAnimationFrame`** instead of synchronous rendering: schedule renders at display refresh rate, skip intermediate values
- The existing pipeline re-renders in a `useEffect` triggered by state changes. Add a debounce wrapper specifically for blur/sharpen values.
- Consider whether blur should be applied to the entire image or just a preview region

**Warning signs:**
- Blur slider moves in visible steps with freezes between each
- Browser shows "long task" warnings in DevTools for blur renders
- No difference in render path between cheap filters (brightness) and expensive filters (blur)
- Slider `onChange` triggers immediate state update with no debouncing
- Testing only done on small images (under 1 megapixel)

**Phase to address:**
Blur/sharpen phase. Performance optimization must be part of the initial blur implementation, not a follow-up -- a laggy slider is unusable.

---

### Pitfall 7: Drawing Strokes Disappear on Every Re-render Because Pipeline Clears Canvas

**What goes wrong:**
The user draws three strokes on the canvas. Then they adjust brightness. The `useRenderPipeline` effect fires, calls `renderToCanvas`, which sets `ctx.canvas.width = rotatedW` (clearing the canvas), and redraws the image. The three strokes are gone because they were drawn directly to the canvas DOM element, not stored as state.

**Why it happens:**
The render pipeline is designed to be stateless: it reads state (source, transforms, adjustments, crop, mask) and produces a fresh canvas output. Anything drawn directly to the canvas outside this pipeline is transient. This is correct behavior for the pipeline -- the problem is drawing to the same canvas the pipeline manages.

**How to avoid:**
- **Overlay canvas approach (recommended):** Add a second `<canvas>` element positioned absolutely on top of the main canvas. Drawing strokes go on the overlay canvas. The main canvas is managed by the render pipeline as before. The overlay canvas is only cleared/redrawn from the stored stroke state, not by the render pipeline.
- The overlay canvas must be sized and positioned identically to the main canvas, including zoom/pan transforms
- When the user clicks "Apply," render both canvases to an offscreen canvas, create a new `ImageBitmap`, and replace `sourceImage` (same pattern as `applyResize`)
- Store strokes as `Array<{ points: {x,y}[], color: string, thickness: number }>` in Zustand
- On each stroke state change, clear the overlay canvas and redraw all pending strokes
- Text overlays can use either the overlay canvas or a positioned HTML `<div>` (HTML is better for text editing UX)

**Warning signs:**
- Only one `<canvas>` element in the component tree
- Drawing code calls `canvasRef.current.getContext('2d')` directly (same context as render pipeline)
- Strokes vanish when any other state changes (brightness slider, rotate, etc.)
- No stroke storage in Zustand state
- Drawing and pipeline share the same `ctx` reference

**Phase to address:**
Drawing/annotation phase. The overlay canvas architecture must be set up before any drawing code is written.

---

### Pitfall 8: Text Overlay Rendered to Canvas Cannot Be Edited After Placement

**What goes wrong:**
The user adds text "Hello World" at position (100, 200) on the canvas using `ctx.fillText()`. They want to change the font size. But the text is now pixels on the canvas -- there is no object to select, move, or edit. The text is indistinguishable from any other pixel data.

**Why it happens:**
Canvas 2D is an immediate-mode API. Once you draw text with `fillText()`, it becomes pixels. There is no scene graph or object model. Libraries like Fabric.js and Konva.js add object models on top of canvas, but this project explicitly chose vanilla Canvas API ("Image editors don't need object/layer abstractions").

**How to avoid:**
- Keep text as an HTML `<div>` or `<input>` overlay positioned on top of the canvas until applied. This gives you native text editing (cursor, selection, copy/paste), native font rendering, and CSS-based styling for free.
- The text overlay `<div>` must be positioned within the same zoom/pan wrapper as the canvas so it moves and scales together
- Store text state as `{ text: string, fontFamily: string, fontSize: number, color: string, x: number, y: number, bold: boolean, italic: boolean }` in Zustand
- Position the `<div>` using CSS `left`/`top` relative to the canvas wrapper, with coordinates in image-space percentage (like crop does with percentage coordinates)
- On "Apply," render the text to the canvas using `ctx.fillText()` with matching font properties, create a new `ImageBitmap`, replace `sourceImage`
- Font rendering differences between HTML and Canvas: test that `ctx.font` matches the CSS font rendering closely enough. Some differences in kerning and anti-aliasing are inevitable.

**Warning signs:**
- Text rendered directly to canvas with no preview/edit mode
- No HTML overlay element for text input
- Text cannot be repositioned after initial placement
- Text position stored in pixel coordinates instead of percentage-based coordinates
- No "Apply text" button in the UI (text immediately baked into canvas)
- Font rendering looks different between edit mode and applied result

**Phase to address:**
Text overlay phase. The HTML overlay approach must be designed before any text rendering code is written.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Drawing directly to the main canvas (no overlay) | No second canvas to manage | Strokes vanish on every re-render; no edit-before-apply possible | Never -- fundamentally broken with the existing pipeline |
| Implementing blur via ctx.filter only | Simple one-line addition | Does not work on Safari (18% of users); sharpen still needs different path | Acceptable if Safari support is explicitly out of scope |
| Preset filters as adjustment overrides | No new state property needed | Destroys user's manual adjustments; no way to toggle preset independently | Never -- user frustration is immediate |
| Storing drawing coordinates in pixel space | Simpler coordinate math | Breaks when image is cropped, rotated, or resized; coordinates are resolution-dependent | Never -- use image-space coordinates from the start |
| Text as canvas-only (no HTML overlay) | No DOM/Canvas synchronization needed | Cannot edit text after placement; no native text input UX; must implement cursor/selection from scratch | Never -- the complexity of reimplementing text editing in canvas is far worse than the DOM/canvas sync |
| Convolution (sharpen) in main thread synchronously | No worker setup | Freezes UI for 500ms-2s on large images | MVP only if images are capped at 2 megapixels; add debounce at minimum |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Overlay canvas + zoom/pan | Overlay canvas does not follow the CSS transform on the main canvas wrapper | Place the overlay canvas INSIDE the same zoom/pan wrapper div; apply identical `width`/`height` CSS |
| Text HTML overlay + canvas export | HTML text looks different from `ctx.fillText()` result after applying | Match `ctx.font` string exactly to CSS font properties; test with multiple fonts; accept minor anti-aliasing differences |
| Drawing + crop interaction | User draws on cropped image, then undoes crop -- stroke position is wrong | Store stroke coordinates relative to the CURRENT canvas state (post-crop), and when applying, render at those positions on the current output canvas (not the source) |
| Blur + background mask | `ctx.filter = 'blur(5px)'` blurs the ENTIRE canvas including transparent areas, bleeding background color into edges | Apply blur before mask compositing, not after. The existing pipeline already applies `ctx.filter` before `destination-in` compositing. |
| Preset filter + greyscale toggle | Preset sets `sepia(100%)` but greyscale toggle adds `grayscale(100%)` -- `grayscale` after `sepia` produces different result than `sepia` after `grayscale` | Define a fixed filter ordering in `buildFilterString`: greyscale first, then preset, then adjustments. Document the ordering. |
| Freehand drawing + pointer events + zoom panning | Drawing pointerdown conflicts with pan pointerdown -- both want to capture the pointer | Use a tool mode state (`activeTool: 'pan' | 'draw' | 'text' | 'shape'`); pointer handlers check active tool before acting |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Blur re-rendered on every slider tick | Slider stutters, browser DevTools shows "long task" warnings | Debounce blur slider to 150ms; render at reduced resolution during drag | Images > 2 megapixels with blur radius > 5px |
| Sharpen convolution on full-resolution image | 500ms-2s freeze per slider change | Debounce; consider Web Worker for convolution; preview at 1/4 resolution | Images > 3 megapixels |
| Redrawing all strokes on every pointer move | Drawing feels laggy; canvas flickers | Only draw the current stroke incrementally during pointer move; full redraw from stroke array only on stroke completion | > 50 strokes with > 100 points each |
| Creating offscreen canvases per render in the pipeline | GC pressure, memory spikes | Reuse a persistent offscreen canvas (resize instead of recreate) | Rapid slider dragging (60 renders/second) |
| Preset filter applied via getImageData pixel manipulation | 200ms+ per application, laggy preset switching | Use ctx.filter string composition for presets (sepia, hue-rotate, etc. are all CSS filter functions) | Any image > 1 megapixel |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual indicator of active tool mode | User tries to pan but draws instead, or tries to draw but pans | Show active tool in toolbar with highlight; change cursor (crosshair for draw, text cursor for text, grab for pan) |
| Drawing strokes cannot be undone individually | User makes one bad stroke and must undo ALL pending strokes | Support per-stroke undo by popping from the strokes array; this is cheap since strokes are stored as data |
| Preset filter preview requires clicking each one | User must apply-then-undo each preset to compare | Show thumbnail previews of each preset applied to the current image (render at thumbnail size -- 100x75px -- for each preset) |
| Text overlay has no visible bounding box | User cannot tell where text will render; cannot see drag handle | Show a dashed border around the text div during edit mode; show resize handles if font size is adjustable |
| Blur/sharpen slider has no visual reference for "no effect" | User does not know which direction increases/decreases effect | Label the slider: 0 = no effect in center, left = blur, right = sharpen. Or use two separate sliders with 0-100 range each. |
| Applied drawings cannot be removed | User applies drawing then realizes a mistake | Warn before applying: "Drawing will be permanently merged into the image. This cannot be undone." Consider adding undo/redo history (noted as future candidate in PROJECT.md). |

## "Looks Done But Isn't" Checklist

- [ ] **Safari blur:** Open the app on Safari -- verify that blur filter actually applies (ctx.filter may be silently ignored)
- [ ] **Safari adjustments:** Open the app on Safari -- verify that brightness/contrast/saturation sliders actually affect the image (pre-existing ctx.filter issue)
- [ ] **Sharpen at high values:** Set sharpen to maximum on a photo -- verify no pixel overflow artifacts (RGB values clamping to 0-255)
- [ ] **Draw while zoomed:** Zoom to 200%, pan to a corner, draw a stroke -- verify the stroke appears under the cursor, not offset
- [ ] **Draw then rotate:** Draw strokes, then rotate the image 90 degrees -- verify strokes are still visible and correctly positioned (they should be, since strokes are on an overlay that re-renders from state)
- [ ] **Draw then adjust brightness:** Draw strokes, then change brightness -- verify strokes are NOT affected by the brightness change (they are on a separate overlay)
- [ ] **Text then crop:** Place text, apply it, then crop -- verify the text is included in the crop result and positioned correctly
- [ ] **Preset + adjustments:** Apply "Vintage" preset, then adjust brightness to 120% -- verify both the preset look and the brightness increase are visible
- [ ] **Preset then download:** Apply a preset filter, download the image -- verify the downloaded image has the preset applied (filter must be applied during export rendering, not just CSS display)
- [ ] **Apply drawing then download:** Draw strokes, apply them, download -- verify strokes appear in the downloaded image at correct positions and colors
- [ ] **Blur + background removal:** Remove background, apply blur -- verify blur does not bleed the replacement color into the subject edges
- [ ] **Text on transparent background:** Remove background, add text on the transparent area, apply -- verify text renders correctly over transparency
- [ ] **Mobile drawing:** Test freehand drawing on a touch device -- verify touch events produce smooth strokes without triggering page scroll or zoom

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Safari ctx.filter failure | MEDIUM | Add runtime feature detection + polyfill (context-filter-polyfill) or manual getImageData fallback. Affects buildFilterString and renderToCanvas. |
| Sharpen as ctx.filter (impossible) | LOW | Replace with convolution kernel. Isolated to a new utility function. |
| Drawing to main canvas (no overlay) | HIGH | Must add overlay canvas, refactor Canvas component, separate drawing context from render pipeline context. |
| Coordinate misalignment with zoom | MEDIUM | Create screenToCanvas utility and update all pointer handlers. Requires understanding the full transform chain. |
| Preset overwrites adjustments | LOW | Add `activePreset` to store, compose filter strings separately. Isolated to store and buildFilterString. |
| Blur performance on large images | MEDIUM | Add debouncing and/or reduced-resolution preview. Requires changes to useRenderPipeline and slider components. |
| Text baked immediately (no edit mode) | HIGH | Must add HTML overlay, text state management, apply workflow. Requires new component, store additions, and render integration. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Safari ctx.filter | Blur/sharpen (phase 1) | Open app on Safari; adjust brightness slider; verify image changes |
| Sharpen needs convolution | Blur/sharpen (phase 1) | Apply sharpen at intensity 50%; verify image edges are visibly sharpened |
| Drawing disappears on re-render | Drawing/annotation (phase 3 or 4) | Draw 3 strokes, adjust brightness, verify strokes remain visible |
| Coordinate misalignment | Drawing/annotation (phase 3 or 4) | Zoom to 200%, pan right, draw a stroke; verify stroke is under cursor |
| Preset/adjustment conflict | Preset filters (phase 2) | Apply "Vintage" preset, set brightness to 130%; verify both effects are visible; remove preset; verify brightness remains |
| Blur performance | Blur/sharpen (phase 1) | Load 4000x3000 image, drag blur slider from 0 to 10; verify no freeze longer than 200ms |
| Strokes as state | Drawing/annotation (phase 3 or 4) | Draw 5 strokes, apply them, download image; verify all 5 strokes appear in downloaded file |
| Text edit-until-apply | Text overlay (phase 3 or 4) | Add text, drag to reposition, change font size, then apply; verify all edits reflect in final image |
| Tool mode conflicts | Drawing/annotation (phase 3 or 4) | Switch to draw tool, verify panning is disabled; switch to pan tool, verify drawing is disabled |
| Blur + background mask | Blur/sharpen (phase 1) | Remove background, apply blur at radius 5; verify no color bleeding at subject edges |

## Sources

- [CanvasRenderingContext2D.filter - Can I Use](https://caniuse.com/mdn-api_canvasrenderingcontext2d_filter) -- Safari support status: disabled by default through Safari 26.4
- [WebKit Bug #198416 - Support CanvasRenderingContext2D.filter](https://bugs.webkit.org/show_bug.cgi?id=198416) -- Open since 2019, still unresolved
- [context-filter-polyfill (GitHub)](https://github.com/davidenke/context-filter-polyfill) -- Polyfill for ctx.filter on Safari
- [CanvasRenderingContext2D.filter - MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter) -- Filter syntax reference
- [Image filters with canvas - web.dev](https://web.dev/canvas-imagefilters/) -- Convolution kernel implementation patterns
- [Mozilla Bug #1498291 - CSS blur effects highly inefficient in canvas filters](https://bugzilla.mozilla.org/show_bug.cgi?id=1498291) -- Blur performance issues
- [Optimizing canvas - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) -- Canvas performance best practices
- [Exploring canvas drawing techniques - Perfection Kills](https://perfectionkills.com/exploring-canvas-drawing-techniques/) -- Freehand drawing smoothing techniques
- [perfect-freehand (GitHub)](https://github.com/steveruizok/perfect-freehand) -- Pressure-sensitive freehand stroke library
- [JavaScript sharpen convolution function (GitHub Gist)](https://gist.github.com/mikecao/65d9fc92dc7197cb8a7c) -- Manual sharpen kernel implementation
- [Canva Engineering - Behind the Draw](https://www.canva.dev/blog/engineering/behind-the-draw/) -- Production freehand drawing architecture
- [Canvas Transformations - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Transformations) -- Coordinate transformation reference

---
*Pitfalls research for: blur/sharpen filters, preset image filters, text overlay, and drawing/annotation in Canvas 2D image editor*
*Researched: 2026-03-14*
