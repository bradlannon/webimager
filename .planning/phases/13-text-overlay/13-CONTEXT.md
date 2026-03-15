# Phase 13: Text Overlay - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Add styled text to images with drag positioning, editable until explicitly applied. One text element at a time — add, style, position, Apply to bake in, then add another if needed. No layer system, no rich text (stroke, shadow, curved), no Google Fonts.

</domain>

<decisions>
## Implementation Decisions

### Text editing flow
- Panel shows "Add Text" button initially; clicking it creates a text element centered on the visible canvas with placeholder text
- One text element at a time — apply bakes it in, then user can add another
- No indication needed after applying — canvas shows the baked text, consistent with crop behavior

### Font & style controls
- 5-8 curated system/web-safe fonts (e.g., sans-serif, serif, monospace, handwritten, display) — Claude picks the specific set
- Bold and italic toggle buttons alongside font selection
- Text size via slider, range 12-120px — consistent with existing adjustment slider pattern
- Color picker: row of 8-10 preset swatches (black, white, red, blue, etc.) plus hex input for custom colors

### Drag & positioning
- New text placed at center of visible canvas area (accounts for zoom/pan)
- Snap-to-center guides: subtle guide lines appear when text aligns with horizontal or vertical image center
- Drag anywhere on the text element to reposition (no separate drag handle)
- Text constrained to image bounds — cannot be dragged off-edge

### Apply/discard behavior
- Dedicated mode with Apply/Cancel buttons on the canvas overlay, consistent with crop pattern
- Switching to another tab auto-discards unapplied text (user must explicitly Apply before switching)
- Reset All does NOT clear previously baked text — once applied, text is permanent (consistent with resize behavior)
- Only baked text appears in exports — unapplied text is a draft and won't be in downloads

### Claude's Discretion
- Specific font list curation (within 5-8 curated guideline)
- Text input method (inline on canvas vs panel text field — Claude picks based on codebase patterns)
- Exact swatch colors for the color picker
- Text overlay visual design (border, handles, selection indicator)
- How text editing is triggered (double-click, single-click, etc.)
- Guide line visual style (color, opacity, dash pattern)

</decisions>

<specifics>
## Specific Ideas

- Architecture decided in v3.0 research: HTML div overlay during editing, ctx.fillText on apply (bake)
- CropOverlay component provides a direct pattern for canvas overlays with Apply/Cancel
- BottomBar tab pattern: add a "Text" tab alongside existing tabs
- Slider for text size should match existing adjustment slider look and feel

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CropOverlay.tsx`: Pattern for canvas overlay with Apply/Cancel buttons — text overlay can follow same structure
- `OverlayPanel` + `BottomBar.tsx`: Tab system with panel content switching — add "Text" tab
- `useEditorStore` (Zustand): Extend with text state (content, font, size, color, bold, italic, position, textMode)
- `renderToCanvas()` in `canvas.ts`: Needs text baking step via `ctx.fillText` after all other rendering
- `RenderOptions` type in `editor.ts`: Extend with optional text fields for baking
- Slider pattern from `AdjustmentControls.tsx`: Reuse for text size slider

### Established Patterns
- Non-destructive pipeline: all edits as state parameters, re-applied from source
- Dedicated mode pattern: crop enters/exits a mode — text should follow same pattern
- Auto-discard on tab switch: crop auto-saves, text auto-discards (different intent, same mechanism)
- Zustand store actions: `setPreset()`, `setAdjustment()` pattern for text actions
- Canvas wrapper div in `Canvas.tsx`: Overlays rendered inside the relative-positioned wrapper

### Integration Points
- `BottomBar.tsx`: Add Text tab to `tabs` array and `PanelContent` switch
- `Canvas.tsx`: Render TextOverlay component conditionally when in text mode (like CropOverlay)
- `editorStore.ts`: Text state fields + enter/exit text mode + apply text action
- `canvas.ts renderToCanvas()`: Add text baking after sharpen and background mask steps
- `RenderOptions` / `editor.ts`: Add text bake data to types

</code_context>

<deferred>
## Deferred Ideas

- Google Fonts support — tracked as UX-03 in future requirements
- Rich text (stroke, shadow, curved text, multi-layer) — Out of Scope table

</deferred>

---

*Phase: 13-text-overlay*
*Context gathered: 2026-03-15*
