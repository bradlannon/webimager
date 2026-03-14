# Phase 7: Pan and Zoom - Research

**Researched:** 2026-03-14
**Domain:** Canvas pan/zoom interaction, pointer events, CSS transforms
**Confidence:** HIGH

## Summary

This phase adds cursor-centered zoom (scroll/pinch, 25%-300%) and drag-to-pan (when zoomed past fit-to-view) to the canvas. The implementation is purely a view transform -- CSS `transform: scale() translate()` on the canvas wrapper -- with no changes to the render pipeline or export. The existing `Canvas.tsx` already computes a fit-to-view scale; zoom multiplies on top of that base scale, and pan offsets translate the canvas within its overflow-hidden container.

The main complexity lies in three areas: (1) cursor-centered zoom math (adjusting pan offset so the point under the cursor stays fixed), (2) coexistence with CropOverlay drag events (crop handle drags vs pan drags), and (3) touch gesture handling (single-finger pan vs two-finger pinch zoom). All of these are well-solved problems using standard pointer/wheel events.

**Primary recommendation:** Store `zoomLevel` (1.0 = fit-to-view) and `panOffset` ({x, y} pixels) in Zustand. Apply as CSS transform on the canvas wrapper div. Use `wheel` event for zoom, `pointerdown/move/up` for pan, and manage crop-vs-pan disambiguation via event target detection.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Scroll wheel zooms in/out, trackpad pinch gesture zooms -- no modifier key needed
- Zoom is cursor-centered (zooms toward where the mouse/pinch is pointing, like Figma)
- Zoom range: 25% to 300%
- +/- buttons also available in floating UI controls
- Double-click on canvas resets to fit-to-view
- Always-on drag to pan when zoomed in past fit-to-view -- no mode switching or spacebar required
- Panning disabled at fit-to-view zoom level (image already fully visible)
- Touch: single finger drag pans when zoomed in, two-finger pinch zooms
- Cursor: open hand (grab) on hover when zoomed in, closed hand (grabbing) while dragging
- Default cursor at fit-to-view zoom (pan not available)
- Floating controls in bottom-right corner of canvas area
- Shows: [-] button, current zoom percentage, [+] button
- Glassmorphism styling matching bottom bar and overlay panels
- Always visible when an image is loaded (no auto-hide)
- Clicking the zoom percentage text toggles between current zoom and fit-to-view
- Zoom and pan both available during crop mode
- Drag near crop handles/edges adjusts the crop; drag elsewhere on the canvas pans
- Cursor differentiates: crosshair near handles, grab cursor elsewhere
- Entering crop mode auto-resets to fit-to-view
- Applying or exiting crop resets zoom to fit-to-view

### Claude's Discretion
- Exact zoom step size per scroll tick (e.g., 10% or 15% increments)
- Zoom animation/smoothing (instant vs eased transitions)
- Floating controls exact positioning and padding
- Pan momentum/inertia on touch devices
- Handle hit-zone size for crop drag vs pan drag differentiation

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | Already in project | Existing |
| Zustand | 5.x | State management for zoom/pan | Existing store pattern |
| CSS transforms | N/A | `transform: scale() translate()` for view | Zero dependencies, GPU-accelerated |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.577.x | Plus/Minus icons for zoom controls | Already in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS transform zoom | Canvas re-render at zoom | CSS transform is instant, no re-render needed, perfect for view-only zoom |
| Custom pan/zoom | react-zoom-pan-pinch | Adds dependency for something achievable in ~100 lines; project prefers minimal deps |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── Canvas.tsx          # Extended with zoom/pan transforms and event handlers
│   └── ZoomControls.tsx    # NEW: Floating +/- zoom widget
├── store/
│   └── editorStore.ts      # Extended with zoom/pan state and actions
```

### Pattern 1: CSS Transform Zoom/Pan
**What:** Apply zoom and pan as CSS transforms on the canvas wrapper, not by re-rendering the canvas content.
**When to use:** Always -- zoom/pan is a view-only operation.
**Example:**
```typescript
// The wrapper div gets a CSS transform based on zoom and pan state
const wrapperStyle: React.CSSProperties = {
  transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
  transformOrigin: '0 0',
  // transition for smooth zoom from +/- buttons (not wheel)
  transition: fromButton ? 'transform 150ms ease-out' : 'none',
};
```

### Pattern 2: Cursor-Centered Zoom Math
**What:** When zooming, adjust pan offset so the point under the cursor stays fixed on screen.
**When to use:** Every zoom operation (wheel, pinch, +/- buttons).
**Example:**
```typescript
// Given: mouse position relative to container, old zoom, new zoom
// Calculate new pan offset to keep cursor point stable
function zoomAtPoint(
  mouseX: number, mouseY: number,
  oldZoom: number, newZoom: number,
  oldPan: { x: number; y: number }
): { x: number; y: number } {
  // Point in content space under cursor
  const contentX = (mouseX - oldPan.x) / oldZoom;
  const contentY = (mouseY - oldPan.y) / oldZoom;
  // New pan to keep that content point under the same screen position
  return {
    x: mouseX - contentX * newZoom,
    y: mouseY - contentY * newZoom,
  };
}
```

### Pattern 3: Zustand State Extension
**What:** Add zoom/pan state to existing store following established patterns.
**When to use:** All zoom/pan state management.
**Example:**
```typescript
// New state fields
zoomLevel: number;        // 1.0 = fit-to-view, 2.0 = 200%, etc.
panOffset: { x: number; y: number };  // pixels in container space

