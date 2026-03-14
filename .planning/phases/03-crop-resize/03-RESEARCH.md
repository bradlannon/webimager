# Phase 3: Crop & Resize - Research

**Researched:** 2026-03-13
**Domain:** Interactive crop overlay with drag handles, aspect ratio presets, image resize with aspect lock
**Confidence:** HIGH

## Summary

Phase 3 adds the final two editing capabilities: interactive crop with a draggable selection rectangle and resize with dimension inputs. The crop interaction is the most complex UI element in the app -- it requires a translucent overlay, 8 drag handles (4 corners + 4 midpoints), coordinate mapping between display space and source image space, and aspect ratio constraint enforcement. The resize feature is comparatively simple: two linked number inputs with an aspect ratio lock toggle.

The critical architectural decision is to build the crop overlay as an HTML/CSS layer positioned on top of the canvas rather than drawing it onto the canvas itself. This avoids re-running the render pipeline on every mouse move during crop dragging, and keeps the crop UI cleanly separated from the image rendering. The crop region is stored as percentage-based coordinates relative to the source image (after rotation/flip), making it resilient to display scaling. At render time, these percentages are converted to pixel coordinates and used with `drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh)` to extract the crop region.

For resize, `createImageBitmap()` with `resizeWidth`/`resizeHeight` options provides browser-native high-quality downscaling (and upscaling) without needing any library. The resize is destructive in the sense that it changes the source bitmap dimensions, but the user must explicitly click "Apply" to execute it.

**Primary recommendation:** Build a custom HTML/CSS crop overlay positioned over the canvas. Store crop as percentage coordinates in the Zustand store. Use `drawImage` 9-argument form for crop extraction and `createImageBitmap` for resize. Do not use react-image-crop or Cropper.js -- they expect `<img>` children and conflict with the existing canvas-based pipeline.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Dedicated crop mode: click "Crop" to enter, Apply/Cancel buttons to confirm or discard
- Semi-transparent dark overlay dims area outside crop selection
- 8 drag handles: 4 corners + 4 edge midpoints
- User can drag inside the crop rectangle to reposition it
- Initial crop selection covers the full image (user drags inward)
- Minimum crop size of 20x20 pixels to prevent zero-size crops
- Adjustments (brightness etc.) remain visible during crop mode -- WYSIWYG
- Crop is non-destructive: stored as parameters, re-adjustable later
- Re-entering crop mode shows the previous crop rectangle on the original image
- After applying crop, canvas resizes to fit the cropped result
- "Reset all" clears crop along with everything else
- Crop applied first in the render pipeline, then adjustments
- Larger touch-friendly handles on mobile (44px minimum tap target)
- Keyboard shortcuts: Claude's discretion (Esc/Enter or buttons only)
- Collapsible "Resize" section in the sidebar (consistent with other controls)
- Width/height number inputs pre-filled with current image dimensions
- Lock/unlock toggle icon between width and height -- when locked, changing one updates the other proportionally
- Explicit "Apply" button to execute resize
- Resize operates on the cropped result (not original)
- Upscaling allowed with warning: "Enlarging may reduce quality"
- Toggle between pixels and percentage modes
- Dropdown menu in crop mode toolbar with comprehensive preset list
- Portrait/landscape toggle: Claude's discretion

### Claude's Discretion
- Keyboard shortcuts for crop (Esc/Enter vs buttons only)
- Portrait/landscape orientation toggle design
- Crop handle visual style (color, size on desktop)
- Resize input validation (min/max values)
- How percentage resize mode works (relative to what baseline)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CROP-01 | User can free-drag a resizable rectangle to crop the image | HTML/CSS overlay with pointer event handlers for 8 handles + interior drag; crop stored as percentage coordinates in Zustand; `drawImage` 9-arg form for extraction |
| CROP-02 | User can lock crop to aspect ratio presets (16:9, 1:1, 4:3, etc.) | Aspect ratio constraint applied during handle drag math; preset dropdown sets ratio; enforced by clamping dimensions during resize |
| TRAN-01 | User can resize image by entering width/height with aspect ratio lock toggle | Number inputs with linked aspect ratio; `createImageBitmap` with `resizeWidth`/`resizeHeight` for execution; operates on post-crop dimensions |

