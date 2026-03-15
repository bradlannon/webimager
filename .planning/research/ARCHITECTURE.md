# Architecture Research

**Domain:** Browser-based image editor -- v3.0 editing power features integration
**Researched:** 2026-03-14
**Confidence:** HIGH

## Existing Architecture (Context for New Features)

```
Zustand Store (EditorStore)
  sourceImage, transforms, adjustments, cropRegion, backgroundMask, replacementColor
      |
      v
useRenderPipeline (hook) -- subscribes to store slices
      |
      v
renderToCanvas() -- pure function
  Step 1: Apply transforms (rotate, flip)
  Step 2: Apply crop (extract region)
  Step 3: Apply ctx.filter (brightness, contrast, saturation, greyscale)
  Step 4: Apply background mask (destination-in compositing)
  Step 5: Fill replacement color (destination-over)
      |
      v
<canvas> element -- displayed with CSS zoom/pan transform
      |
      v
CropOverlay -- HTML overlay positioned over canvas (edit-until-apply pattern)
```

Key architectural facts:
- `renderToCanvas()` is a pure function called by `useRenderPipeline` on every relevant state change
- `ctx.filter` provides GPU-accelerated CSS filter syntax (brightness, contrast, saturate, grayscale)
- Crop uses an "edit-until-apply" pattern: `cropMode` boolean toggles overlay, `applyCrop` commits
- `downloadImage()` calls the same `renderToCanvas()` to produce export output
- Canvas component wraps the `<canvas>` in a div with CSS `transform: translate() scale()` for zoom/pan
- OverlayPanel slides up from bottom bar with glassmorphism styling
- BottomBar has tab navigation; each tab maps to a panel component

## How New Features Integrate

### Feature 1: Blur/Sharpen Filters

**Integration point:** Extend `Adjustments` interface and `buildFilterString()`.

Canvas 2D `ctx.filter` natively supports `blur()`. Sharpen has no CSS filter equivalent -- implement as an unsharp-mask convolution kernel applied via `getImageData`/`putImageData`.

**Store changes:**
```typescript
// In types/editor.ts -- extend Adjustments
export interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  greyscale: boolean;
  blur: number;        // NEW: 0-20 px radius
  sharpen: number;     // NEW: 0-100 intensity
}
```

**Render pipeline changes:**
- `buildFilterString()`: Append `blur(${blur}px)` when blur > 0
- Sharpen: After the main `drawImage` with `ctx.filter`, if `sharpen > 0`, apply a 3x3 convolution kernel to the canvas pixels via `getImageData`/`putImageData`. This must happen after blur (so you can combine blur+sharpen for a "clarity" effect) but before mask compositing.

**New render pipeline step order:**
```
transforms -> crop -> ctx.filter (brightness/contrast/saturation/greyscale/blur) -> sharpen convolution -> mask -> replacement color
```

**UI:** Add blur and sharpen sliders to `AdjustmentControls.tsx` -- same pattern as existing brightness/contrast/saturation sliders. No new tab needed.

**New files:**
- `src/utils/sharpen.ts` -- convolution kernel function (applySharpen)

**Modified files:**
- `src/types/editor.ts` -- extend Adjustments
- `src/store/editorStore.ts` -- add blur/sharpen defaults and reset
- `src/utils/canvas.ts` -- add blur to buildFilterString, call sharpen after draw
- `src/components/AdjustmentControls.tsx` -- add two sliders

### Feature 2: Preset Image Filters

**Integration point:** New store field `activeFilter`, applied as a CSS filter string composed with existing adjustments via `ctx.filter`.

**Architecture decision:** Use CSS `ctx.filter` strings for presets because the existing pipeline already uses `ctx.filter`. Each preset is a named combination of brightness, contrast, saturate, sepia, hue-rotate, and grayscale values. This avoids pixel manipulation entirely and stays GPU-accelerated.