// New actions
setZoom: (level: number, cursorX?: number, cursorY?: number) => void;
setPan: (offset: { x: number; y: number }) => void;
resetView: () => void;   // Back to fit-to-view (zoom=1, pan={0,0})
```

### Pattern 4: Crop/Pan Disambiguation
**What:** During crop mode, determine whether a drag should crop or pan based on proximity to crop handles.
**When to use:** When crop mode is active and user drags.
**Example:**
```typescript
// CropOverlay already captures pointer events on handles and the crop rect interior
// Pan operates on the container div BEHIND the crop overlay
// Solution: CropOverlay uses e.stopPropagation() on its pointer events (already does this)
// The Canvas container only receives pointer events that "fall through" the overlay
// Pan handler on the container fires only when CropOverlay doesn't capture
```

### Anti-Patterns to Avoid
- **Re-rendering canvas content on zoom:** CSS transform handles scaling; re-rendering would be slow and unnecessary since zoom is view-only
- **Using `transform-origin: center center` with translate:** Makes math harder; use `transform-origin: 0 0` and compute offsets explicitly
- **Storing zoom as percentage string:** Store as a number (1.0 = 100%); format for display only in the UI
- **Pan without bounds:** Allow pan but clamp so the image can't be dragged completely off-screen

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pinch zoom detection | Custom touch math | `wheel` event with `ctrlKey` (trackpad pinch fires as ctrl+wheel in browsers) | Browser standard behavior, cross-platform |
| Smooth zoom animation | Custom requestAnimationFrame loop | CSS `transition` on transform property | GPU-accelerated, simpler |

**Key insight:** Browser wheel events already normalize trackpad pinch gestures as `wheel` events with `ctrlKey: true` and `deltaY` for zoom amount. No need for separate touch gesture detection for pinch-to-zoom on trackpads.

## Common Pitfalls

### Pitfall 1: Trackpad Pinch Fires as Ctrl+Wheel
**What goes wrong:** Developers add separate touch handlers for pinch, but trackpad pinch on desktop already fires as `wheel` event with `ctrlKey: true`.
**Why it happens:** Confusion between trackpad gestures and touchscreen gestures.
**How to avoid:** Handle `wheel` event for both scroll-wheel and trackpad pinch. The `deltaY` is the zoom delta. Call `e.preventDefault()` to prevent browser zoom.
**Warning signs:** Page zooms instead of canvas zooming when pinching on trackpad.

### Pitfall 2: Browser Default Zoom Interference
**What goes wrong:** Ctrl+scroll or pinch triggers the browser's native page zoom instead of the canvas zoom.
**Why it happens:** Missing `e.preventDefault()` on the wheel event.
**How to avoid:** Add `{ passive: false }` when attaching the wheel event listener, then call `e.preventDefault()`. Note: React's `onWheel` is passive by default in React 19 -- must use `addEventListener` directly with `{ passive: false }`.
**Warning signs:** The entire page zooms rather than just the canvas.

### Pitfall 3: Pan Offset Not Adjusted on Zoom
**What goes wrong:** Zooming shifts the visible area unexpectedly because pan offset wasn't recalculated.
**Why it happens:** Pan offset is in screen pixels but zoom changes the relationship between screen and content coordinates.
**How to avoid:** Always use the cursor-centered zoom math (Pattern 2 above) that recalculates pan offset when zoom changes.
**Warning signs:** Image "jumps" when zooming in/out.

### Pitfall 4: CropOverlay Coordinates Break Under Zoom
**What goes wrong:** Crop handles don't align with visible image regions because CropOverlay uses percentage-based positioning relative to canvasRect, but canvasRect dimensions don't account for zoom.
**Why it happens:** CropOverlay receives `canvasRect` which is the base (fit-to-view) size. Under zoom, the visual size differs.
**How to avoid:** CropOverlay should continue using the base canvasRect dimensions for its percentage math. The CSS transform on the parent wrapper scales everything uniformly -- handles, crop area, and image all scale together. The key is that CropOverlay must be INSIDE the transformed wrapper, not outside it.
**Warning signs:** Crop handles appear in wrong positions when zoomed.

### Pitfall 5: Pointer Events Coordinates Under CSS Transform
**What goes wrong:** `e.clientX/Y` from pointer events don't match content coordinates when a CSS transform is applied.
**Why it happens:** `clientX/Y` are in viewport space, not in the transformed element's space.
**How to avoid:** For pan: use delta between moves (clientX differences are fine for deltas). For crop: CropOverlay already uses deltas from `startX/startY`, which work correctly because the deltas are divided by canvasRect dimensions that are the pre-transform base size. Since the CSS transform scales the overlay identically, the percentage math still works.
**Warning signs:** Dragging feels offset or accelerated/decelerated relative to cursor.

### Pitfall 6: Reset View on Image Load
**What goes wrong:** Loading a new image keeps the previous image's zoom/pan state.
**Why it happens:** `setImage` resets most state but doesn't reset zoom/pan.
**How to avoid:** Add `zoomLevel: 1, panOffset: { x: 0, y: 0 }` to `setImage` reset, and to `resetAll`.
**Warning signs:** New image appears zoomed in or offset.

## Code Examples

### Wheel Event Handler for Zoom
```typescript
// Must use native addEventListener for { passive: false }
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom step: ~10% per scroll tick, finer for trackpad
    const zoomFactor = e.ctrlKey
      ? 1 - e.deltaY * 0.01  // Trackpad pinch: smaller deltas
      : 1 - e.deltaY * 0.002; // Scroll wheel: larger deltas

    const newZoom = Math.max(0.25, Math.min(3.0, zoomLevel * zoomFactor));
    const newPan = zoomAtPoint(mouseX, mouseY, zoomLevel, newZoom, panOffset);

    setZoom(newZoom);
    setPan(newPan);
  };

  container.addEventListener('wheel', handleWheel, { passive: false });
  return () => container.removeEventListener('wheel', handleWheel);
}, [zoomLevel, panOffset, setZoom, setPan]);
```

### Pan Drag Handler
```typescript
const panDragRef = useRef<{ startX: number; startY: number; startPan: { x: number; y: number } } | null>(null);