</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | UI framework | Existing |
| TypeScript | 5.x | Type safety | Existing |
| Zustand | 5.x | State management | Existing -- extend store with crop/resize state |
| Tailwind CSS | 4.x | Styling | Existing -- crop overlay, handle styles |
| lucide-react | latest | Icons | Existing -- Crop, Lock, Unlock, RotateCw icons |

### No New Dependencies Needed

The crop and resize features are built entirely with:
- Native pointer events (`pointerdown`, `pointermove`, `pointerup`) for drag interactions
- CSS absolute positioning for the overlay layer
- `drawImage()` 9-argument form for crop extraction
- `createImageBitmap()` with `resizeWidth`/`resizeHeight` for resize

### Libraries Evaluated and Rejected

| Library | Why Rejected |
|---------|-------------|
| react-image-crop (v11) | Wraps `<img>` children, not `<canvas>`. Project renders to canvas; converting via toDataURL is wasteful and breaks the pipeline |
| Cropper.js v2 | Web Components architecture; conflicts with React rendering. react-cropper-2 wrapper is new/low adoption |
| react-easy-crop | Also expects `<img>` or `<video>` elements, not canvas |
| react-advanced-cropper | Heavy dependency for what is ultimately coordinate math + CSS |

**Key insight:** The project already has a canvas-based render pipeline. Crop libraries expect to wrap an `<img>` tag. Building a custom overlay is actually simpler than adapting an img-based library to work with a canvas pipeline.

## Architecture Patterns

### Modified Project Structure (additions only)
```
src/
  components/
    CropOverlay.tsx       # HTML/CSS overlay with handles, positioned over canvas
    CropToolbar.tsx        # Apply/Cancel buttons + preset dropdown (shown in crop mode)
    ResizeControls.tsx     # Width/height inputs + aspect lock + Apply button
  utils/
    crop.ts               # Crop math: coordinate conversion, aspect ratio clamping
  types/
    editor.ts             # Extended with CropRegion and ResizeState types
```

### Pattern 1: HTML Overlay for Crop Selection
**What:** A `<div>` layer positioned absolutely over the canvas element, containing the crop rectangle, dimmed overlay regions, and drag handles. The overlay maps pointer events to crop coordinates.
**When to use:** During crop mode.
**Why not draw on canvas:** Drawing crop UI on the canvas would require re-running the render pipeline on every mouse move (60fps). An HTML overlay only needs CSS changes, which the browser composites efficiently via GPU.

```typescript
// CropOverlay sits in the same container as the canvas
// It uses the same CSS dimensions as the canvas (display size)
<div className="relative">
  <canvas ref={canvasRef} style={canvasStyle} />
  {cropMode && (
    <CropOverlay
      canvasStyle={canvasStyle}  // display dimensions
      sourceSize={sourceSize}    // actual image dimensions
      crop={crop}                // percentage-based crop region
      onCropChange={setCropDraft}
      aspectRatio={selectedAspectRatio}
    />
  )}
</div>
```

### Pattern 2: Percentage-Based Crop Coordinates
**What:** Store crop as percentages (0-100) of the source image dimensions, not pixels. Convert to pixels only at render time.
**Why:** The canvas is CSS-scaled to fit the viewport. Pixel coordinates would need recalculation on every resize. Percentages are resolution-independent.

