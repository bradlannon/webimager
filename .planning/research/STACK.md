# Stack Research

**Domain:** Browser-based image editor -- v3.0 editing power features (blur/sharpen, preset filters, text overlay, drawing/annotation)
**Researched:** 2026-03-14
**Confidence:** HIGH

## Executive Summary

All four new feature areas can be built with **zero new dependencies**. The existing Canvas 2D API, `ctx.filter` (CSS filter string syntax), inline SVG filters via `ctx.filter = "url(#id)"`, pixel-level convolution via `getImageData`/`putImageData`, and native canvas drawing primitives (`fillText`, `lineTo`, `arc`, `rect`, `moveTo`) cover every requirement. This aligns with the project's established philosophy of vanilla Canvas API over libraries like Fabric.js/Konva.js.

The only meaningful technical decision is **how** to implement sharpening (pixel-level convolution kernel vs. SVG `feConvolveMatrix` referenced by `url()`). The recommendation is SVG `feConvolveMatrix` for GPU-accelerated sharpening via `ctx.filter = "url(#sharpen)"`, with a pixel-manipulation fallback if cross-browser testing reveals issues.

## Recommended Stack

### Core Technologies -- No New Dependencies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Canvas 2D `ctx.filter` (CSS string) | Baseline 2024 | Blur, preset filter effects (sepia, saturate, hue-rotate, contrast, brightness, invert, grayscale) | Already used in `buildFilterString()` for adjustments. GPU-accelerated. Supported in all modern browsers since Sept 2024. Extend the existing function with `blur()` and preset filter compositions. |
| SVG filter elements (`feConvolveMatrix`) | SVG 1.1, universally supported | Sharpen convolution kernel | `ctx.filter = "url(#filterId)"` references inline `<svg>` filter definitions. GPU-accelerated like CSS filters. Avoids slow `getImageData`/`putImageData` pixel loops for sharpening. Define 3-5 intensity levels as separate SVG filter elements. |
| Canvas 2D drawing API (`fillText`, `measureText`, `lineTo`, `arc`, `rect`, `quadraticCurveTo`) | Stable, universal | Text overlay, freehand drawing, shape annotation | Native canvas primitives. No library needed for freehand paths, arrows, rectangles, circles, lines. |
| FontFace API (`document.fonts`) | Baseline 2024 | Font loading for text overlay | Ensures fonts are loaded before `ctx.fillText()` renders them. Avoids blank-text flash. |
| Zustand (existing, 5.0.x) | Already installed | State for filter settings, text elements, drawing strokes | Extend the store with new slices. No new state library needed. |
| Lucide React (existing, 0.577.x) | Already installed | Icons for new toolbar controls | Has all needed icons (Type, Pencil, Square, Circle, ArrowRight, Minus, Palette, Sliders). |

### Supporting Libraries -- None Required

| Feature Area | Approach | Why No Library |
|--------------|----------|----------------|
| Blur filter | `ctx.filter = "blur(Npx)"` appended to existing filter string | Native CSS filter, GPU-accelerated, one line of code |
| Sharpen filter | SVG `<filter>` with `<feConvolveMatrix>` 3x3 kernel, referenced via `ctx.filter = "url(#sharpen-N)"` | GPU-accelerated via browser SVG filter pipeline. Faster than `getImageData` pixel loops on large images. |
| Preset filters (8-10 presets) | Compositions of CSS filter functions: `sepia()`, `saturate()`, `brightness()`, `contrast()`, `hue-rotate()`, `grayscale()` | All preset styles achievable by composing CSS filter functions. No pixel manipulation needed. |
| Text overlay | `ctx.font`, `ctx.fillStyle`, `ctx.fillText()`, `ctx.measureText()` | Canvas has full text rendering. System fonts cover the need. `measureText()` provides bounding boxes for hit-testing and drag handles. |
| Freehand drawing | `ctx.beginPath()`, `ctx.moveTo()`, `ctx.quadraticCurveTo()`, `ctx.stroke()` | Store point arrays in Zustand. Smooth freehand via quadratic Bezier interpolation between consecutive points. |
| Shape annotation | `ctx.strokeRect()`, `ctx.arc()`, `ctx.moveTo()`/`ctx.lineTo()` for arrows and lines | Rectangles, circles, lines, and arrows are basic canvas primitives. Arrow heads are two short lines at computed angles from the endpoint. |

