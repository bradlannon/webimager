# Architecture Research

**Domain:** Browser-based image editor (client-side only)
**Researched:** 2026-03-13
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Toolbar  │  │ Controls │  │  Canvas   │  │ Export   │        │
│  │ (tools)  │  │ (sliders)│  │ Viewport  │  │ Panel    │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │              │             │              │              │
├───────┴──────────────┴─────────────┴──────────────┴──────────────┤
│                     Editor State Manager                         │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Current tool, slider values, crop rect, active image    │    │
│  └──────────────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────────┤
│                     Processing Layer                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │  Resize   │  │   Crop    │  │  Filters  │  │ Transform │    │
│  │  Engine   │  │  Engine   │  │  Engine   │  │  Engine   │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
├──────────────────────────────────────────────────────────────────┤
│                     Canvas Abstraction                           │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Canvas context wrapper, drawImage, getImageData,        │    │
│  │  putImageData, toBlob/toDataURL                          │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| File Input / Upload | Accept image files, validate size/type, convert to in-memory Image object | HTML `<input type="file">` with FileReader API or `createImageBitmap()` |
| Canvas Viewport | Display the working image with current edits applied; handle mouse events for crop | HTML5 `<canvas>` element with CanvasRenderingContext2D |
| Toolbar | Select active tool (crop, rotate, flip) | Button group with active state tracking |
| Adjustment Controls | Sliders for brightness, contrast, saturation, blur, sharpen | Range inputs bound to state |
| Filter Presets | Apply named filter combinations (sepia, vintage, warm, cool) | Predefined parameter sets applied via the filter engine |
| Crop Overlay | Interactive drag rectangle on top of canvas for free-drag crop | Mouse/touch event handlers drawing selection rect on a second overlay canvas or via CSS |
| Resize Panel | Input fields for width/height with aspect ratio lock toggle | Controlled inputs with computed aspect ratio |
| Export / Download | Render final image to blob and trigger download | `canvas.toBlob()` then `URL.createObjectURL()` with `<a download>` |
| Editor State | Central store for all current settings (adjustments, crop rect, dimensions, active tool) | Plain object or reactive store (Zustand, signals, or vanilla state) |
| Processing Engines | Apply transformations to canvas pixel data | Canvas context operations + `ctx.filter` for CSS-style filters |

## Recommended Project Structure

```
src/
├── components/          # UI components
│   ├── App.tsx           # Root layout
│   ├── Toolbar.tsx       # Tool selection buttons
│   ├── Canvas.tsx        # Canvas viewport + crop overlay
│   ├── Controls.tsx      # Adjustment sliders panel
│   ├── FilterPresets.tsx  # Preset filter buttons
│   ├── ResizePanel.tsx    # Width/height inputs
│   └── ExportPanel.tsx    # Format selection + download button
├── engine/              # Image processing logic (no UI)
│   ├── filters.ts        # Brightness, contrast, saturation, greyscale
│   ├── transform.ts      # Rotate, flip
│   ├── resize.ts         # Resize with aspect ratio
│   ├── crop.ts           # Crop region extraction
│   └── render.ts         # Composite pipeline: apply all edits to canvas
├── state/               # Application state management
│   ├── editor-state.ts   # Central state shape and actions
│   └── types.ts          # Type definitions
├── utils/               # Shared utilities
│   ├── file-io.ts        # File reading, blob creation, download trigger
│   ├── canvas-helpers.ts # Canvas setup, context helpers
│   └── math.ts           # Aspect ratio calc, clamp, etc.
├── styles/              # CSS / styling
│   └── index.css
├── main.tsx             # Entry point
└── index.html           # HTML shell
```

### Structure Rationale

- **engine/:** Processing logic is isolated from UI so it can be tested independently and potentially moved to a Web Worker later. Each file handles one category of operation.
- **components/:** Each UI concern is a separate component. Canvas is the most complex, handling both display and mouse interaction for crop.
- **state/:** Centralized state prevents prop-drilling and makes the render pipeline predictable -- when state changes, re-render the canvas.
- **utils/:** Generic helpers shared across components and engine.