const handlePointerDown = (e: React.PointerEvent) => {
  if (zoomLevel <= 1) return; // No pan at fit-to-view
  e.currentTarget.setPointerCapture(e.pointerId);
  panDragRef.current = {
    startX: e.clientX,
    startY: e.clientY,
    startPan: { ...panOffset },
  };
};

const handlePointerMove = (e: React.PointerEvent) => {
  if (!panDragRef.current) return;
  setPan({
    x: panDragRef.current.startPan.x + (e.clientX - panDragRef.current.startX),
    y: panDragRef.current.startPan.y + (e.clientY - panDragRef.current.startY),
  });
};

const handlePointerUp = (e: React.PointerEvent) => {
  if (!panDragRef.current) return;
  e.currentTarget.releasePointerCapture(e.pointerId);
  panDragRef.current = null;
};
```

### Floating Zoom Controls Component
```typescript
// ZoomControls.tsx - Floating glassmorphism widget
function ZoomControls({ zoomLevel, onZoomIn, onZoomOut, onResetZoom }: Props) {
  return (
    <div className="absolute bottom-14 right-3 z-40 glass rounded-lg px-2 py-1 flex items-center gap-1 border border-neutral-200/60 shadow-sm">
      <button onClick={onZoomOut} className="p-1 hover:text-[#2A9D8F]" aria-label="Zoom out">
        <Minus className="w-4 h-4" />
      </button>
      <button
        onClick={onResetZoom}
        className="text-xs font-semibold w-12 text-center hover:text-[#2A9D8F]"
      >
        {Math.round(zoomLevel * 100)}%
      </button>
      <button onClick={onZoomIn} className="p-1 hover:text-[#2A9D8F]" aria-label="Zoom in">
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
```

### Double-Click to Reset
```typescript
const handleDoubleClick = useCallback(() => {
  resetView(); // Sets zoom to 1.0, pan to {0, 0}
}, [resetView]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Canvas re-draw at zoom levels | CSS transform for view zoom | Standard practice | Instant zoom, no render cost |
| Separate touch/mouse handlers | Unified pointer events API | Widely supported | Single code path for mouse + touch |
| Library-based pan/zoom (Hammer.js) | Native wheel + pointer events | ~2020+ | No dependency, same capability |

**Deprecated/outdated:**
- `mousewheel` / `DOMMouseScroll` events: Use `wheel` event instead (standard since ~2015)
- Touch event handlers for pinch: Trackpad pinch fires as `wheel` with `ctrlKey`; touchscreen pinch can use pointer events or touch events as needed

## Open Questions

1. **Touch device pinch zoom (not trackpad)**
   - What we know: Trackpad pinch fires as wheel events. Real touchscreen two-finger pinch uses `touchstart/move/end` with `e.touches.length === 2`.
   - What's unclear: Whether the app needs dedicated touchscreen pinch handling or if trackpad-only is sufficient for the target audience (desktop web image editor).
   - Recommendation: Implement basic two-finger touch pinch detection using touch event distance calculation. Low complexity (~20 lines) and covers mobile/tablet use.

2. **Pan bounds clamping**
   - What we know: Pan should be bounded so the image can't be dragged entirely off-screen.
   - What's unclear: Exact clamping rules -- should it allow half-off? Quarter?
   - Recommendation: Clamp so at least 20% of the image remains visible in both axes. Simple enough to adjust later.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x + @testing-library/react 16.x |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PZ-01 | Scroll wheel changes zoom level | unit | `npx vitest run src/__tests__/panZoom.test.ts -t "wheel zoom"` | No - Wave 0 |
| PZ-02 | Zoom is cursor-centered | unit | `npx vitest run src/__tests__/panZoom.test.ts -t "cursor-centered"` | No - Wave 0 |
| PZ-03 | Zoom clamped 25%-300% | unit | `npx vitest run src/__tests__/panZoom.test.ts -t "clamp"` | No - Wave 0 |
| PZ-04 | Pan drag when zoomed in | unit | `npx vitest run src/__tests__/panZoom.test.ts -t "pan drag"` | No - Wave 0 |
| PZ-05 | Pan disabled at fit-to-view | unit | `npx vitest run src/__tests__/panZoom.test.ts -t "pan disabled"` | No - Wave 0 |
| PZ-06 | Double-click resets view | unit | `npx vitest run src/__tests__/panZoom.test.ts -t "reset"` | No - Wave 0 |
| PZ-07 | Zoom controls render and function | unit | `npx vitest run src/__tests__/panZoom.test.ts -t "zoom controls"` | No - Wave 0 |
| PZ-08 | Store actions update zoom/pan | unit | `npx vitest run src/__tests__/panZoom.test.ts -t "store"` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/panZoom.test.ts` -- covers PZ-01 through PZ-08
- [ ] Zoom math utility functions should be in a testable pure function (e.g., `src/utils/zoom.ts`)

## Sources

### Primary (HIGH confidence)
- Project source code: Canvas.tsx, CropOverlay.tsx, editorStore.ts, Editor.tsx -- direct reading of integration points
- MDN Web Docs: WheelEvent, PointerEvent, CSS transform -- standard web APIs

### Secondary (MEDIUM confidence)
- Established pattern: CSS transform zoom/pan is standard in web image editors (Figma, Canva web, Photopea all use this approach)
- Browser behavior: trackpad pinch -> ctrlKey wheel event is documented browser behavior across Chrome, Firefox, Safari

### Tertiary (LOW confidence)
- Touch device pinch: exact behavior may vary across iOS Safari vs Chrome Android -- needs validation if mobile support is critical

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - using existing project dependencies only, standard web APIs
- Architecture: HIGH - CSS transform zoom/pan is well-established pattern, codebase integration points clearly understood
- Pitfalls: HIGH - these are well-known issues in pan/zoom implementations, especially the passive wheel event and coordinate transform issues

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable web APIs, no moving targets)