```typescript
interface CropRegion {
  x: number;      // 0-100, percentage from left
  y: number;      // 0-100, percentage from top
  width: number;  // 0-100, percentage of source width
  height: number; // 0-100, percentage of source height
}

// Default: full image selected
const defaultCrop: CropRegion = { x: 0, y: 0, width: 100, height: 100 };

// Convert to source pixels for rendering:
function cropToPixels(crop: CropRegion, sourceW: number, sourceH: number) {
  return {
    sx: Math.round((crop.x / 100) * sourceW),
    sy: Math.round((crop.y / 100) * sourceH),
    sw: Math.round((crop.width / 100) * sourceW),
    sh: Math.round((crop.height / 100) * sourceH),
  };
}
```

### Pattern 3: Display-to-Source Coordinate Mapping
**What:** When the user drags on the overlay, pointer coordinates are in display space (CSS pixels). These must be mapped to source image coordinates via the display scale factor.
**Critical for correctness:** The canvas internal resolution differs from its CSS display size.

```typescript
// The scale factor between display and source
// canvasStyle.width is the CSS display width
// sourceImage.width is the actual image width (after rotation)
function getDisplayScale(displayW: number, sourceW: number): number {
  return displayW / sourceW;
}

// Convert a display-space delta to percentage of source
function displayDeltaToPercent(
  deltaDisplayPx: number,
  displayDimension: number,
  sourceDimension: number
): number {
  // delta in source pixels = deltaDisplayPx / scale
  // delta as percentage = (delta in source pixels / sourceDimension) * 100
  return (deltaDisplayPx / displayDimension) * 100;
}
```

### Pattern 4: Aspect Ratio Constraint During Drag
**What:** When an aspect ratio is locked, resizing via handles must maintain that ratio. The "dominant axis" (which dimension the user is dragging) determines which dimension leads, and the other is calculated.

```typescript
function constrainToAspectRatio(
  width: number,   // percentage
  height: number,  // percentage
  ratio: number,   // width/height (e.g., 16/9)
  sourceW: number, // source image width in pixels
  sourceH: number  // source image height in pixels
): { width: number; height: number } {
  // Convert percentages to pixels for ratio math
  const pxW = (width / 100) * sourceW;
  const pxH = (height / 100) * sourceH;

  // Constrain: try fitting width, calculate height
  let newPxW = pxW;
  let newPxH = newPxW / ratio;

  // If height exceeds available, fit by height instead
  if (newPxH > (height / 100) * sourceH) {
    newPxH = pxH;
    newPxW = newPxH * ratio;
  }

  return {
    width: (newPxW / sourceW) * 100,
    height: (newPxH / sourceH) * 100,
  };
}
```

### Pattern 5: Render Pipeline with Crop
**What:** Extend `renderToCanvas()` to extract the crop region before applying adjustments. Crop is applied first in the pipeline.

```typescript
// Extended renderToCanvas signature
function renderToCanvas(
  ctx: CanvasRenderingContext2D,
  source: ImageBitmap,
  transforms: Transforms,
  adjustments?: Adjustments,
  crop?: CropRegion   // NEW parameter
): void {
  const { rotation, flipH, flipV } = transforms;

  // Step 1: Apply rotation/flip to determine the "working" image orientation
  // Step 2: Extract crop region from the rotated/flipped source
  // Step 3: Apply adjustments via ctx.filter

  // The key insight: crop coordinates are relative to the image
  // AFTER rotation/flip, because that's what the user sees.
  // So we must account for rotation when mapping crop to source coordinates.
}
```

**Pipeline order:** Source -> Rotate/Flip -> Crop -> Adjustments -> Output

### Pattern 6: Resize via createImageBitmap
**What:** Use `createImageBitmap(source, { resizeWidth, resizeHeight, resizeQuality: 'high' })` to produce a new bitmap at the target dimensions.
**Why:** Browser-native, GPU-accelerated, high-quality interpolation. No library needed.

```typescript
async function resizeImage(
  source: ImageBitmap,
  targetWidth: number,
  targetHeight: number
): Promise<ImageBitmap> {
  return createImageBitmap(source, {
    resizeWidth: targetWidth,
    resizeHeight: targetHeight,
    resizeQuality: 'high',
  });
}
```

