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
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 4 → 5

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-14 |
| 2. Adjustments | v1.0 | 2/2 | Complete | 2026-03-14 |
| 3. Crop & Resize | v1.0 | 3/3 | Complete | 2026-03-14 |
| 4. Background Removal Engine | v2.0 | 0/3 | Not started | - |
| 5. Export and Background Replacement | v2.0 | 0/? | Not started | - |