**Store changes:**
```typescript
// In types/filters.ts
export interface FilterPreset {
  id: string;
  label: string;
  filter: string;  // CSS filter string, e.g. "sepia(80%) saturate(120%) contrast(110%)"
}

// In EditorStore -- add:
activeFilter: string | null;  // preset id, or null for no preset
```

**Render pipeline changes:**
- `buildFilterString()` receives both `adjustments` and `activeFilter`. The preset filter string is concatenated with the adjustment filter string. CSS filters compose left-to-right, so preset applies first, then user adjustments layer on top. This gives users the ability to tweak a preset.

**Preset definitions** (hardcoded array, not fetched):
```typescript
export const FILTER_PRESETS: FilterPreset[] = [
  { id: 'sepia', label: 'Sepia', filter: 'sepia(90%)' },
  { id: 'vintage', label: 'Vintage', filter: 'sepia(40%) contrast(90%) brightness(110%) saturate(80%)' },
  { id: 'warm', label: 'Warm', filter: 'sepia(20%) saturate(140%) brightness(105%)' },
  { id: 'cool', label: 'Cool', filter: 'saturate(80%) hue-rotate(15deg) brightness(105%)' },
  { id: 'bw', label: 'B&W', filter: 'grayscale(100%) contrast(120%)' },
  { id: 'fade', label: 'Fade', filter: 'contrast(80%) brightness(115%) saturate(70%)' },
  { id: 'vivid', label: 'Vivid', filter: 'saturate(180%) contrast(115%)' },
  { id: 'dramatic', label: 'Dramatic', filter: 'contrast(140%) brightness(90%) saturate(110%)' },
  { id: 'noir', label: 'Noir', filter: 'grayscale(100%) contrast(150%) brightness(90%)' },
  { id: 'soft', label: 'Soft', filter: 'contrast(90%) brightness(110%) blur(0.5px)' },
];
```

**UI:** New "Filters" tab in BottomBar. Shows a horizontal scrollable row of thumbnail previews (tiny canvas elements rendered with each filter applied to a downscaled source image). Tap to select, tap again to deselect.

**New files:**
- `src/types/filters.ts` -- FilterPreset type and FILTER_PRESETS array
- `src/components/FilterControls.tsx` -- filter selection UI with thumbnail previews

**Modified files:**
- `src/store/editorStore.ts` -- add activeFilter state, setActiveFilter action, reset in setImage/resetAll
- `src/utils/canvas.ts` -- buildFilterString accepts activeFilter, prepends to adjustment filters
- `src/components/BottomBar.tsx` -- add Filters tab
- `src/hooks/useRenderPipeline.ts` -- subscribe to activeFilter

### Feature 3: Text Overlay (Editable Until Applied)

**Integration point:** New overlay layer rendered as an HTML element positioned over the canvas (same pattern as CropOverlay), with an "Apply" action that burns text into the render pipeline data.

**Architecture decision:** Do NOT render text on the canvas during editing. Render a positioned HTML `<div>` (or `<textarea>` for editing) over the canvas, using CSS transforms matching the canvas display scaling. When the user clicks "Apply", the text moves to `appliedTexts` in the store and gets rendered by the pipeline via `ctx.fillText`. This avoids re-rendering the full pipeline on every text drag/edit.

**Why HTML overlay, not canvas text during editing:**
1. Canvas `fillText` requires full pipeline re-render on every keystroke/drag
2. HTML gives native text selection, cursor, and font rendering
3. CSS positioning over the canvas is already proven by CropOverlay
4. Text coordinates stored as percentages (like crop) survive zoom/resize

**Store changes:**
```typescript
// In types/text.ts
export interface TextOverlay {
  id: string;
  text: string;
  x: number;          // 0-100 percentage from left
  y: number;          // 0-100 percentage from top
  fontFamily: string;
  fontSize: number;    // in px relative to source image height
  color: string;
  bold: boolean;
  italic: boolean;
  opacity: number;     // 0-1
}

// In EditorStore:
pendingText: TextOverlay | null;     // currently being edited (not yet applied)
textMode: boolean;                    // like cropMode
appliedTexts: TextOverlay[];          // rendered by the pipeline
```