**Important:** Resize replaces the source bitmap. After resize, the old bitmap must be `.close()`d. Crop parameters should be reset after resize (the image dimensions have changed).

### Anti-Patterns to Avoid
- **Drawing crop UI on the image canvas:** Forces render pipeline re-execution on every mouse move. Use an HTML overlay instead.
- **Storing crop in pixels:** Breaks when canvas display size changes (window resize, mobile rotation). Use percentages.
- **Applying crop before rotation in the pipeline:** User sees the rotated image; crop coordinates are relative to what they see. Crop must be applied to the post-rotation result.
- **Using `canvas.toDataURL()` to bridge to a crop library:** Wasteful double-render, memory overhead, breaks the non-destructive pipeline.
- **Mutating source bitmap for crop:** Crop is non-destructive. Store as parameters, apply at render time. Only resize mutates the source.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image resize | Manual canvas drawImage scaling | `createImageBitmap({ resizeWidth, resizeHeight, resizeQuality: 'high' })` | Browser-native high-quality interpolation with multiple quality modes |
| Pointer capture during drag | Manual window event listeners | `element.setPointerCapture(e.pointerId)` | Automatically routes all pointer events to the element even when cursor leaves; handles touch correctly |
| Touch target sizing | Manual touch detection | CSS media queries with Tailwind `md:` breakpoints | Use `min-w-11 min-h-11` (44px) on mobile, smaller on desktop |

**Key insight:** `setPointerCapture()` is the modern replacement for the old pattern of attaching mousemove/mouseup to `window`. It handles both mouse and touch, and automatically releases when the pointer is lifted.

## Common Pitfalls

### Pitfall 1: Crop Coordinates After Rotation
**What goes wrong:** Crop region appears in the wrong location after the image is rotated because crop coordinates weren't transformed to match the rotation.
**Why it happens:** The user defines crop on the visible (rotated) image, but `drawImage` operates on the original (unrotated) source bitmap.
**How to avoid:** Apply rotation/flip transforms first (to an intermediate canvas or via coordinate transform), then extract the crop region. Alternatively, transform the crop coordinates inversely to map back to the original source orientation.
**Warning signs:** Crop region is offset or mirrored after rotation.

### Pitfall 2: Display Scale Mismatch
**What goes wrong:** The crop rectangle on screen doesn't match the actual crop in the output because the display-to-source scale factor was wrong.
**Why it happens:** The canvas CSS display size differs from its internal resolution. Pointer events report display-space coordinates.
**How to avoid:** Always compute `displayScale = canvasStyleWidth / canvasInternalWidth` and use it for all coordinate conversions. Use `getBoundingClientRect()` on the canvas to get accurate display dimensions.
**Warning signs:** Crop is slightly offset or wrong size in downloaded output.

### Pitfall 3: Handle Drag Overshooting Boundaries
**What goes wrong:** Dragging a corner handle past the image edge creates negative-width rectangles or crop regions outside the image.
**Why it happens:** No clamping on the crop coordinates during drag.
**How to avoid:** Clamp all crop values: `x >= 0`, `y >= 0`, `x + width <= 100`, `y + height <= 100`, `width >= minSize`, `height >= minSize`.
**Warning signs:** Canvas shows garbled output or zero-size result.

### Pitfall 4: Aspect Ratio Constraint Fights Handle Direction
**What goes wrong:** When aspect ratio is locked and user drags a corner handle, the crop jumps erratically because the constraint algorithm doesn't know which axis to prioritize.
**Why it happens:** Corner handles change both width and height simultaneously. The algorithm must decide which dimension "leads" based on the drag direction.
**How to avoid:** For corner handles, determine the dominant axis by comparing the absolute delta in each direction. For edge handles (midpoints), only one axis changes -- the other is calculated from the ratio.
**Warning signs:** Crop rectangle jumps or oscillates during drag with aspect ratio locked.

