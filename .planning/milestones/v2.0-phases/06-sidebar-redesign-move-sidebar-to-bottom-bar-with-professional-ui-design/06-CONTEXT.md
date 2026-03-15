# Phase 6: Sidebar Redesign - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the left sidebar with a bottom-anchored icon tab bar and slide-up overlay panels. Redesign the entire editor chrome (top bar, bottom bar, control panels, sliders) with glassmorphism styling and smooth animations. Top bar matches the bradlannon.ca site navigation. All screen sizes use the same bottom bar layout.

</domain>

<decisions>
## Implementation Decisions

### Bottom Bar Layout
- Icon tab bar fixed at the very bottom of the screen with 6 tabs
- Tapping a tab slides up an overlay panel with that group's controls (one panel at a time)
- Panel overlays on top of the image (does not push/resize the image area)
- Icon bar always visible even when a panel is open — user can switch panels directly
- Close panel by: tapping the active tab again, or tapping outside the panel (on the image/backdrop area)
- Tapping a different tab switches panels without closing first

### Control Grouping & Navigation
- All 6 groups as separate tabs: Crop, Transform, Adjustments, Background, Resize, Download
- Tab order follows editing workflow (left to right): Crop → Transform → Adjustments → Background → Resize → Download
- Each tab shows icon + text label always (like iOS tab bar, ~56px height)
- Download stays as a bottom tab (not promoted to top bar)

### Visual Polish & Style
- Glassmorphism / frosted glass effect on bottom bar and panels (semi-transparent background with backdrop-filter blur)
- Smooth slide animation on panel open/close (~200-300ms easing)
- Active tab indicated by accent color fill on icon + blue label text; inactive tabs are gray outline icons
- Sliders get a visual refresh: custom-styled with filled track, rounded thumb, value labels — match the premium frosted aesthetic
- Dark mode: frosted glass adapts (darker tint, same blur effect)

### Top Bar (Site Navigation)
- Top bar matches bradlannon.ca site navigation style (same fonts, colors, layout)
- Left side: nav links — Portfolio, Apps, A/V (real links to bradlannon.ca pages)
- Right side: New Image button + Reset All button (WebImager-specific actions)
- No search bar on this page
- Apps link should be highlighted/active since WebImager lives under Apps
- Frosted glass style on top bar to match bottom bar

### Desktop vs Mobile
- Bottom bar on all screen sizes — same layout everywhere
- On desktop (wide screens), slide-up panels are contained/centered (not full-width) — sized to fit their controls
- On mobile, panels span full width
- Consistent glassmorphism styling across all breakpoints

### Claude's Discretion
- Exact blur intensity and opacity values for glassmorphism
- Panel max-height and whether it's different per group
- Slider thumb size and track thickness
- Animation easing curve (ease-out, spring, etc.)
- Icon choices for each tab (Lucide icon selection)
- Backdrop overlay darkness when panel is open
- Exact breakpoint where panels switch from contained to full-width
- Whether the Privacy Badge moves or gets removed

</decisions>

<specifics>
## Specific Ideas

- Top nav must visually match bradlannon.ca — same font (Nunito Sans + Playfair Display), same accent color (#2A9D8F), same link styling
- The glassmorphism should feel like macOS dock or iOS control center — premium, not gimmicky
- Panels should feel snappy with the slide animation — not sluggish
- The overall redesign should make WebImager feel like a polished product, not a developer tool

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Sidebar.tsx`: Current sidebar with `CollapsibleSection` pattern — will be replaced entirely by new `BottomBar.tsx` and panel components
- `TransformControls.tsx`, `AdjustmentControls.tsx`, `BackgroundControls.tsx`, `ResizeControls.tsx`, `DownloadPanel.tsx`: Panel content components — internals stay, container styling changes
- `CropToolbar.tsx`: Currently rendered in Editor.tsx above the canvas — crop controls move into the bottom bar panel
- `Editor.tsx`: Main layout component — needs restructuring (remove sidebar, add bottom bar, update top bar)
- `useEditorStore`: All state management stays the same — this is purely a UI/layout change
- Lucide icons already used throughout — same library for tab icons

### Established Patterns
- Tailwind CSS v4 for all styling
- Dark/light mode via `dark:` variants and `prefers-color-scheme`
- Component-per-feature pattern (each feature group is its own component)
- Zustand store selectors for reactive updates

### Integration Points
- `Editor.tsx` layout structure: top bar + canvas + sidebar → top bar + canvas + bottom bar
- `CropToolbar.tsx` currently conditionally rendered in Editor — moves into bottom bar panel
- `cropMode` state currently disables sidebar controls — same behavior applies to bottom bar
- bradlannon.ca nav styling from `BI/public/apps.html` — font imports, color variables, link styles

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-sidebar-redesign*
*Context gathered: 2026-03-14*