### Development Tools -- No Changes

Existing Vite 6.x + Vitest 3.x + TypeScript 5.8 + ESLint setup is sufficient. No new dev dependencies.

## Integration with Existing Render Pipeline

### Blur/Sharpen: Extend `buildFilterString()` and `renderToCanvas()`

The existing `buildFilterString()` in `src/utils/canvas.ts` composes CSS filter functions for brightness/contrast/saturation/greyscale. Blur follows the same pattern -- append `blur(Npx)` to the filter string.

Sharpen requires a separate rendering pass because `feConvolveMatrix` is not a CSS filter function; it must be applied via `ctx.filter = "url(#sharpen-id)"` on a separate `drawImage` call before the CSS filters are applied (sharpen the original pixels, then adjust colors/blur).

**New fields in `Adjustments`:**

```typescript
interface Adjustments {
  brightness: number;   // existing
  contrast: number;     // existing
  saturation: number;   // existing
  greyscale: boolean;   // existing
  blur: number;         // NEW: 0-10, maps to blur(Npx)
  sharpen: number;      // NEW: 0-100, maps to SVG filter intensity
  preset: string;       // NEW: 'none' | preset ID
}
```

**Render order in `renderToCanvas()`:**
1. Draw source image with transforms (rotation, flip) -- existing
2. If sharpen > 0: apply SVG convolution filter pass on an offscreen canvas
3. Apply CSS filter string (brightness + contrast + saturation + greyscale + blur + preset) -- extend existing `buildFilterString()`
4. Apply background mask if active -- existing
5. Apply replacement color if active -- existing

### Preset Filter Definitions

Pure data, no library:

```typescript
interface FilterPreset {
  id: string;
  label: string;
  filterString: string;  // CSS filter function composition
}

const PRESETS: FilterPreset[] = [
  { id: 'none',     label: 'Normal',    filterString: '' },
  { id: 'sepia',    label: 'Sepia',     filterString: 'sepia(80%) contrast(105%)' },
  { id: 'vintage',  label: 'Vintage',   filterString: 'sepia(40%) contrast(110%) brightness(90%) saturate(80%)' },
  { id: 'warm',     label: 'Warm',      filterString: 'saturate(130%) sepia(15%) brightness(105%)' },
  { id: 'cool',     label: 'Cool',      filterString: 'saturate(90%) hue-rotate(15deg) brightness(105%)' },
  { id: 'bw',       label: 'B&W',       filterString: 'grayscale(100%) contrast(120%)' },
  { id: 'fade',     label: 'Fade',      filterString: 'contrast(85%) brightness(110%) saturate(80%)' },
  { id: 'vivid',    label: 'Vivid',     filterString: 'saturate(160%) contrast(115%)' },
  { id: 'dramatic', label: 'Dramatic',  filterString: 'contrast(140%) brightness(90%) saturate(120%)' },
  { id: 'noir',     label: 'Noir',      filterString: 'grayscale(100%) contrast(150%) brightness(85%)' },
];
```

Preset thumbnails: render each preset on a tiny (80x80) offscreen canvas from the current image for a visual preset selector strip. Generate once when image loads or preset panel opens.

### Text Overlay: Overlay Canvas + Edit-Until-Apply

Text elements are editable objects until the user clicks "Apply," matching the existing crop UX pattern. Use an **overlay canvas** positioned exactly over the main canvas during text editing mode. When applied, bake text into the main render by drawing it in `renderToCanvas()`.

**State shape:**

```typescript
interface TextElement {
  id: string;
  text: string;
  x: number; y: number;   // percentage-based coordinates (like crop)
  fontFamily: string;      // system font name
  fontSize: number;        // px relative to source image dimensions
  color: string;           // hex or rgba
  bold: boolean;
  italic: boolean;
}
```

**Font strategy:** System fonts only (Arial, Georgia, Courier New, Times New Roman, Verdana, Impact, Comic Sans MS). No font file bundling. System fonts are instantly available via `ctx.font` with zero loading cost. If Google Fonts are desired later, load via FontFace API.

