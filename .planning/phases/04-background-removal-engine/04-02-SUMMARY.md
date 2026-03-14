---
phase: 04-background-removal-engine
plan: 02
subsystem: ai
tags: [web-worker, canvas, compositing, background-removal, hooks, react]

# Dependency graph
requires:
  - phase: 04-background-removal-engine
    provides: Web Worker, store state (backgroundRemoved, backgroundMask, toggleBackground)
provides:
  - "useBackgroundRemoval hook with worker lifecycle, progress, cancel"
  - "Mask compositing in renderToCanvas using destination-in"
  - "Background-aware useRenderPipeline (re-renders on mask/toggle changes)"
  - "Background-aware downloadImage (passes mask through to renderToCanvas)"
affects: [04-03, 05-export]

# Tech tracking
tech-stack:
  added: []
  patterns: ["destination-in mask compositing after filters", "Worker lifecycle hook with lazy creation and cleanup"]

key-files:
  created:
    - src/hooks/useBackgroundRemoval.ts
  modified:
    - src/utils/canvas.ts
    - src/hooks/useRenderPipeline.ts
    - src/utils/download.ts
    - src/__tests__/download.test.ts

key-decisions:
  - "Mask compositing uses 3 temp canvases in crop path (source-dims, rotated, cropped) to match exact transform pipeline"
  - "Cancel during download terminates worker and creates fresh one; cancel during inference discards result via ref flag"

patterns-established:
  - "Mask compositing AFTER ctx.filter/ctx.restore to avoid premultiplied alpha fringing"
  - "Worker kept alive between operations for model reuse"

requirements-completed: [BGREM-01, BGREM-02, BGREM-03]

# Metrics
duration: 2min
completed: 2026-03-14
---

# Phase 4 Plan 2: Hook + Pipeline Integration Summary

**useBackgroundRemoval hook for worker lifecycle/progress and destination-in mask compositing in renderToCanvas with identical transform pipeline for rotation/flip/crop**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-14T13:21:45Z
- **Completed:** 2026-03-14T13:23:55Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created useBackgroundRemoval hook managing full worker lifecycle: lazy creation, model download with progress, inference, cancellation, and cleanup on unmount
- Added mask compositing to renderToCanvas using destination-in, applied AFTER filters to avoid premultiplied alpha fringing
- Mask transformed identically to source through rotation, flip, and crop in both crop and no-crop paths
- Wired useRenderPipeline to re-render on backgroundRemoved/backgroundMask state changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useBackgroundRemoval hook** - `f6abc12` (feat)
2. **Task 2: Add mask compositing to render pipeline and download** - `97b2df3` (feat)

## Files Created/Modified
- `src/hooks/useBackgroundRemoval.ts` - Hook for worker communication, progress tracking, cancel, restore
- `src/utils/canvas.ts` - Added backgroundMask param and destination-in compositing to renderToCanvas
- `src/hooks/useRenderPipeline.ts` - Subscribes to backgroundRemoved/backgroundMask, passes mask to renderToCanvas
- `src/utils/download.ts` - Added backgroundMask param, passes through to renderToCanvas
- `src/__tests__/download.test.ts` - Updated assertion for new renderToCanvas parameter

## Decisions Made
- Mask compositing uses temp canvases to apply identical transforms (putImageData at source dims, then rotate/flip, then crop extract) rather than trying to manipulate ImageData directly
- Cancel during download terminates the worker entirely (to abort network request) and creates a fresh one; cancel during inference just sets a ref flag to discard the result when it arrives (inference is ~1-5 seconds)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated download test assertion for new parameter**
- **Found during:** Task 2 (mask compositing)
- **Issue:** Existing download test checked renderToCanvas call with 5 args, now 6 (added backgroundMask)
- **Fix:** Added `undefined` as 6th expected argument in test assertion
- **Files modified:** src/__tests__/download.test.ts
- **Verification:** All 124 tests pass
- **Committed in:** 97b2df3 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minimal -- test assertion update required by signature change. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Hook and pipeline ready for UI controls (Plan 03: BackgroundControls component)
- DownloadPanel needs to pass backgroundMask when calling downloadImage (Plan 03 task)
- All 124 tests pass, TypeScript compiles clean

---
*Phase: 04-background-removal-engine*
*Completed: 2026-03-14*
