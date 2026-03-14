# Roadmap: WebImager

## Overview

WebImager delivers a browser-based image editor in three phases. Phase 1 establishes the non-destructive render pipeline, file I/O, basic transforms, and download -- the architectural skeleton that every subsequent feature plugs into. Phase 2 adds the adjustment panel (brightness, contrast, saturation, greyscale) on top of the proven pipeline. Phase 3 tackles the most complex UI interaction -- free-drag crop with a custom HTML overlay and resize with dimension inputs -- after the core pipeline is stable and validated.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Upload pipeline, canvas renderer, transforms, download, and live preview (completed 2026-03-14)
- [x] **Phase 2: Adjustments** - Brightness, contrast, saturation, and greyscale controls (completed 2026-03-14)
- [x] **Phase 3: Crop & Resize** - Free-drag crop with custom overlay and resize with aspect ratio lock (completed 2026-03-14)

## Phase Details

### Phase 1: Foundation
**Goal**: Users can upload a photo, see it on canvas, rotate/flip it, and download the result -- with the non-destructive render pipeline established from day one
**Depends on**: Nothing (first phase)
**Requirements**: FILE-01, FILE-02, FILE-03, FILE-04, TRAN-02, TRAN-03, UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. User can upload an image via drag-and-drop or file picker and see it rendered on canvas
  2. Oversized images are auto-downscaled on upload and user is notified (no canvas memory crash)
  3. Photos taken on phones display in correct orientation (EXIF correction applied)
  4. User can rotate 90 degrees left/right and flip horizontal/vertical with instant preview
  5. User can download the processed image as JPEG or PNG with quality selection
**Plans:** 3/3 plans complete

Plans:
- [ ] 01-01-PLAN.md — Scaffold project, types, store, render pipeline, and test infrastructure
- [ ] 01-02-PLAN.md — Upload flow (DropZone + image loader) and editor layout (Canvas + Sidebar)
- [ ] 01-03-PLAN.md — Transform controls, download panel, privacy badge, and visual verification

### Phase 2: Adjustments
**Goal**: Users can fine-tune their photo with brightness, contrast, saturation sliders and one-click greyscale -- all with real-time preview
**Depends on**: Phase 1
**Requirements**: ADJT-01, ADJT-02, ADJT-03, ADJT-04
**Success Criteria** (what must be TRUE):
  1. User can drag brightness slider and see the image update in real-time
  2. User can drag contrast and saturation sliders with immediate visual feedback
  3. User can convert image to greyscale with one click and see instant result
  4. All adjustments compose correctly -- user can combine brightness + contrast + saturation and the result reflects all three
**Plans:** 2/2 plans complete

Plans:
- [ ] 02-01-PLAN.md — Adjustment data layer: types, store, render pipeline, unit tests
- [ ] 02-02-PLAN.md — AdjustmentControls UI component, sidebar wiring, visual verification

### Phase 3: Crop & Resize
**Goal**: Users can crop their image with a free-drag selection and resize it by entering dimensions -- completing the full editing workflow
**Depends on**: Phase 2
**Requirements**: CROP-01, CROP-02, TRAN-01
**Success Criteria** (what must be TRUE):
  1. User can drag a resizable rectangle on the image and crop to that selection
  2. User can lock crop to aspect ratio presets (16:9, 1:1, 4:3, etc.)
  3. User can enter width and height to resize the image with an aspect ratio lock toggle
  4. Crop and resize produce correct output at full source resolution (not display-scaled)
**Plans:** 3/3 plans complete

Plans:
- [x] 03-01-PLAN.md — Crop/resize data layer: types, math utilities, store, render pipeline (TDD)
- [x] 03-02-PLAN.md — CropOverlay and CropToolbar UI, Canvas/Editor/Sidebar wiring
- [x] 03-03-PLAN.md — ResizeControls UI component and sidebar integration

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete    | 2026-03-14 |
| 2. Adjustments | 2/2 | Complete    | 2026-03-14 |
| 3. Crop & Resize | 3/3 | Complete   | 2026-03-14 |