## Architectural Patterns

### Pattern 1: Render Pipeline (Most Important)

**What:** All edits are applied as a pipeline that re-renders the canvas from the original source image every time any setting changes. The original image is never mutated.

**When to use:** Always. This is the core pattern for a non-destructive image editor.

**Trade-offs:** Simpler mental model and prevents quality degradation from repeated edits. Costs a full re-render on every slider change, but Canvas is fast enough for images under 10MB. For real-time preview, throttle/debounce slider input to ~16ms (60fps).

**Example:**
```typescript
interface EditorState {
  sourceImage: HTMLImageElement | null;
  brightness: number;    // -100 to 100
  contrast: number;      // -100 to 100
  saturation: number;    // -100 to 100
  greyscale: boolean;
  blur: number;          // 0 to 20
  sharpen: number;       // 0 to 100
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  cropRect: CropRect | null;  // null = no crop
  outputWidth: number;
  outputHeight: number;
  activeFilter: string | null; // preset name
}

function renderToCanvas(canvas: HTMLCanvasElement, state: EditorState) {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Apply geometric transforms (rotate, flip)
  ctx.save();
  applyTransforms(ctx, state);

  // 2. Apply CSS-style filters via ctx.filter (brightness, contrast, blur, etc.)
  ctx.filter = buildFilterString(state);

  // 3. Draw source image (or cropped region)
  drawSourceImage(ctx, state);

  ctx.restore();
}
```

### Pattern 2: Canvas ctx.filter for Adjustments

**What:** Use the Canvas 2D context's `filter` property to apply CSS filter functions (brightness, contrast, saturate, blur, grayscale) instead of manual pixel manipulation.

**When to use:** For brightness, contrast, saturation, greyscale, blur. These are GPU-accelerated in browsers and far faster than pixel-by-pixel ImageData manipulation.

**Trade-offs:** Cannot do every effect (sharpen requires manual convolution), but covers 80% of the adjustment needs with near-zero performance cost. Supported in all modern browsers.

**Example:**
```typescript
function buildFilterString(state: EditorState): string {
  const filters: string[] = [];
  // brightness(1) is default, brightness(1.5) = +50%
  filters.push(`brightness(${1 + state.brightness / 100})`);
  filters.push(`contrast(${1 + state.contrast / 100})`);
  filters.push(`saturate(${1 + state.saturation / 100})`);
  if (state.greyscale) filters.push('grayscale(1)');
  if (state.blur > 0) filters.push(`blur(${state.blur}px)`);
  return filters.join(' ');
}
```

### Pattern 3: Overlay Canvas for Crop Interaction

**What:** Use a second transparent canvas layered on top of the image canvas to draw the crop selection rectangle and handles. This separates interaction rendering from image rendering.

**When to use:** For the free-drag crop tool.

**Trade-offs:** Two canvases add minor complexity but prevent the crop UI from requiring a full image re-render on every mouse move. The overlay is lightweight (just rectangles and handles).

**Example:**
```typescript
// Overlay canvas handles mouse events and draws crop rectangle
// Image canvas only re-renders when crop is confirmed
function drawCropOverlay(ctx: CanvasRenderingContext2D, rect: CropRect) {
  // Dim everything outside the crop rect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Clear the crop region to show through
  ctx.clearRect(rect.x, rect.y, rect.width, rect.height);

  // Draw border
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
}
```

### Pattern 4: Preset Filters as Parameter Snapshots

**What:** Rather than building preset filters as separate rendering paths, define them as objects that set specific values for existing adjustment parameters.

**When to use:** For sepia, vintage, warm, cool, and any named filter presets.

**Trade-offs:** Zero additional rendering logic needed. Presets are just data. Easy to add new presets without code changes.

**Example:**
```typescript
const PRESETS: Record<string, Partial<EditorState>> = {
  sepia:   { saturation: -60, brightness: 10, contrast: 10 },
  vintage: { saturation: -30, contrast: 20, brightness: -10 },
  warm:    { saturation: 20, brightness: 5 },
  cool:    { saturation: -10, brightness: 5 },
};
```