### Pitfall 5: Resize Loses Crop Parameters
**What goes wrong:** After resize, the previous crop region no longer makes sense because the source dimensions changed, but the crop percentages still reference the old dimensions.
**Why it happens:** Resize replaces the source bitmap entirely.
**How to avoid:** Reset crop to default (full image) after resize. The user decision says resize operates on the cropped result, so: first apply crop to produce a new bitmap, then resize that bitmap, then store as new source with crop cleared.
**Warning signs:** Crop overlay appears at wrong position after resize.

### Pitfall 6: Minimum Crop Size in Percentage vs Pixels
**What goes wrong:** The 20px minimum crop size doesn't translate well to percentages because it depends on the source image dimensions.
**Why it happens:** 20px on a 4000px-wide image is 0.5%, but on a 100px image it's 20%.
**How to avoid:** Enforce the minimum in pixels at the point of conversion (in `cropToPixels()`), not in percentage space. Clamp `sw` and `sh` to `>= 20` pixels.
**Warning signs:** Very small crops possible on large images, or can't crop at all on small images.

## Code Examples

### Crop Overlay Dimming with CSS
```typescript
// The overlay creates 4 semi-transparent rectangles around the crop area
// Using CSS clip-path or 4 positioned divs

// Approach: Single overlay with CSS clip-path (inset)
// The "hole" is the crop area, everything else is dimmed
function CropDimOverlay({ crop }: { crop: CropRegion }) {
  // crop is in percentages
  const clipPath = `polygon(
    0% 0%, 100% 0%, 100% 100%, 0% 100%,
    0% ${crop.y}%,
    ${crop.x}% ${crop.y}%,
    ${crop.x}% ${crop.y + crop.height}%,
    ${crop.x + crop.width}% ${crop.y + crop.height}%,
    ${crop.x + crop.width}% ${crop.y}%,
    0% ${crop.y}%
  )`;

  return (
    <div
      className="absolute inset-0 bg-black/50 pointer-events-none"
      style={{ clipPath }}
    />
  );
}
```

### Drag Handle Interaction
```typescript
// Source: Native Pointer Events API
// Each handle has a "type" indicating which edges it controls
type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

function onHandlePointerDown(
  e: React.PointerEvent,
  handle: HandlePosition
) {
  e.preventDefault();
  e.stopPropagation();

  // Capture pointer to receive events even when cursor leaves the element
  (e.target as HTMLElement).setPointerCapture(e.pointerId);

  const startX = e.clientX;
  const startY = e.clientY;
  const startCrop = { ...currentCrop };

  // Handle movement calculated in pointermove handler
  // Released in pointerup handler
}
```

### Resize with Aspect Ratio Lock
```typescript
// When aspect ratio is locked and width changes, update height proportionally
function handleWidthChange(newWidth: number) {
  if (aspectLocked && currentWidth > 0) {
    const ratio = currentHeight / currentWidth;
    setTargetHeight(Math.round(newWidth * ratio));
  }
  setTargetWidth(newWidth);
}

function handleHeightChange(newHeight: number) {
  if (aspectLocked && currentHeight > 0) {
    const ratio = currentWidth / currentHeight;
    setTargetWidth(Math.round(newHeight * ratio));
  }
  setTargetHeight(newHeight);
}
```

### Crop Preset Data Structure
```typescript
interface CropPreset {
  label: string;
  ratio: number | null; // null = free crop (no constraint)
}

const CROP_PRESETS: CropPreset[] = [
  { label: 'Free', ratio: null },
  // Common
  { label: '1:1 (Square)', ratio: 1 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '16:9', ratio: 16 / 9 },
  { label: '3:2', ratio: 3 / 2 },
  // Social media
  { label: '4:5 (Instagram Portrait)', ratio: 4 / 5 },
  { label: '1.91:1 (Facebook)', ratio: 1.91 },
  // Print
  { label: '5:7', ratio: 5 / 7 },
  { label: '4:5 (8x10)', ratio: 4 / 5 },
];
```

