# Phase 2: Adjustments - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Add brightness, contrast, and saturation sliders plus one-click greyscale to the existing editor. All adjustments compose correctly with each other and with existing transforms (rotate/flip). Live preview via the non-destructive render pipeline established in Phase 1.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
User gave full discretion on all adjustment UX decisions. Claude should make sensible choices for:
- Slider design (appearance, range, labels, value display)
- Default/neutral slider positions and step sizes
- Whether sliders have individual reset or rely on global "Reset all"
- Greyscale toggle design (button vs toggle switch)
- How greyscale interacts with brightness/contrast/saturation (can they be combined?)
- Ordering of controls in the Adjustments section
- Snap-to-default behavior on sliders

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Should feel like a straightforward image editor adjustment panel.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useEditorStore` (Zustand store): Currently tracks `sourceImage`, `transforms`, and file metadata. Needs extension with adjustment state.
- `renderToCanvas()` in `src/utils/canvas.ts`: Currently applies rotation/flip via canvas transforms. Needs extension with `ctx.filter` for brightness/contrast/saturation/greyscale.
- `useRenderPipeline` hook: Reactively re-renders canvas when state changes. Will automatically pick up new adjustment state if wired correctly.
- `Sidebar.tsx`: Already has collapsible sections pattern — Adjustments section placeholder exists.

### Established Patterns
- **Non-destructive pipeline**: All edits stored as state parameters, re-applied from source on every change. Adjustments must follow this pattern.
- **Zustand store**: Actions like `rotateLeft()`, `flipHorizontal()` — adjustments should follow the same action pattern (e.g., `setBrightness(value)`).
- **Instant feedback**: No animations or transitions — slider changes render immediately.
- **`ctx.filter` for GPU-accelerated effects**: Research confirmed brightness, contrast, saturate, and grayscale are all supported CSS filter functions on canvas context.

### Integration Points
- `Transforms` type in `src/types/editor.ts` — needs extension with adjustment fields
- `renderToCanvas()` — needs `ctx.filter` string built from adjustment values
- `Sidebar.tsx` — new `AdjustmentControls` component renders inside collapsible "Adjustments" section
- `resetAll()` — must also reset adjustment values to defaults

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-adjustments*
*Context gathered: 2026-03-13*