**Render pipeline changes:**
- After mask compositing and replacement color, iterate `appliedTexts` and draw each with `ctx.fillText()` / `ctx.font` / `ctx.fillStyle`.
- `pendingText` is NOT rendered by the pipeline -- it is shown as an HTML overlay only.

**Edit-until-apply pattern (matching crop):**
1. User enters text mode (`textMode = true`)
2. User types text, drags to position, adjusts font/size/color
3. Changes update `pendingText` in store (HTML overlay re-renders, canvas does NOT re-render)
4. User clicks "Apply Text" -> `pendingText` moves to `appliedTexts[]`, `textMode` set to false
5. Pipeline re-renders with the text drawn in
6. Or user clicks "Cancel" -> `pendingText` set to null, `textMode` set to false

**Coordinate system:** Percentage-based (0-100) like crop coordinates. Font size stored relative to source image dimensions so it scales correctly during render.

**UI:** New "Text" tab in BottomBar. Panel shows: text input, font family picker (5-6 web-safe fonts), size slider, color picker, bold/italic toggles, Apply/Cancel buttons. The text itself appears as a draggable HTML overlay on the canvas.

**New files:**
- `src/types/text.ts` -- TextOverlay interface, defaults
- `src/components/TextOverlayElement.tsx` -- HTML overlay component (draggable, editable)
- `src/components/TextControls.tsx` -- bottom panel UI for text properties
- `src/utils/text.ts` -- renderTextsToCanvas() helper for drawing applied texts

**Modified files:**
- `src/store/editorStore.ts` -- add pendingText, textMode, appliedTexts state and actions
- `src/utils/canvas.ts` -- renderToCanvas accepts appliedTexts, draws them after compositing
- `src/hooks/useRenderPipeline.ts` -- subscribe to appliedTexts (NOT pendingText)
- `src/components/Canvas.tsx` -- render TextOverlayElement component when textMode is true
- `src/components/BottomBar.tsx` -- add Text tab, handle text mode transitions
- `src/utils/download.ts` -- pass appliedTexts to renderToCanvas

### Feature 4: Freehand Drawing and Shape Annotation (Editable Until Applied)

**Integration point:** Second overlay canvas layered on top of the main canvas for real-time stroke rendering, with an "Apply" action that composites the drawing canvas content into the render pipeline.

**Architecture decision:** Use a SEPARATE transparent `<canvas>` element overlaid on the main canvas for drawing. This is critical because:
1. Freehand drawing needs immediate pixel response (pointer events -> lineTo -> stroke)
2. Re-rendering the full pipeline per mouse move would be far too slow
3. A separate overlay canvas can be cleared/redrawn independently
4. When "Apply" is clicked, the overlay canvas content gets composited into the pipeline

**Store changes:**
```typescript
// In types/drawing.ts
export interface DrawingPath {
  points: Array<{ x: number; y: number }>;  // percentage coordinates
  color: string;
  thickness: number;    // px relative to source image height
  tool: 'pen' | 'arrow' | 'rectangle' | 'circle' | 'line';
}

// In EditorStore:
drawMode: boolean;
drawTool: 'pen' | 'arrow' | 'rectangle' | 'circle' | 'line';
drawColor: string;
drawThickness: number;
pendingPaths: DrawingPath[];              // paths on the overlay canvas (not yet applied)
appliedDrawingData: ImageData | null;     // flattened pixel data from previous applies
```

**Why store paths (not just ImageData) for pending state:**
- Paths can be individually undone (pop last path)
- Shapes (rect, circle, arrow) can be previewed during drag
- Percentage coordinates survive zoom changes

**Render pipeline changes:**
- After text rendering, if `appliedDrawingData` exists, composite it via `drawImage` from an offscreen canvas onto the main canvas.
- `pendingPaths` are NOT rendered by the main pipeline -- they live on the overlay canvas only.

