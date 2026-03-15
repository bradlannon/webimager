# Phase 7: Pan and Zoom - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Add pan and zoom capabilities to the canvas. Users can scroll-wheel/pinch to zoom (cursor-centered), drag to pan when zoomed in, and use floating +/- controls to adjust magnification. Pan/zoom is view-only — does not affect the source image, render pipeline, or exports.

</domain>

<decisions>
## Implementation Decisions

### Zoom Activation
- Scroll wheel zooms in/out, trackpad pinch gesture zooms — no modifier key needed
- Zoom is cursor-centered (zooms toward where the mouse/pinch is pointing, like Figma)
- Zoom range: 25% to 300%
- +/- buttons also available in floating UI controls
- Double-click on canvas resets to fit-to-view

### Pan Activation
- Always-on drag to pan when zoomed in past fit-to-view — no mode switching or spacebar required
- Panning disabled at fit-to-view zoom level (image already fully visible)
- Touch: single finger drag pans when zoomed in, two-finger pinch zooms
- Cursor: open hand (grab) on hover when zoomed in, closed hand (grabbing) while dragging
- Default cursor at fit-to-view zoom (pan not available)

### Zoom UI Controls
- Floating controls in bottom-right corner of canvas area
- Shows: [-] button, current zoom percentage, [+] button
- Glassmorphism styling matching bottom bar and overlay panels
- Always visible when an image is loaded (no auto-hide)
- Clicking the zoom percentage text toggles between current zoom and fit-to-view (quick reset shortcut)

### Interaction with Crop Mode
- Zoom and pan both available during crop mode — essential for precise cropping on large images
- Drag near crop handles/edges adjusts the crop; drag elsewhere on the canvas pans
- Cursor differentiates: crosshair near handles, grab cursor elsewhere
- Entering crop mode auto-resets to fit-to-view so user sees the full image for initial placement
- Applying or exiting crop resets zoom to fit-to-view to show the cropped result at full size

### Claude's Discretion
- Exact zoom step size per scroll tick (e.g., 10% or 15% increments)
- Zoom animation/smoothing (instant vs eased transitions)
- Floating controls exact positioning and padding
- Pan momentum/inertia on touch devices
- Handle hit-zone size for crop drag vs pan drag differentiation

</decisions>

<specifics>
## Specific Ideas

- Zoom controls should feel like Figma's floating zoom widget — small, unobtrusive, always accessible
- Pan behavior should feel like Google Maps — natural drag-to-move when zoomed in
- The grab/grabbing cursor swap is critical for discoverability — users should immediately understand they can pan

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Canvas.tsx`: Container with `containerRef` and `canvasRef` — zoom/pan state integrates here. Currently calculates `scale` for fit-to-view in `updateCanvasSize()`
- `useEditorStore` (Zustand): Needs extension with zoom level and pan offset state. Follows existing action pattern
- `CropOverlay.tsx`: Has handle-based drag interaction — pan must coexist by detecting drag zone (near handles vs elsewhere)
- `.glass` CSS class: Existing glassmorphism utility for floating zoom controls
- `OverlayPanel.tsx`: Established glassmorphism panel pattern

### Established Patterns
- Zustand store with TypeScript interfaces for all state
- `useCallback` + `useEffect` + `ResizeObserver` pattern in Canvas.tsx for responsive sizing
- CSS `canvasStyle` applied via inline styles — zoom/pan can extend this with CSS transforms
- Accent color `#2A9D8F` for interactive elements

### Integration Points
- `Canvas.tsx` `updateCanvasSize()`: Currently computes fit-to-view scale — needs zoom multiplier applied on top
- `Canvas.tsx` container div: Needs wheel/touch/pointer event handlers for zoom and pan
- `CropOverlay.tsx`: Drag events need to distinguish handle interaction from pan — crop overlay already handles its own pointer events
- `Editor.tsx`: Floating zoom controls component renders alongside Canvas
- `useRenderPipeline.ts`: No changes needed — zoom/pan is purely a view transform, not a render pipeline change

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-pan-and-zoom*
*Context gathered: 2026-03-14*
