---
phase: 05-export-and-background-replacement
plan: 01
subsystem: ui
tags: [canvas, jpeg, png, transparency, export, download]

requires:
  - phase: 04-background-removal
    provides: backgroundRemoved state and backgroundMask ImageData
provides:
  - JPEG white-fill compositing for transparent images
  - Transparency-aware download panel with PNG auto-promotion
  - JPEG transparency warning UI
affects: [05-export-and-background-replacement]

tech-stack:
  added: []
  patterns: [offscreen canvas compositing for format-specific export]

key-files:
  created: []
  modified:
    - src/utils/download.ts
    - src/components/DownloadPanel.tsx
    - src/__tests__/download.test.ts

key-decisions:
  - "White-fill uses second offscreen canvas with drawImage compositing rather than pixel manipulation"
  - "Button order swaps dynamically based on backgroundRemoved state rather than hiding/showing buttons"

patterns-established:
  - "Format-aware export: check format + mask presence before compositing"

requirements-completed: [EXPT-01, EXPT-02, EXPT-03]

duration: 2min
completed: 2026-03-14
---

# Phase 05 Plan 01: Export Transparency Awareness Summary

**JPEG white-fill compositing for background-removed images with auto-PNG promotion and transparency warning in download panel**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-14T20:13:35Z
- **Completed:** 2026-03-14T20:15:37Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- JPEG downloads with background mask now composite onto white canvas instead of browser-default black
- PNG auto-promoted as primary download button when background is removed
- Amber warning displayed below JPEG button when transparency is active
- 3 new tests covering all white-fill behavior paths (9 total download tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add JPEG white-fill to download utility (TDD RED)** - `7c31b11` (test)
2. **Task 1: Add JPEG white-fill to download utility (TDD GREEN)** - `13dbace` (feat)
3. **Task 2: Update DownloadPanel with auto-PNG promotion and JPEG warning** - `1590adb` (feat)

## Files Created/Modified
- `src/utils/download.ts` - Added JPEG white-fill compositing when backgroundMask present
- `src/components/DownloadPanel.tsx` - Transparency-aware button ordering, JPEG warning with AlertTriangle icon
- `src/__tests__/download.test.ts` - 3 new tests for JPEG+mask, PNG+mask, JPEG-no-mask scenarios

## Decisions Made
- White-fill uses second offscreen canvas with drawImage compositing rather than pixel-level ImageData manipulation (simpler, leverages GPU)
- Button order swaps dynamically based on backgroundRemoved state rather than conditional rendering of separate layouts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Export transparency handling complete
- Ready for plan 05-02 (background replacement) which depends on this plan's download utility changes

## Self-Check: PASSED

All 3 files verified present. All 3 commit hashes verified in git log.

---
*Phase: 05-export-and-background-replacement*
*Completed: 2026-03-14*