**Edit-until-apply pattern:**
1. User enters draw mode (`drawMode = true`)
2. Overlay canvas appears, sized to match main canvas display dimensions
3. Pointer events on overlay canvas: pen tool records points, shape tools show rubber-band preview
4. Each completed stroke/shape adds a `DrawingPath` to `pendingPaths`
5. Overlay canvas re-renders all `pendingPaths` on change
6. "Undo" pops last path, re-renders overlay from remaining paths
7. "Apply" -> render pendingPaths at source-image resolution onto an offscreen canvas, composite with any existing `appliedDrawingData`, store result, clear pendingPaths, set `drawMode = false`
8. "Cancel" -> clear pendingPaths, set `drawMode = false`

**Coordinate mapping:** Display canvas has CSS sizing different from pixel dimensions. Pointer events give screen coordinates. Convert to percentage of displayed canvas size, then during apply, map percentages to source image pixel coordinates. Same approach as crop.

**Shape rendering details:**
- **Pen:** `beginPath`, `moveTo`, sequential `lineTo` through points, `stroke` with `lineCap: 'round'`, `lineJoin: 'round'`
- **Line:** `moveTo` first point, `lineTo` last point, `stroke`
- **Rectangle:** `strokeRect` from start point to end point
- **Circle:** `arc` centered at start point, radius = distance to current point
- **Arrow:** Line with arrowhead triangle at endpoint (two short lines at 30-degree angles)

**UI:** New "Draw" tab in BottomBar. Panel shows: tool picker (pen/arrow/rect/circle/line icons), color picker, thickness slider, Undo button, Apply/Cancel buttons.

**New files:**
- `src/types/drawing.ts` -- DrawingPath interface, tool types
- `src/components/DrawingOverlay.tsx` -- overlay canvas with pointer event handlers
- `src/components/DrawControls.tsx` -- bottom panel UI for draw tools
- `src/utils/drawing.ts` -- renderPathToCanvas(), renderAllPaths(), applyDrawingToSource()

**Modified files:**
- `src/store/editorStore.ts` -- add drawing state and actions
- `src/utils/canvas.ts` -- renderToCanvas accepts appliedDrawingData, composites after text
- `src/hooks/useRenderPipeline.ts` -- subscribe to appliedDrawingData
- `src/components/Canvas.tsx` -- render DrawingOverlay when drawMode is true
- `src/components/BottomBar.tsx` -- add Draw tab, handle draw mode transitions
- `src/utils/download.ts` -- pass appliedDrawingData to renderToCanvas

## Updated Render Pipeline Order

```
renderToCanvas(ctx, source, options)

Step 1: Apply transforms (rotate, flip) .................. [EXISTING]
Step 2: Apply crop (extract region) ...................... [EXISTING]
Step 3: Apply ctx.filter (adjustments + activeFilter) .... [MODIFIED - add blur, compose preset]
Step 4: Draw image to canvas ............................. [EXISTING]
Step 5: Apply sharpen convolution ........................ [NEW - if sharpen > 0]
Step 6: Apply background mask (destination-in) ........... [EXISTING]
Step 7: Fill replacement color (destination-over) ........ [EXISTING]
Step 8: Render applied texts (ctx.fillText) .............. [NEW]
Step 9: Composite applied drawing data ................... [NEW]
```

**Ordering rationale:**
- Filters (blur/sharpen/presets) apply to the image pixels, not to overlaid text/drawings
- Text and drawings sit "on top" visually, so they render last
- Text before drawings so drawings can annotate over text if needed
- Mask and replacement color apply to the base image only -- text/drawings are added after masking so they are always fully visible regardless of background removal state

## Updated Store Shape

