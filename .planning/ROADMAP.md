# Roadmap: WebImager

## Milestones

- [x] **v1.0 MVP** — Phases 1-3 (shipped 2026-03-14)
- [x] **v2.0 AI Background Removal** — Phases 4-10 (shipped 2026-03-15)
- [ ] **v3.0 Editing Power** — Phases 11-14 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-3) — SHIPPED 2026-03-14</summary>

- [x] Phase 1: Foundation (3/3 plans) — completed 2026-03-14
- [x] Phase 2: Adjustments (2/2 plans) — completed 2026-03-14
- [x] Phase 3: Crop & Resize (3/3 plans) — completed 2026-03-14

See: `.planning/milestones/v1.0-ROADMAP.md` for full details

</details>

<details>
<summary>v2.0 AI Background Removal (Phases 4-10) — SHIPPED 2026-03-15</summary>

- [x] Phase 4: Background Removal Engine (2/3 plans, 1 superseded) — completed 2026-03-14
- [x] Phase 5: Export and Background Replacement (2/2 plans) — completed 2026-03-14
- [x] Phase 6: Sidebar Redesign (2/2 plans) — completed 2026-03-14
- [x] Phase 7: Pan and Zoom (2/2 plans) — completed 2026-03-14
- [x] Phase 8: Background Removal Bug Fixes (1/1 plan) — completed 2026-03-14
- [x] Phase 9: Worker Lifecycle & Dead Code (1/1 plan) — completed 2026-03-15
- [x] Phase 10: Restore Status Fix (1/1 plan) — completed 2026-03-15

See: `.planning/milestones/v2.0-ROADMAP.md` for full details

</details>

### v3.0 Editing Power (In Progress)

**Milestone Goal:** Add blur/sharpen sliders, preset filters, text overlay, and drawing/annotation tools — all editable-until-applied, all client-side.

- [x] **Phase 11: Blur, Sharpen, and Safari Compatibility** - Add blur/sharpen sliders to Adjustments panel and fix ctx.filter for Safari (completed 2026-03-15)
- [ ] **Phase 12: Preset Filters** - Add 8-10 visual preset filters with independent preset/adjustment model
- [ ] **Phase 13: Text Overlay** - Add draggable text with font/size/color, editable until applied
- [ ] **Phase 14: Drawing and Annotation** - Add freehand drawing and shape tools, editable until applied

## Phase Details

### Phase 11: Blur, Sharpen, and Safari Compatibility
**Goal**: Users can blur and sharpen images with live preview, and all adjustments work correctly on Safari
**Depends on**: Phase 10 (v2.0 complete)
**Requirements**: FILT-01, FILT-02, FILT-05, COMPAT-01
**Success Criteria** (what must be TRUE):
  1. User can drag a blur slider and see the image blur in real time without UI freezes
  2. User can drag a sharpen slider and see the image sharpen in real time
  3. Blur and sharpen controls appear in the existing Adjustments panel (no new tab)
  4. All adjustments (brightness, contrast, saturation, blur, sharpen) produce correct visual results in Safari
  5. Exported images include blur/sharpen effects at full resolution
**Plans**: 2 plans

Plans:
- [x] 11-01-PLAN.md — Refactor renderToCanvas to options object + Safari polyfill
- [ ] 11-02-PLAN.md — Add blur/sharpen sliders, convolution kernel, debounced UI

Note: This phase includes a prerequisite refactor of `renderToCanvas` from positional parameters to an options object, preventing signature churn across subsequent phases.

### Phase 12: Preset Filters
**Goal**: Users can apply named visual filters from a selection grid that override manual adjustments
**Depends on**: Phase 11 (buildFilterString changes, Safari fix)
**Requirements**: FILT-03, FILT-04
**Success Criteria** (what must be TRUE):
  1. User can select from 8-10 preset filters displayed in a visual grid
  2. Selecting a preset changes the image appearance immediately; selecting "None" restores the unfiltered look
  3. Preset filters override manual adjustment values (per FILT-04); "None" restores defaults
  4. Exported images include the active preset filter
**Plans**: 2 plans

Plans:
- [ ] 12-01-PLAN.md — Extend Adjustments type, buildFilterString, preset definitions, store actions
- [ ] 12-02-PLAN.md — PresetGrid component and AdjustmentControls integration

### Phase 13: Text Overlay
**Goal**: Users can add styled text to images with drag positioning, editable until explicitly applied
**Depends on**: Phase 12 (tab pattern established)
**Requirements**: TEXT-01, TEXT-02, TEXT-03, TEXT-04
**Success Criteria** (what must be TRUE):
  1. User can add text with selectable font, adjustable size, and color picker
  2. User can drag text to any position on the canvas, including while zoomed/panned
  3. User can edit text content, change font/size/color, and reposition until clicking "Apply"
  4. After applying, text is permanently baked into the image and appears in exported files
**Plans**: TBD

### Phase 14: Drawing and Annotation
**Goal**: Users can draw freehand and add shape annotations, editable until explicitly applied
**Depends on**: Phase 13 (overlay pattern and screenToCanvas utility established)
**Requirements**: DRAW-01, DRAW-02, DRAW-03, DRAW-04
**Success Criteria** (what must be TRUE):
  1. User can draw smooth freehand strokes on the image with selectable color and thickness
  2. User can add arrow, rectangle, circle, and line shapes with selectable color and thickness
  3. Drawing elements remain visible and editable (with per-stroke undo and clear-all) until clicking "Apply"
  4. After applying, drawings are permanently baked into the image and appear in exported files
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 11 -> 12 -> 13 -> 14

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-14 |
| 2. Adjustments | v1.0 | 2/2 | Complete | 2026-03-14 |
| 3. Crop & Resize | v1.0 | 3/3 | Complete | 2026-03-14 |
| 4. Background Removal Engine | v2.0 | 2/3 | Complete | 2026-03-14 |
| 5. Export & BG Replacement | v2.0 | 2/2 | Complete | 2026-03-14 |
| 6. Sidebar Redesign | v2.0 | 2/2 | Complete | 2026-03-14 |
| 7. Pan and Zoom | v2.0 | 2/2 | Complete | 2026-03-14 |
| 8. BG Removal Bug Fixes | v2.0 | 1/1 | Complete | 2026-03-14 |
| 9. Worker Lifecycle & Dead Code | v2.0 | 1/1 | Complete | 2026-03-15 |
| 10. Restore Status Fix | v2.0 | 1/1 | Complete | 2026-03-15 |
| 11. Blur, Sharpen, Safari | v3.0 | 2/2 | Complete | 2026-03-15 |
| 12. Preset Filters | 1/2 | In Progress|  | - |
| 13. Text Overlay | v3.0 | 0/TBD | Not started | - |
| 14. Drawing and Annotation | v3.0 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-03-14 (v1.0), updated for v2.0 2026-03-14, updated for v3.0 2026-03-14*
*Last updated: 2026-03-15*