**Hit testing for drag:** Use `ctx.measureText()` which returns `TextMetrics` with `actualBoundingBoxAscent`, `actualBoundingBoxDescent`, and `width`. Build a bounding rect from these for pointer-down hit testing.

### Drawing/Annotation: Overlay Canvas + Edit-Until-Apply

Same overlay canvas pattern as text. Drawing strokes and shapes are rendered on the overlay during editing, baked into the main render on "Apply."

**State shape:**

```typescript
interface DrawingStroke {
  id: string;
  tool: 'freehand' | 'arrow' | 'rectangle' | 'circle' | 'line';
  points: Array<{ x: number; y: number }>;  // percentage-based
  color: string;
  thickness: number;  // px relative to source image dimensions
}
```

**Freehand smoothing:** Quadratic Bezier interpolation. For each consecutive pair of recorded points, use the midpoint as the curve end and the actual point as the control point. This produces smooth curves from jagged mouse/touch input with no external library.

**Arrow heads:** Compute from the angle of the final segment. Two short lines at +/- 30 degrees from the endpoint, length proportional to stroke thickness.

**Coordinate system:** All coordinates stored as percentages of image dimensions (matching existing crop coordinates). This ensures annotations survive window resizes, zoom changes, and export at different resolutions.

## SVG Filter Elements for Sharpen

Add a hidden `<svg>` element to the DOM (e.g., in `App.tsx` or a dedicated component):

```html
<svg style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
  <defs>
    <filter id="sharpen-25">
      <feConvolveMatrix order="3" kernelMatrix="0 -0.25 0 -0.25 2 -0.25 0 -0.25 0" />
    </filter>
    <filter id="sharpen-50">
      <feConvolveMatrix order="3" kernelMatrix="0 -0.5 0 -0.5 3 -0.5 0 -0.5 0" />
    </filter>
    <filter id="sharpen-75">
      <feConvolveMatrix order="3" kernelMatrix="0 -1 0 -1 5 -1 0 -1 0" />
    </filter>
    <filter id="sharpen-100">
      <feConvolveMatrix order="3" kernelMatrix="-1 -1 -1 -1 9 -1 -1 -1 -1" />
    </filter>
  </defs>
</svg>
```

Reference in render pipeline: `ctx.filter = "url(#sharpen-50)"` applied as a separate draw pass on an offscreen canvas, before the CSS filter string for adjustments + preset is applied on the main canvas.

**Fallback:** If SVG filter `url()` proves unreliable in Safari or Firefox, fall back to `getImageData`/`putImageData` convolution with the standard 3x3 sharpen kernel. Performance is acceptable for single still images.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vanilla Canvas 2D drawing | Fabric.js (~300KB) / Konva.js (~150KB) | Only if you need a persistent object model with selection handles, grouping, layering, and serialization. WebImager uses edit-until-apply (not persistent objects), so these libraries would fight the existing render pipeline and add massive bundle size for unused features. |
| CSS filter string composition for presets | Pixel-level manipulation (`getImageData` loops) | Only if you need effects impossible with CSS filters (channel swapping, custom tone curves, split-toning). All 10 recommended presets are achievable with CSS filter composition. |
| SVG `feConvolveMatrix` for sharpen | `getImageData` pixel convolution | Only if SVG filter `url()` reference is unreliable in target browsers. Pixel approach is slower but universally works. Test SVG approach first. |
| System fonts for text overlay | Bundled font files / Google Fonts | Only if offline mode or specific brand fonts are required. System fonts are instant, zero-cost, and cover the common use cases. |
| Overlay canvas for edit-until-apply | Single canvas with full state replay on each pointer move | Overlay is simpler and faster: no need to replay the entire render pipeline (transforms + crop + mask + filters) on every mouse move during drawing. Draw only the annotation layer on the overlay. Bake on apply. |
| Percentage-based coordinates for annotations | Pixel coordinates | Percentage-based matches existing crop coordinate system. Annotations survive zoom changes, window resizes, and export at different resolutions without coordinate recalculation. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Fabric.js | ~300KB bundle, introduces object/layer model that conflicts with existing vanilla Canvas render pipeline. Would require rewriting `renderToCanvas()` and the entire rendering approach. | Vanilla Canvas 2D API + Zustand state + overlay canvas |
| Konva.js | ~150KB, same fundamental conflict -- stage/layer abstraction competes with existing pipeline. Also introduces its own event system that conflicts with existing pointer handlers. | Vanilla Canvas 2D API |
| CamanJS | Abandoned since 2013. Uses slow pixel manipulation for effects that are now GPU-accelerated via `ctx.filter`. | `ctx.filter` CSS string composition |
| WebGL / OffscreenCanvas for filters | Massive complexity increase for minimal gain. CSS filters applied via `ctx.filter` are already GPU-accelerated by the browser. Only justified for real-time video processing. | `ctx.filter` with CSS/SVG filter functions |
| opentype.js / fontkit | Only needed for advanced typography (kerning tables, glyph outlines, custom font parsing). `ctx.fillText()` handles text overlay rendering perfectly. | Native `ctx.font` + `ctx.fillText()` |
| `CanvasFilter` constructor (`new CanvasFilter()`) | The object-based CanvasFilter API is NOT in Safari as of March 2026. The CSS string syntax for `ctx.filter` has broader support (Baseline 2024). | `ctx.filter = "blur(5px) sepia(80%)"` string syntax |
| perfect-freehand / other smoothing libraries | Adds dependency for what is a ~15 line quadratic Bezier midpoint interpolation algorithm. The smoothing technique is trivial to implement. | Manual quadratic Bezier interpolation between recorded points |