```typescript
interface EditorStore {
  // === EXISTING (unchanged) ===
  sourceImage: ImageBitmap | null;
  originalFile: File | null;
  wasDownscaled: boolean;
  transforms: Transforms;
  adjustments: Adjustments;          // MODIFIED: adds blur, sharpen fields
  cropRegion: CropRegion | null;
  previousCropRegion: CropRegion | null;
  cropMode: boolean;
  cropAspectRatio: number | null;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  backgroundRemoved: boolean;
  backgroundMask: ImageData | null;
  replacementColor: string | null;

  // === NEW: Preset filters ===
  activeFilter: string | null;       // preset id

  // === NEW: Text overlay ===
  textMode: boolean;
  pendingText: TextOverlay | null;
  appliedTexts: TextOverlay[];

  // === NEW: Drawing/annotation ===
  drawMode: boolean;
  drawTool: DrawingPath['tool'];
  drawColor: string;
  drawThickness: number;
  pendingPaths: DrawingPath[];
  appliedDrawingData: ImageData | null;
}
```

## Updated Component Tree

```
<Editor>
  <TopBar />
  <Canvas>
    <canvas ref={canvasRef} />              -- main render pipeline output
    <CropOverlay />                         -- [EXISTING] shown when cropMode
    <TextOverlayElement />                  -- [NEW] shown when textMode
    <DrawingOverlay />                      -- [NEW] shown when drawMode
  </Canvas>
  <ZoomControls />
  <BottomBar>
    tabs: crop | transform | adjustments | filters | background | text | draw | resize | download
                                              ^^^^^^^                  ^^^^   ^^^^
                                              NEW                      NEW    NEW
    <OverlayPanel>
      <CropPanel />
      <TransformControls />
      <AdjustmentControls />                -- MODIFIED: add blur/sharpen sliders
      <FilterControls />                    -- NEW
      <BackgroundControls />
      <TextControls />                      -- NEW
      <DrawControls />                      -- NEW
      <ResizeControls />
      <DownloadPanel />
    </OverlayPanel>
  </BottomBar>
</Editor>
```

## Tab Ordering Rationale

```
crop | transform | adjustments | filters | background | text | draw | resize | download
```

- Crop/Transform/Adjustments stay first (fundamental edits applied to base image)
- Filters after adjustments (both modify image appearance, natural grouping)
- Background stays before overlays (affects base image layer)
- Text before Draw (more commonly used annotation type)
- Resize and Download stay last (final output steps)

**9 tabs on mobile:** Icons-only on mobile is already the pattern. If testing reveals crowding, consider grouping "Text" and "Draw" under a single "Annotate" tab with a sub-toggle. Start with flat tabs and evaluate.

## Architectural Patterns

### Pattern 1: Edit-Until-Apply with Overlay

**What:** Interactive editing happens on an HTML/canvas overlay positioned over the main canvas. The main render pipeline does NOT re-run during editing. Only when the user clicks "Apply" does the edit get committed to store state that triggers a pipeline re-render.

**When to use:** Text overlay, drawing/annotation, crop (already uses this).

**Why:** Decouples interactive editing (60fps needed) from the full render pipeline (potentially expensive with convolutions, mask compositing, multiple offscreen canvases).

```
User interaction -> update pendingState (overlay re-renders) -> NO pipeline render
User clicks Apply -> move pending to applied state -> pipeline re-renders once
```

### Pattern 2: Percentage-Based Coordinates

**What:** All position/size values stored as percentages (0-100) of the source image dimensions, not pixel values.

**When to use:** Crop regions, text positions, drawing paths.

**Why:** Resilient to display scaling, zoom changes, window resizes, and the gap between canvas pixel dimensions and CSS display dimensions.

### Pattern 3: Overlay Canvas for Real-Time Drawing

**What:** A separate transparent `<canvas>` element layered over the main canvas for freehand drawing and shape preview. NOT the same canvas as the render pipeline output.

**When to use:** Freehand drawing, shape rubber-banding during drag.

**Why:** Drawing requires immediate pixel feedback on pointer move. Re-rendering the full pipeline per mouse move would blow the 16ms frame budget. The overlay canvas only contains pending strokes and can be cleared/redrawn cheaply.