## Data Flow

### Primary Edit Flow

```
User adjusts slider / clicks tool
    |
    v
Update EditorState (single source of truth)
    |
    v
Render pipeline reads entire state
    |
    v
Canvas cleared, source image re-drawn with all transforms/filters applied
    |
    v
User sees live preview
```

### Upload Flow

```
User selects file via <input type="file">
    |
    v
FileReader / createImageBitmap loads image into memory
    |
    v
Validate: file size <= 10MB, type is JPEG/PNG/WebP
    |
    v
Set sourceImage in EditorState
    |
    v
Calculate initial canvas dimensions (fit to viewport)
    |
    v
Trigger initial render
```

### Crop Flow

```
User activates crop tool
    |
    v
Overlay canvas becomes interactive (mouse/touch events)
    |
    v
User drags to define crop rectangle
    |
    v
Crop rect stored in EditorState (not yet applied)
    |
    v
User confirms crop (button click)
    |
    v
Render pipeline uses crop rect as source region in drawImage
    |
    v
Canvas dimensions update to cropped size
```

### Export Flow

```
User clicks Download
    |
    v
Create offscreen canvas at final output dimensions
    |
    v
Run full render pipeline onto offscreen canvas (full resolution, not viewport-scaled)
    |
    v
canvas.toBlob(callback, mimeType, quality)
    |
    v
Create object URL, trigger <a download> click
    |
    v
Revoke object URL after download starts
```

### Key Data Flows

1. **State-driven rendering:** Every UI interaction modifies state, which triggers a canvas re-render. The canvas never holds "state" -- it is always a pure projection of the EditorState plus the source image.
2. **Source image immutability:** The original loaded image is never modified. All edits are parameters applied during rendering. This enables non-destructive editing where any slider can be freely adjusted without degradation.
3. **Viewport vs. export resolution:** During editing, the canvas is scaled to fit the viewport for performance. On export, the full render pipeline runs at the actual output dimensions.

## Scaling Considerations

| Concern | Small images (<2MP) | Medium images (2-8MP) | Large images (8MP+, near 10MB) |
|---------|---------------------|----------------------|-------------------------------|
| Render speed | Instant, no optimization needed | Fast, may need requestAnimationFrame throttle | Throttle slider events, consider OffscreenCanvas in Web Worker |
| Memory | Negligible | ~30-60MB for ImageData | ~60-120MB; watch for mobile browser limits |
| Crop interaction | Smooth | Smooth | Overlay canvas pattern critical to avoid re-render lag |
| Export | Instant | Sub-second | 1-3 seconds; show progress indicator |

### Scaling Priorities

1. **First bottleneck:** Slider responsiveness on large images. Fix with `requestAnimationFrame` throttling and `ctx.filter` (GPU-accelerated) instead of pixel manipulation.
2. **Second bottleneck:** Memory on mobile devices. Fix by scaling the viewport canvas to CSS pixel dimensions and only using full resolution for export. A 4000x3000 image displayed in a 800x600 viewport should render at 800x600 during editing.

## Anti-Patterns

### Anti-Pattern 1: Mutating the Source Image

**What people do:** Apply edits directly to the source image data, overwriting pixels each time a filter is applied.
**Why it's wrong:** Quality degrades with each edit. Adjusting brightness up then down does not return to original. Slider interactions become destructive.
**Do this instead:** Keep the original image immutable. Re-render from source on every change, applying all current settings as a pipeline.

### Anti-Pattern 2: Pixel-Level Manipulation for Standard Filters

**What people do:** Use `getImageData()`/`putImageData()` to loop over every pixel for brightness, contrast, and blur operations.
**Why it's wrong:** Orders of magnitude slower than `ctx.filter`. A 4000x3000 image has 12 million pixels; iterating them in JavaScript blocks the main thread for hundreds of milliseconds.
**Do this instead:** Use `ctx.filter = 'brightness(1.5) contrast(1.2)'` which is GPU-accelerated. Reserve pixel manipulation only for effects that Canvas filters cannot express (custom convolution kernels like sharpen).

