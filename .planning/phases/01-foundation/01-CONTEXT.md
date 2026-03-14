# Phase 1: Foundation - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Upload pipeline, canvas renderer, transforms (rotate/flip), download, and live preview. Establishes the non-destructive render pipeline from day one. All edits re-apply from the original source image — no destructive chaining.

</domain>

<decisions>
## Implementation Decisions

### Upload Experience
- Landing page is a full-page drop zone — "Drop your photo here or click to browse" IS the landing
- Drag feedback: dashed border changes color (e.g., blue highlight)
- Validation errors appear inline on the drop zone — no popups or toasts
- When image is auto-downscaled for canvas safety, show a subtle info badge (not alarming)
- To upload a different image after editing, use a "New image" button in the toolbar (not drag-to-replace)

### Editor Layout
- Left sidebar with controls, image fills the right area (Photoshop-style)
- On mobile/narrow screens, sidebar moves to bottom bar
- Controls grouped into collapsible sections (Transform, Adjustments, Crop, etc.)
- Canvas background: checkerboard pattern (transparency indicator)
- Image always fits the canvas view — no zoom controls in v1

### Transform Controls
- Reset: Single "Reset all" button that reverts to the original uploaded image
- After rotating, canvas resizes to fit the rotated image (no clipping)
- All transforms apply instantly — no animations or transitions

### Color Scheme
- System-aware: follows OS dark/light mode preference

### Claude's Discretion
- Transform button design and grouping (icon buttons, dropdown, etc.)
- File info display placement (filename, dimensions)
- App branding (whether to show "WebImager" name, and where)
- Download flow (format picker, quality slider, filename behavior)

</decisions>

<specifics>
## Specific Ideas

- Inspired by DonsPhotoApp — a native macOS app for simple photo processing. This web version expands the feature set for a general audience.
- The checkerboard canvas background was chosen to help with PNG transparency visibility.
- Full-page drop zone landing means the app feels purposeful and immediate — no chrome until there's an image to edit.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project

### Established Patterns
- None — patterns will be established in this phase

### Integration Points
- This phase creates the foundation all subsequent phases plug into: canvas rendering pipeline, state management, and UI shell

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-13*
