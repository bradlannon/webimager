---
phase: 03-crop-resize
plan: 01
subsystem: ui
tags: [canvas, crop, resize, zustand, vitest, tdd]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Canvas render pipeline, transforms, editor store"
  - phase: 02-adjustments
    provides: "Adjustment state and filter pipeline"
provides:
  - "CropRegion, CropPreset, defaultCrop types"
  - "Crop math utilities (cropToPixels, clampCrop, constrainToAspectRatio)"
  - "Resize dimension calculator (calcResizeDimensions)"
  - "CROP_PRESETS array with 9 presets"
  - "Store crop/resize state and actions"
  - "Crop-aware renderToCanvas with offscreen canvas path"
  - "Crop-aware downloadImage"
affects: [03-02, 03-03]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Offscreen canvas for crop extraction with drawImage 9-arg form", "Percentage-based crop coordinates", "TDD RED-GREEN for pure math utilities"]

key-files:
  created:
    - src/utils/crop.ts
    - src/__tests__/crop.test.ts
    - src/__tests__/resize.test.ts
  modified:
    - src/types/editor.ts
    - src/store/editorStore.ts
    - src/utils/canvas.ts
    - src/utils/download.ts
    - src/hooks/useRenderPipeline.ts
    - src/components/DownloadPanel.tsx
    - src/__tests__/editorStore.test.ts
    - src/__tests__/download.test.ts

key-decisions:
  - "Percentage-based crop coordinates (0-100) for resolution independence"
  - "Offscreen canvas approach for crop-after-rotation extraction"
  - "Minimum 20px crop in pixels, 1% minimum in percentage space"
  - "Crop rendered only outside crop mode (full image shown during crop mode for overlay positioning)"

patterns-established:
  - "Crop-aware render: offscreen canvas for rotation, then drawImage 9-arg extraction"
  - "Store crop lifecycle: enter/exit/set/apply/clear with clampCrop validation"

requirements-completed: [CROP-01, CROP-02, TRAN-01]

# Metrics
duration: 4min
completed: 2026-03-14
---

# Phase 3 Plan 1: Crop/Resize Data Layer Summary

**TDD-built crop math (cropToPixels, clampCrop, constrainToAspectRatio), resize calculator, 9 presets, store integration, and crop-aware render pipeline using offscreen canvas + drawImage 9-arg form**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-14T03:37:36Z
- **Completed:** 2026-03-14T03:41:47Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- CropRegion, CropPreset types and 9 aspect ratio presets (Free through 8x10 Print)
- Pure crop math functions with 38 unit tests covering coordinate conversion, clamping, aspect ratio constraint, and resize dimensions
- Store extended with full crop lifecycle (enter/exit/set/apply/clear/applyResize)
- renderToCanvas now uses offscreen canvas path for crop extraction with drawImage 9-arg form
- Download and render pipeline both crop-aware; pipeline shows full image during crop mode

## Task Commits

Each task was committed atomically:

1. **Task 1: Types, crop math, resize calculations (TDD RED)** - `f67c45a` (test)
2. **Task 1: Types, crop math, resize calculations (TDD GREEN)** - `0767f97` (feat)
3. **Task 2: Store, render pipeline, download integration** - `47d292b` (feat)

_Note: Task 1 used TDD with separate RED and GREEN commits_

## Files Created/Modified
- `src/types/editor.ts` - Added CropRegion, CropPreset interfaces, defaultCrop constant
- `src/utils/crop.ts` - cropToPixels, clampCrop, constrainToAspectRatio, calcResizeDimensions, CROP_PRESETS
- `src/__tests__/crop.test.ts` - 24 tests for crop math utilities
- `src/__tests__/resize.test.ts` - 14 tests for resize dimension calculations
- `src/store/editorStore.ts` - cropRegion/cropMode state, 6 new actions including async applyResize
- `src/utils/canvas.ts` - Crop-aware renderToCanvas with offscreen canvas path
- `src/utils/download.ts` - Optional crop parameter passed to renderToCanvas
- `src/hooks/useRenderPipeline.ts` - Passes crop to renderer only when not in crop mode
- `src/components/DownloadPanel.tsx` - Passes cropRegion to downloadImage
- `src/__tests__/editorStore.test.ts` - 8 new crop mode tests
- `src/__tests__/download.test.ts` - Updated assertion for new crop parameter

## Decisions Made
- Percentage-based crop coordinates (0-100) for resolution independence across display scaling
- Offscreen canvas approach for crop extraction after rotation (simpler than inverse coordinate transforms, bounded by existing 16.7M pixel limit)
- Minimum crop size: 20px enforced in cropToPixels, 1% enforced in clampCrop
- During crop mode, render pipeline shows full image (no crop applied) so overlay can be positioned correctly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing download test assertion**
- **Found during:** Task 2 (store/pipeline integration)
- **Issue:** Existing download test expected 4 args to renderToCanvas, but new crop parameter adds a 5th (undefined)
- **Fix:** Updated assertion to expect undefined as 5th argument
- **Files modified:** src/__tests__/download.test.ts
- **Verification:** All 105 tests pass
- **Committed in:** 47d292b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor test assertion update required by API change. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All crop/resize types, math, and store state ready for UI consumption
- Plans 02 and 03 can build CropOverlay, CropToolbar, and ResizeControls on top of this data layer
- renderToCanvas and downloadImage fully wired for crop output

---
*Phase: 03-crop-resize*
*Completed: 2026-03-14*