### Anti-Pattern 3: Rendering at Full Resolution During Editing

**What people do:** Set the canvas to the full image dimensions (e.g., 4000x3000) even though the viewport is 800x600.
**Why it's wrong:** Every render processes 20x more pixels than needed. Sliders feel laggy. Memory usage balloons.
**Do this instead:** Scale the editing canvas to viewport dimensions. Only render at full resolution for the final export.

### Anti-Pattern 4: No Separation Between UI Events and Rendering

**What people do:** Call the render function directly inside every `oninput` event handler for sliders.
**Why it's wrong:** Sliders fire events far faster than 60fps. Queuing renders causes jank and wasted GPU work.
**Do this instead:** Update state immediately, but gate rendering through `requestAnimationFrame`. Only one render per frame.

## Integration Points

### External Services

None -- this is a fully client-side application with no server dependencies.

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI Components <-> Editor State | State reads + action dispatches | Components read state to render UI; user actions update state |
| Editor State <-> Render Pipeline | State subscription triggers render | When state changes, `requestAnimationFrame` queues one render |
| Render Pipeline <-> Canvas | Direct Canvas 2D API calls | Pipeline composes `ctx.filter`, `ctx.drawImage`, transforms |
| Crop Overlay <-> Editor State | Mouse events write crop rect to state | Overlay is the only component with direct mouse interaction on canvas |
| Export <-> Render Pipeline | Reuses same pipeline on offscreen canvas | Export calls the same render function but targets full-resolution offscreen canvas |

## Build Order (Suggested)

Dependencies flow bottom-up. Build foundational layers first.

1. **Canvas abstraction + file I/O** -- Load an image, display it on canvas, download it. This validates the core Canvas pipeline end-to-end.
2. **Editor state + render pipeline** -- Central state driving canvas re-renders. Even with no tools, changing state re-renders. This is the skeleton everything hangs on.
3. **Geometric transforms** -- Rotate and flip. These are simple `ctx.translate`/`ctx.rotate`/`ctx.scale` calls and prove the transform pipeline works.
4. **Adjustment controls** -- Brightness, contrast, saturation, greyscale via `ctx.filter`. Sliders in UI, throttled rendering.
5. **Filter presets** -- Trivial once adjustments work; presets are just parameter snapshots.
6. **Resize** -- Width/height inputs with aspect ratio lock. Modifies output canvas dimensions.
7. **Blur and sharpen** -- Blur via `ctx.filter`, sharpen via convolution kernel (pixel manipulation, the one place it is needed).
8. **Free-drag crop** -- Most complex UI interaction. Overlay canvas, mouse event math, crop confirmation. Build last because it requires the most interaction code.
9. **Export refinement** -- Format selection (JPEG/PNG), quality slider, full-resolution offscreen render.

## Sources

- [Canvas API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [CanvasRenderingContext2D: filter property - MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter)
- [Pixel manipulation with canvas - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas)
- [OffscreenCanvas - MDN](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
- [Web Image Effects Performance Showdown - Smashing Magazine](https://www.smashingmagazine.com/2016/05/web-image-effects-performance-showdown/)
- [Canvas image manipulation - MadeByMike](https://www.madebymike.com.au/writing/canvas-image-manipulation/)
- [Using Web Workers for Image Manipulation - SitePoint](https://www.sitepoint.com/using-web-workers-to-improve-image-manipulation-performance/)
- [Integrating Canvas into your Web App - web.dev](https://web.dev/articles/canvas-integrating)
- [OffscreenCanvas - web.dev](https://web.dev/articles/offscreen-canvas)
- [Resizing and Cropping Images with Canvas - Codrops](https://tympanus.net/codrops/2014/10/30/resizing-cropping-images-canvas/)

---
*Architecture research for: browser-based image editor (client-side only)*
*Researched: 2026-03-13*