## Version Compatibility

| Existing Package | Compatible With New Features | Notes |
|------------------|------------------------------|-------|
| React 19.x | Overlay canvas refs, new tool panels | Same ref pattern as existing main canvas. No React version concerns. |
| Zustand 5.x | New state fields and actions | Add `blur`, `sharpen`, `preset`, `textElements`, `drawingStrokes`, `textMode`, `drawingMode` to store. Straightforward extension. |
| Vite 6.x | No config changes needed | No new loaders, plugins, or build configuration required for v3.0 features. |
| TypeScript 5.8 | New type definitions | Add `TextElement`, `DrawingStroke`, `FilterPreset` interfaces to `types/editor.ts`. |
| Tailwind CSS v4 | New UI panels | Utility classes cover filter preset grid, text controls, drawing toolbar. No Tailwind plugin additions needed. |
| Vitest 3.x | Testing new utils | Filter composition, coordinate math, and smoothing algorithms are pure functions -- easy to unit test with existing setup. |

## Installation

```bash
# No new packages required.
# All v3.0 features are implemented with existing dependencies + native browser APIs.
```

Zero new dependencies. This is the correct answer.

## Sources

- [MDN: CanvasRenderingContext2D.filter](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter) -- Supported CSS filter functions (blur, sepia, saturate, hue-rotate, contrast, brightness, grayscale, invert, opacity), browser compatibility Baseline 2024. HIGH confidence.
- [MDN: fillText()](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillText) -- Canvas text rendering. HIGH confidence.
- [MDN: TextMetrics](https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics) -- Text measurement for bounding boxes and hit-testing. HIGH confidence.
- [MDN: feConvolveMatrix](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feConvolveMatrix) -- SVG convolution filter for sharpening kernels. HIGH confidence.
- [web.dev: Image filters with canvas](https://web.dev/canvas-imagefilters/) -- Convolution kernel fundamentals and `getImageData`/`putImageData` approach. MEDIUM confidence (older article, technique is stable).
- [Chrome blog: Canvas2D updates](https://developer.chrome.com/blog/canvas2d) -- CanvasFilter constructor API and new Canvas 2D features. HIGH confidence.
- [GitHub Gist: Sharpen function (mikecao)](https://gist.github.com/mikecao/65d9fc92dc7197cb8a7c) -- Reference pixel-level sharpen convolution implementation. LOW confidence (community source, math is standard).
- [Viget: Instagram-style filters in HTML5 Canvas](https://www.viget.com/articles/instagram-style-filters-in-html5-canvas) -- Approach for preset filter composition. MEDIUM confidence.
- [IMG.LY: How to apply filters in JavaScript](https://img.ly/blog/how-to-apply-filters-in-javascript/) -- Convolution and CSS filter techniques. MEDIUM confidence.

---
*Stack research for: WebImager v3.0 editing power features*
*Researched: 2026-03-14*
