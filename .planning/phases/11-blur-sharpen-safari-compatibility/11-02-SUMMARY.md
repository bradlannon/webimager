---
phase: 11-blur-sharpen-safari-compatibility
plan: 02
subsystem: ui
tags: [canvas, blur, sharpen, convolution, adjustments, debounce]

# Dependency graph
requires:
  - phase: 11-blur-sharpen-safari-compatibility
    provides: RenderOptions interface, Safari ctx.filter polyfill, refactored renderToCanvas
provides:
  - Blur slider (0-20px) with CSS filter blur via buildFilterString
  - Sharpen slider (0-100%) with 3x3 convolution kernel via applySharpen
  - Debounced slider updates for performance on large images
affects: [12-text-overlays, 13-drawing-tools, 14-undo-redo]

# Tech tracking
tech-stack:
  added: []
  patterns: [unsharp-mask-convolution, debounced-slider-state]

key-files:
  created:
    - src/utils/sharpen.ts
    - src/__tests__/sharpen.test.ts
  modified:
    - src/types/editor.ts
    - src/utils/canvas.ts
    - src/store/editorStore.ts
    - src/components/AdjustmentControls.tsx
    - src/__tests__/canvas.test.ts
    - src/__tests__/editorStore.test.ts

key-decisions:
  - "Sharpen uses 3x3 unsharp mask convolution (getImageData), not CSS filter"
  - "Blur uses CSS filter string (GPU-accelerated) via buildFilterString"
  - "Blur/sharpen sliders use local state + 150ms debounce for smooth drag UX"

patterns-established:
  - "Debounced slider pattern: local useState + useEffect sync + useMemo debounced callback"
  - "Convolution kernel pattern: getImageData/putImageData with edge pixel copying"

requirements-completed: [FILT-01, FILT-02, FILT-05]

# Metrics
duration: 3min
completed: 2026-03-14
---

# Phase 11 Plan 02: Blur and Sharpen Sliders Summary

**Blur (CSS filter, 0-20px) and sharpen (3x3 convolution kernel, 0-100%) sliders with debounced live preview in Adjustments panel**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T02:37:01Z
- **Completed:** 2026-03-15T02:40:24Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Extended Adjustments interface with blur and sharpen fields, updated defaults and store
- Created applySharpen utility with 3x3 unsharp mask convolution kernel (identity interpolation, clamping, alpha preservation, edge copying)
- Added blur(Npx) to buildFilterString CSS filter output for GPU-accelerated blur
- Wired applySharpen into renderToCanvas after drawImage in both crop and no-crop paths
- Added blur and sharpen sliders to AdjustmentControls with 150ms debounced store updates
- All 188 tests pass (12 new tests added)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add blur/sharpen types, store fields, buildFilterString blur, and sharpen utility** - `c11847b` (feat, TDD)
2. **Task 2: Add blur and sharpen sliders to AdjustmentControls with debouncing** - `e67484b` (feat)

## Files Created/Modified
- `src/types/editor.ts` - Added blur/sharpen to Adjustments interface and defaultAdjustments
- `src/utils/sharpen.ts` - New: 3x3 unsharp mask convolution kernel (applySharpen)
- `src/utils/canvas.ts` - Added blur to buildFilterString, wired applySharpen into renderToCanvas
- `src/store/editorStore.ts` - No changes needed (setAdjustment type auto-includes new fields)
- `src/components/AdjustmentControls.tsx` - Added blur (0-20px) and sharpen (0-100%) sliders with debouncing
- `src/__tests__/sharpen.test.ts` - New: 5 tests for convolution identity, clamping, alpha, edges
- `src/__tests__/canvas.test.ts` - Added 3 blur filter string tests
- `src/__tests__/editorStore.test.ts` - Added 4 blur/sharpen default and reset tests

## Decisions Made
- Sharpen implemented as pixel-level 3x3 convolution (getImageData/putImageData) per research findings -- CSS has no sharpen filter
- Blur uses CSS filter string for GPU acceleration -- appended to buildFilterString
- Debounced slider pattern uses local useState for immediate visual feedback with 150ms delayed store update to prevent render pipeline thrashing on large images
- Used ctx.createImageData instead of ImageData constructor for broader environment compatibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used createImageData instead of ImageData constructor**
- **Found during:** Task 1 (sharpen utility tests)
- **Issue:** `new ImageData()` constructor not available in vitest/jsdom test environment
- **Fix:** Changed to `ctx.createImageData(w, h)` + `data.set()` which works in both browser and test environments
- **Files modified:** src/utils/sharpen.ts
- **Verification:** All sharpen tests pass
- **Committed in:** c11847b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor implementation detail change, no behavioral difference.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 11 complete: renderToCanvas refactored, Safari polyfill active, blur and sharpen sliders working
- All 188 tests pass with zero TypeScript errors
- Ready for Phase 12 (text overlays) -- Adjustments interface extensible for future additions

---
*Phase: 11-blur-sharpen-safari-compatibility*
*Completed: 2026-03-14*