### Applying Crop in renderToCanvas
```typescript
// Source: MDN drawImage 9-argument form
// ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)

function renderToCanvasWithCrop(
  ctx: CanvasRenderingContext2D,
  source: ImageBitmap,
  transforms: Transforms,
  adjustments: Adjustments,
  crop: CropRegion
): void {
  // 1. Determine post-rotation dimensions
  const isRotated90 = transforms.rotation === 90 || transforms.rotation === 270;
  const rotatedW = isRotated90 ? source.height : source.width;
  const rotatedH = isRotated90 ? source.width : source.height;

  // 2. Convert crop percentages to pixels in rotated space
  const sx = Math.round((crop.x / 100) * rotatedW);
  const sy = Math.round((crop.y / 100) * rotatedH);
  const sw = Math.max(20, Math.round((crop.width / 100) * rotatedW));
  const sh = Math.max(20, Math.round((crop.height / 100) * rotatedH));

  // 3. Set output canvas to crop dimensions
  ctx.canvas.width = sw;
  ctx.canvas.height = sh;

  // 4. Draw: rotate/flip the full source, but only extract the crop region
  // Strategy: use an offscreen canvas to apply rotation, then extract crop
  const offscreen = document.createElement('canvas');
  offscreen.width = rotatedW;
  offscreen.height = rotatedH;
  const offCtx = offscreen.getContext('2d')!;

  offCtx.save();
  offCtx.translate(rotatedW / 2, rotatedH / 2);
  offCtx.rotate((transforms.rotation * Math.PI) / 180);
  offCtx.scale(transforms.flipH ? -1 : 1, transforms.flipV ? -1 : 1);
  offCtx.drawImage(source, -source.width / 2, -source.height / 2);
  offCtx.restore();

  // 5. Extract crop region from the rotated result
  ctx.save();
  if (adjustments) {
    ctx.filter = buildFilterString(adjustments);
  }
  ctx.drawImage(offscreen, sx, sy, sw, sh, 0, 0, sw, sh);
  ctx.restore();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `mousedown`/`mousemove`/`mouseup` + window listeners | Pointer Events + `setPointerCapture()` | Widely supported since 2020 | Unified mouse+touch+pen; automatic capture without window listeners |
| Manual bilinear interpolation for resize | `createImageBitmap({ resizeWidth, resizeHeight, resizeQuality: 'high' })` | Baseline since 2021 | Browser-native GPU-accelerated resize with quality options |
| Crop libraries (Cropper.js, react-image-crop) | Custom HTML overlay for canvas-based apps | Project-specific decision | Libraries designed for `<img>` elements, not canvas pipelines |

**Deprecated/outdated:**
- **`mousedown`/`mousemove`/`mouseup` for drag:** Use Pointer Events instead. Unified API, handles touch without separate touch event handlers.
- **Canvas-based resize via `drawImage` scaling:** `createImageBitmap` with resize options is more efficient (doesn't require allocating a full-size canvas).

## Open Questions

1. **Crop interaction with rotation/flip transforms**
   - What we know: Crop coordinates are relative to the post-rotation image. The render pipeline must apply rotation first, then extract the crop region.
   - What's unclear: Whether to use an offscreen canvas for rotation or transform the crop coordinates inversely. Offscreen canvas is simpler but uses more memory for large images.
   - Recommendation: Use offscreen canvas approach (shown in code example). Memory is bounded by the canvas pixel limit already enforced at upload time (16.7M pixels max). The offscreen canvas is temporary and garbage collected.

2. **Percentage resize baseline**
   - What we know: User wants a toggle between pixels and percentage modes for resize.
   - What's unclear: CONTEXT.md marks "how percentage resize mode works (relative to what baseline)" as Claude's discretion.
   - Recommendation: Percentage is relative to the current dimensions (post-crop). 100% = current size, 50% = half, 200% = double. This is the most intuitive interpretation.

3. **Resize input validation bounds**
   - What we know: CONTEXT.md marks min/max values as Claude's discretion.
   - Recommendation: Minimum 1px per dimension. Maximum 10,000px per dimension (prevents accidental memory exhaustion). Show upscale warning when either dimension exceeds the current value.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (already configured) |
| Config file | `vite.config.ts` (inline vitest config) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CROP-01 | Crop coordinates stored and converted correctly | unit | `npx vitest run src/__tests__/crop.test.ts -t "crop coordinates"` | No -- Wave 0 |
| CROP-01 | Crop region clamped to valid bounds | unit | `npx vitest run src/__tests__/crop.test.ts -t "clamp"` | No -- Wave 0 |
| CROP-01 | Crop state in store: set, update, reset | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "crop"` | No -- extend existing |
| CROP-02 | Aspect ratio constraint math | unit | `npx vitest run src/__tests__/crop.test.ts -t "aspect ratio"` | No -- Wave 0 |
| CROP-02 | All presets produce correct ratios | unit | `npx vitest run src/__tests__/crop.test.ts -t "presets"` | No -- Wave 0 |
| TRAN-01 | Resize with aspect lock calculates correct dimensions | unit | `npx vitest run src/__tests__/resize.test.ts -t "aspect lock"` | No -- Wave 0 |
| TRAN-01 | Resize clamps to min/max bounds | unit | `npx vitest run src/__tests__/resize.test.ts -t "bounds"` | No -- Wave 0 |
| TRAN-01 | Percentage mode calculates correct pixel values | unit | `npx vitest run src/__tests__/resize.test.ts -t "percentage"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/crop.test.ts` -- covers CROP-01, CROP-02 (coordinate math, clamping, aspect ratio, presets)
- [ ] `src/__tests__/resize.test.ts` -- covers TRAN-01 (dimension calculation, aspect lock, percentage mode, bounds)
- [ ] Extend `src/__tests__/editorStore.test.ts` -- crop state actions (setCrop, clearCrop, enterCropMode, exitCropMode)
- [ ] Crop overlay interaction is visual -- human checkpoint for drag behavior, handle responsiveness, overlay appearance

