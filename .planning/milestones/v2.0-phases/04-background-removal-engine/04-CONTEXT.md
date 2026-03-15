# Phase 4: Background Removal Engine - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

One-click AI background removal using in-browser ML model with Web Worker infrastructure, canvas pipeline integration, progress feedback, and restore capability. Users can remove and restore backgrounds with real-time progress. Export handling and background replacement are Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Button & Toggle UX
- Own collapsible "Background" section in the sidebar (consistent with Adjustments, Crop, Resize sections)
- Single toggle button: shows "Remove Background" initially, changes to "Restore Background" after removal
- Button disabled during crop mode (consistent with how other controls behave during crop)
- "Reset All" clears background removal along with everything else (restores original background)

### Progress Feedback
- Progress feedback appears inside the Background sidebar section (replaces the Remove button while processing)
- Two separate stages with labels: "Downloading model..." with progress bar, then "Removing background..." with progress bar
- Cancel button shown alongside progress bar during both download and inference
- Always show progress bar (even on subsequent uses when model is cached) — consistent experience every time

### First-Use Experience
- Confirm before downloading: inline message in sidebar section replaces Remove button with explanation + "Download & Continue" button
- Message includes privacy angle: "One-time ~45MB download. Runs entirely in your browser — your photo never leaves your device."
- On subsequent uses (model cached in browser), skip confirmation and go straight to inference
- On download failure: show error message in sidebar section with "Try Again" button (no auto-retry)

### Transparency Display
- Existing CSS checkerboard background is sufficient — transparent areas show through naturally (standard Photoshop-like behavior)
- Checkerboard adapts to dark/light mode: light gray in light mode, darker variant in dark mode
- Mask always remains correct through all transforms (rotate, flip, crop, adjustments) — no "best effort" edge cases
- Background removal works on any edit state — user can crop, adjust, then remove background (mask stored at source dimensions, adapts to transforms)

### Claude's Discretion
- Exact checkerboard colors for dark mode variant
- Button icon design (scissors, wand, eraser, etc.)
- Cancel button style and placement relative to progress bar
- How the sidebar section expands/collapses during progress states
- Loading/processing animation details

</decisions>

<specifics>
## Specific Ideas

- Privacy-first messaging on first use reinforces the app's core value ("your photo never leaves your device")
- Two-stage progress communicates transparently what's happening (download vs inference are different operations)
- Single toggle button keeps the UI clean — no need for two buttons when only one action is possible at a time

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useEditorStore` (Zustand store): Needs extension with `backgroundRemoved` state and mask data. Follow existing action pattern (`rotateLeft()`, `setAdjustment()`)
- `renderToCanvas()` in `src/utils/canvas.ts`: Currently handles transforms + crop + adjustments. Needs mask compositing step added (globalCompositeOperation destination-in)
- `useRenderPipeline` hook: Reactively re-renders canvas when state changes. Will pick up background removal state if wired correctly
- `drawCheckerboard()` in `canvas.ts`: Already exists for canvas background rendering
- `.checkerboard-bg` CSS class in `index.css`: Current canvas background — transparent areas will show through this
- `Sidebar.tsx`: Collapsible sections pattern established — new "Background" section follows same pattern
- `resetAll()` in store: Already resets transforms, adjustments, crop — needs extension to clear background removal state

### Established Patterns
- Non-destructive pipeline: all edits as state parameters, re-applied from source on every change
- Zustand store actions with TypeScript interfaces
- Collapsible sidebar sections with one component per feature area
- `ctx.filter` applied via `buildFilterString()` for GPU-accelerated effects
- Crop mode disables other controls — background removal follows this pattern

### Integration Points
- `EditorState` type in `src/types/editor.ts` — needs background removal fields (mask data, active flag)
- `renderToCanvas()` — needs mask compositing step after filter application but compositing approach must avoid premultiplied alpha fringing
- `Sidebar.tsx` — new `BackgroundControls` component in collapsible "Background" section
- `resetAll()` — must also clear background removal state
- Web Worker — new file for model loading and inference (no existing worker infrastructure)
- Canvas component — crop mode check needs to also disable background removal button

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-background-removal-engine*
*Context gathered: 2026-03-14*