**Implementation sketch:**
```typescript
// DrawingOverlay.tsx
<canvas
  ref={overlayRef}
  style={{
    position: 'absolute', top: 0, left: 0,
    width: '100%', height: '100%',
    pointerEvents: drawMode ? 'auto' : 'none'
  }}
  onPointerDown={startStroke}
  onPointerMove={continueStroke}
  onPointerUp={endStroke}
/>
```

### Pattern 4: Compositing Applied Overlays at Render Time

**What:** Applied text and drawing data are rendered EVERY TIME the pipeline runs, not baked into the source image.

**Why not bake immediately:** Because the user can still adjust brightness/contrast, change crop, rotate, etc. If text/drawing were baked into sourceImage, they would be affected by filters and transforms. Instead, they are composited AFTER all base-image processing, so they always appear sharp and correctly positioned.

**Trade-off:** More work per render (drawing text and compositing drawing data). But this is cheap compared to the rest of the pipeline, and it keeps edits truly non-destructive.

**Scaling concern:** If someone applies 50+ text overlays and 200+ drawing paths, compositing cost adds up. Not a concern for this use case -- this is a quick-edit tool, not a design application.

## Anti-Patterns

### Anti-Pattern 1: Rendering Pending Edits in the Main Pipeline

**What people do:** Re-run renderToCanvas() on every text keystroke or drawing mouse move.
**Why it is wrong:** The pipeline does multiple offscreen canvas operations, convolutions, and compositing steps. At 60fps pointer events, this creates visible jank.
**Do this instead:** Use overlay elements (HTML for text, separate canvas for drawing) that update independently of the main pipeline.

### Anti-Pattern 2: Baking Overlays into Source Image on Apply

**What people do:** When user clicks "Apply Text", render text onto source ImageBitmap and replace it.
**Why it is wrong:** Destroys non-destructive editing. Subsequent brightness changes would affect the text. Filter presets would distort text colors. Undo becomes impossible without storing full image snapshots.
**Do this instead:** Store applied overlays as data (`TextOverlay[]`, `ImageData`) and composite them at render time, after all base-image processing.

### Anti-Pattern 3: Using Fabric.js or Konva.js for Drawing

**What people do:** Pull in a canvas abstraction library for the drawing feature.
**Why it is wrong for this project:** The existing architecture uses vanilla Canvas 2D with a custom render pipeline. Adding Fabric.js would create two competing canvas management systems. The drawing requirements (pen + 4 shapes) are simple enough for vanilla Canvas 2D. The project explicitly decided against these libraries (see Key Decisions in PROJECT.md: "Vanilla Canvas API -- image editors don't need object/layer abstractions").
**Do this instead:** Vanilla Canvas 2D on a separate overlay canvas with simple pointer event handlers.

### Anti-Pattern 4: Pixel Coordinates for Overlay Positioning

**What people do:** Store text position as `{ x: 450, y: 230 }` in pixels.
**Why it is wrong:** Breaks when user zooms, resizes window, or rotates image. The display canvas CSS size differs from its pixel dimensions. Zoom applies a CSS `scale()` transform that changes the visual position without changing pixel coordinates.
**Do this instead:** Percentage-based coordinates (0-100) mapped to source image dimensions, exactly as crop already does.

## Mode Conflicts and Resolution

Only one mode should be active at a time (`cropMode`, `textMode`, `drawMode`). When switching:

```
Switching TO crop mode:
  - If textMode active: auto-apply pending text (or discard if empty), exit text mode
  - If drawMode active: auto-apply pending paths (or discard if empty), exit draw mode

Switching TO text mode:
  - If cropMode active: auto-apply crop, exit crop mode
  - If drawMode active: auto-apply pending paths, exit draw mode

Switching TO draw mode:
  - If cropMode active: auto-apply crop, exit crop mode
  - If textMode active: auto-apply pending text, exit text mode
```

This matches the existing crop behavior where switching away from the crop tab auto-saves. Implement via an `exitAllModes()` helper called before entering any new mode.