## Sources

### Primary (HIGH confidence)
- [MDN - drawImage()](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage) -- 9-argument form for crop extraction (sx, sy, sw, sh, dx, dy, dw, dh)
- [MDN - createImageBitmap()](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap) -- resizeWidth, resizeHeight, resizeQuality options for native resize
- [MDN - Pointer Events / setPointerCapture()](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) -- modern drag interaction pattern

### Secondary (MEDIUM confidence)
- [react-image-crop GitHub](https://github.com/DominicTobias/react-image-crop) -- evaluated v11.0.10; wraps `<img>` not `<canvas>`, hence rejected
- [Cropper.js v2 releases](https://github.com/fengyuanchen/cropperjs/releases) -- Web Components rewrite; react-cropper-2 wrapper exists but low adoption
- [PQINA crop article](https://pqina.nl/blog/crop-an-image-with-canvas/) -- canvas crop patterns

### Tertiary (LOW confidence)
- Various DEV Community / Medium articles on custom crop implementations (patterns verified against MDN)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, using established browser APIs
- Architecture: HIGH -- HTML overlay pattern is well-understood; coordinate math is deterministic
- Crop math: HIGH -- `drawImage` 9-arg form is a stable, well-documented API
- Resize: HIGH -- `createImageBitmap` resize is natively supported with quality options
- Pitfalls: HIGH -- coordinate mapping issues are well-documented in canvas literature

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable domain -- Canvas API, Pointer Events are mature specs)
