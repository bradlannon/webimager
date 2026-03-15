# Roadmap: WebImager

## Milestones

- ✅ **v1.0 MVP** — Phases 1-3 (shipped 2026-03-14)
- 🚧 **v2.0 AI Background Removal** — Phases 4-5 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-3) — SHIPPED 2026-03-14</summary>

- [x] Phase 1: Foundation (3/3 plans) — completed 2026-03-14
- [x] Phase 2: Adjustments (2/2 plans) — completed 2026-03-14
- [x] Phase 3: Crop & Resize (3/3 plans) — completed 2026-03-14

See: `.planning/milestones/v1.0-ROADMAP.md` for full details

</details>

### 🚧 v2.0 AI Background Removal

- [ ] **Phase 4: Background Removal Engine** - In-browser AI background removal with worker infrastructure, canvas pipeline integration, and interactive controls
- [ ] **Phase 5: Export and Background Replacement** - Transparency-aware export handling and solid color background replacement

## Phase Details

### Phase 4: Background Removal Engine
**Goal**: Users can remove and restore image backgrounds using in-browser AI with real-time progress feedback and correct transparent rendering
**Depends on**: Phase 3 (v1.0 complete)
**Requirements**: BGREM-01, BGREM-02, BGREM-03, BGREM-04, BGREM-05
**Success Criteria** (what must be TRUE):
  1. User clicks "Remove Background" and the background disappears, replaced by a checkerboard pattern indicating transparency
  2. User sees a progress bar with meaningful feedback during model download (~45MB first use) and during inference processing
  3. User clicks "Restore Background" and the original image is fully restored with no quality loss
  4. Background removal result remains visually correct after applying rotation, flip, crop, or adjustment edits (mask aligns with transforms)
  5. UI remains fully responsive during the entire background removal process (no freezing or hanging)
**Plans**: 3 plans

Plans:
- [ ] 04-01-PLAN.md — Install dependency, extend types/store, create Web Worker
- [ ] 04-02-PLAN.md — Create useBackgroundRemoval hook, add mask compositing to render pipeline
- [ ] 04-03-PLAN.md — Build BackgroundControls UI, wire into sidebar, dark mode checkerboard

### Phase 5: Export and Background Replacement
**Goal**: Users can export background-removed images correctly in any format and optionally replace transparent backgrounds with solid colors
**Depends on**: Phase 4
**Requirements**: BGREM-06, EXPT-01, EXPT-02, EXPT-03
**Success Criteria** (what must be TRUE):
  1. When background removal is active, the download format defaults to PNG and the downloaded PNG file preserves transparency
  2. When user downloads as JPEG with background removal active, transparent areas appear as white (not black) in the downloaded file
  3. User sees a clear warning when selecting JPEG format while transparency is active, explaining that transparency will be lost
  4. User can replace the transparent background with a solid color (white, black, or custom color via picker) and see the result immediately on canvas
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md — Transparency-aware export: JPEG white-fill, auto-PNG promotion, JPEG warning
- [ ] 05-02-PLAN.md — Background replacement: solid color picker with canvas preview

### Phase 6: Sidebar Redesign - Move sidebar to bottom bar with professional UI design
**Goal:** Replace sidebar with bottom icon tab bar and slide-up overlay panels, redesign editor chrome with glassmorphism styling, top bar matching bradlannon.ca navigation
**Depends on:** Phase 5
**Requirements**: UI-TOPBAR, UI-BOTTOMBAR, UI-GLASSMORPHISM, UI-PANELS, UI-LAYOUT-REWIRE, UI-PANEL-CONTENT, UI-SLIDER-RESTYLE, UI-CROP-PANEL, UI-RESPONSIVE, UI-VISUAL-VERIFY
**Success Criteria** (what must be TRUE):
  1. Sidebar is completely removed, replaced by a bottom icon tab bar with 6 tabs
  2. Each tab opens a slide-up overlay panel with glassmorphism styling containing that group's controls
  3. Top bar matches bradlannon.ca navigation style with Portfolio, Apps, A/V links
  4. Sliders have premium styling with custom thumb and accent color
  5. Layout is responsive: centered panels on desktop, full-width on mobile
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — Add fonts, glassmorphism CSS, create TopBar + BottomBar + OverlayPanel components
- [x] 06-02-PLAN.md — Rewire Editor layout, populate panels with controls, restyle sliders, visual checkpoint