## renderToCanvas Signature Refactor

```typescript
// CURRENT (v2.0) -- 7 positional parameters
renderToCanvas(ctx, source, transforms, adjustments?, crop?, backgroundMask?, replacementColor?)

// PROPOSED (v3.0) -- options object
interface RenderOptions {
  transforms: Transforms;
  adjustments?: Adjustments;
  crop?: CropRegion;
  backgroundMask?: ImageData | null;
  replacementColor?: string | null;
  activeFilter?: string | null;
  appliedTexts?: TextOverlay[];
  appliedDrawingData?: ImageData | null;
}

renderToCanvas(ctx: CanvasRenderingContext2D, source: ImageBitmap, options: RenderOptions): void
```

Do this refactor at the START of v3.0 work (before adding any features) to avoid churning the function signature with each feature addition. Update all call sites: useRenderPipeline, downloadImage, applyResize.

## Build Order (Dependency-Driven)

### Step 0: Refactor renderToCanvas Signature

**Build first because:** Every subsequent feature adds parameters. Refactoring to an options object now prevents 4 rounds of signature changes. All existing call sites (useRenderPipeline, downloadImage, applyResize) updated once.

### Step 1: Blur/Sharpen

**Build second because:**
- Extends existing Adjustments interface (establishes the pattern for store changes)
- Modifies `buildFilterString()` which preset filters will also modify
- Sharpen convolution introduces pixel-level processing, validating that the pipeline can handle post-draw ImageData operations
- No UI pattern changes needed (just more sliders in existing panel)
- Lowest risk, highest confidence

### Step 2: Preset Filters

**Build third because:**
- Depends on the updated `buildFilterString` from Step 1
- Simple store addition (one field: `activeFilter`)
- Introduces a new tab in BottomBar (establishes the pattern for text/draw tabs)
- No overlay or mode complexity

### Step 3: Text Overlay

**Build fourth because:**
- Introduces the edit-until-apply overlay pattern for non-crop features
- Simpler than drawing (no real-time stroke rendering, no multiple tools)
- Tests the "applied overlays composited at render time" architecture that drawing will also use
- Validates mode conflict resolution

### Step 4: Drawing/Annotation

**Build last because:**
- Most complex feature (multiple tools, real-time pointer rendering, overlay canvas)
- Depends on the overlay pattern established by text
- Depends on the "applied data composited at render time" pattern proven by text
- Drawing overlay canvas must coexist with text overlay and crop overlay (mode exclusivity already solved in Step 3)

## Invalidation Rules for New State

| Event | Clear activeFilter? | Clear appliedTexts? | Clear appliedDrawingData? |
|-------|--------------------|--------------------|--------------------------|
| New image uploaded | Yes | Yes | Yes |
| Resize applied | Yes | Yes | Yes |
| Rotation/flip | No | No | No |
| Crop change | No | No | No |
| Adjustment change | No | No | No |
| Reset all | Yes | Yes | Yes |

Text and drawing positions are percentage-based, so they survive rotation/flip/crop changes. They are composited after those operations, so the positions remain correct relative to the visible output.

## Sources

- Existing codebase analysis: `src/utils/canvas.ts`, `src/store/editorStore.ts`, `src/hooks/useRenderPipeline.ts`, `src/components/Canvas.tsx`, `src/components/BottomBar.tsx` [HIGH confidence -- primary source]
- Canvas 2D `ctx.filter` supports `blur()` natively -- https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter [HIGH confidence]
- CSS filter functions (`sepia`, `hue-rotate`, etc.) composable in `ctx.filter` string -- https://developer.mozilla.org/en-US/docs/Web/CSS/filter [HIGH confidence]
- Unsharp mask / convolution kernel approach for sharpen is standard Canvas 2D pattern [HIGH confidence]
- Percentage-based coordinate system proven by existing crop implementation in this codebase [HIGH confidence]

---
*Architecture research for: WebImager v3.0 editing power features*
*Researched: 2026-03-14*
