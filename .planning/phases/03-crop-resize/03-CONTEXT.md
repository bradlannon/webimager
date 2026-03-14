# Phase 3: Crop & Resize - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Free-drag crop with aspect ratio presets and resize with dimension inputs + aspect ratio lock. Crop is stored as non-destructive parameters (re-adjustable). Resize operates on the cropped result. This completes the full editing workflow.

</domain>

<decisions>
## Implementation Decisions

### Crop Interaction
- Dedicated crop mode: click "Crop" to enter, Apply/Cancel buttons to confirm or discard
- Semi-transparent dark overlay dims area outside crop selection
- 8 drag handles: 4 corners + 4 edge midpoints
- User can drag inside the crop rectangle to reposition it
- Initial crop selection covers the full image (user drags inward)
- Minimum crop size of 20x20 pixels to prevent zero-size crops
- Adjustments (brightness etc.) remain visible during crop mode — WYSIWYG
- Crop is non-destructive: stored as parameters, re-adjustable later
- Re-entering crop mode shows the previous crop rectangle on the original image
- After applying crop, canvas resizes to fit the cropped result
- "Reset all" clears crop along with everything else
- Crop applied first in the render pipeline, then adjustments
- Larger touch-friendly handles on mobile (44px minimum tap target)
- Keyboard shortcuts: Claude's discretion (Esc/Enter or buttons only)

### Resize Controls
- Collapsible "Resize" section in the sidebar (consistent with other controls)
- Width/height number inputs pre-filled with current image dimensions
- Lock/unlock toggle icon between width and height — when locked, changing one updates the other proportionally
- Explicit "Apply" button to execute resize
- Resize operates on the cropped result (not original)
- Upscaling allowed with warning: "Enlarging may reduce quality"
- Toggle between pixels and percentage modes

### Crop Presets
- Dropdown menu in crop mode toolbar
- Comprehensive preset list including:
  - Free (no constraint)
  - Common: 1:1, 4:3, 16:9, 3:2
  - Social media: 4:5 (Instagram portrait), 1.91:1 (Facebook)
  - Print: 5:7, 4:5 (8x10)
- Portrait/landscape toggle: Claude's discretion

### Claude's Discretion
- Keyboard shortcuts for crop (Esc/Enter vs buttons only)
- Portrait/landscape orientation toggle design
- Crop handle visual style (color, size on desktop)
- Resize input validation (min/max values)
- How percentage resize mode works (relative to what baseline)

</decisions>

<specifics>
## Specific Ideas

- Crop interaction inspired by standard image editors (Photoshop, Lightroom) — dedicated mode with overlay and handles
- Non-destructive crop means users can experiment without fear of losing data
- The "crop first, then adjust" pipeline order means adjustments are applied to the cropped area, which is the most intuitive behavior (what you see during crop is what you get)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useEditorStore` (Zustand): Needs extension with crop state (x, y, width, height) and resize state
- `renderToCanvas()` in `canvas.ts`: Currently applies rotation/flip + `ctx.filter` adjustments. Needs crop region extraction added before adjustments
- `useRenderPipeline` hook: Will re-render when crop state changes
- `Sidebar.tsx`: Collapsible sections pattern — add "Crop" and "Resize" sections
- `Transforms` type in `editor.ts`: Needs extension with crop and resize parameters

### Established Patterns
- Non-destructive pipeline: all edits as state parameters
- Zustand store actions: `setAdjustment()`, `rotateLeft()` pattern
- Collapsible sidebar sections with component per feature area
- `ctx.filter` for GPU-accelerated effects
- TDD with Vitest for data layer, human checkpoint for visual

### Integration Points
- Canvas component needs a crop overlay layer (separate from the image canvas)
- Crop mode toggles need to disable/hide other controls during active crop
- Download path must apply crop before rendering final output
- `resetAll()` must clear crop parameters

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-crop-resize*
*Context gathered: 2026-03-13*