### Phase 7: Pan and Zoom - Move tool with hand cursor for panning the image and pinch/scroll zoom for magnification
**Goal:** Users can zoom into images with scroll wheel/pinch (cursor-centered, 25%-300%) and drag to pan when zoomed in, with floating glassmorphism zoom controls and proper crop mode coexistence
**Depends on:** Phase 6
**Requirements**: PZ-01, PZ-02, PZ-03, PZ-04, PZ-05, PZ-06, PZ-07, PZ-08
**Success Criteria** (what must be TRUE):
  1. Scroll wheel zooms in/out centered on cursor position within 25%-300% range
  2. Drag pans the image when zoomed past fit-to-view, disabled at fit-to-view
  3. Cursor shows grab/grabbing when zoomed in, default at fit-to-view
  4. Floating zoom controls (+/-, percentage) visible with glassmorphism styling
  5. Double-click resets to fit-to-view
  6. Crop mode coexists with zoom/pan (handle drags crop, elsewhere pans)
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md — Zoom math utilities, store extension, Canvas zoom/pan engine with events and cursors
- [ ] 07-02-PLAN.md — ZoomControls floating UI widget, visual checkpoint

### Phase 8: Background Removal Bug Fixes
**Goal:** Fix background removal state management bugs found during milestone audit — restore action, resize interaction, and dead code cleanup
**Depends on:** Phase 7
**Requirements**: BGREM-04, BGREM-05
**Gap Closure:** Closes gaps from v2.0 audit
**Success Criteria** (what must be TRUE):
  1. Clicking "Restore Background" fully clears background removal state (mask, flag, replacement color) — no stale mask in memory
  2. Applying resize after background removal clears background state cleanly (no stale mask compositing)
  3. BGREM-04 checkerboard requirement verified as satisfied via CSS implementation
  4. No dead imports related to background removal in the codebase
**Plans**: 1 plan

Plans:
- [x] 08-01-PLAN.md — Fix restoreBackground toggle bug, applyResize background state, dead import cleanup

### Phase 9: Worker Lifecycle & Dead Code Cleanup
**Goal:** Fix background removal worker lifecycle so it survives tab switching, and remove dead code accumulated during v2.0 development
**Depends on:** Phase 8
**Requirements**: BGREM-02, BGREM-03
**Gap Closure:** Closes gaps from v2.0 audit
**Success Criteria** (what must be TRUE):
  1. Background removal model download and inference continue running when user switches bottom bar tabs
  2. Progress bar and loading indicators remain accurate after tab switching
  3. No orphaned components in codebase (CropToolbar.tsx, PrivacyBadge.tsx removed or rewired)
  4. No dead store actions (toggleBackground removed)
**Plans**: 1 plan

Plans:
- [ ] 09-01-PLAN.md — Lift useBackgroundRemoval to persistent parent, remove dead code

## Progress

**Execution Order:**
Phases execute in numeric order: 4 → 5 → 6 → 7 → 8 → 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-14 |
| 2. Adjustments | v1.0 | 2/2 | Complete | 2026-03-14 |
| 3. Crop & Resize | v1.0 | 3/3 | Complete | 2026-03-14 |
| 4. Background Removal Engine | 2/3 | In Progress|  | - |
| 5. Export and Background Replacement | v2.0 | 1/2 | In Progress | - |
| 6. Sidebar Redesign | 2/2 | Complete   | 2026-03-14 | 2026-03-14 |
| 7. Pan and Zoom | 2/2 | Complete   | 2026-03-14 | - |
| 8. BG Removal Bug Fixes | 1/1 | Complete | 2026-03-14 | 2026-03-14 |
| 9. Worker Lifecycle & Dead Code | 1/1 | Complete   | 2026-03-15 | - |
