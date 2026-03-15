---
phase: 09-worker-lifecycle-dead-code-cleanup
plan: 01
subsystem: ui
tags: [react, hooks, zustand, background-removal, dead-code]

# Dependency graph
requires:
  - phase: 04-background-removal
    provides: useBackgroundRemoval hook and BackgroundControls component
  - phase: 06-sidebar-redesign
    provides: BottomBar with tab-based panel switching
provides:
  - Persistent background removal hook lifecycle surviving tab switches
  - Clean codebase with no orphaned files or dead store actions
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hook lifting: stateful hooks called in persistent parent, passed as props to child panels"

key-files:
  created: []
  modified:
    - src/components/BottomBar.tsx
    - src/components/BackgroundControls.tsx
    - src/store/editorStore.ts
    - src/__tests__/components.test.tsx
    - src/__tests__/editorStore.test.ts
    - src/__tests__/backgroundRemoval.test.ts

key-decisions:
  - "useBackgroundRemoval lifted to BottomBar and threaded via props through PanelContent to BackgroundControls"

patterns-established:
  - "Hook lifting: long-lived hooks (workers, subscriptions) belong in persistent parents, not tab-switched children"

requirements-completed: [BGREM-02, BGREM-03]

# Metrics
duration: 2min
completed: 2026-03-14
---

# Phase 9 Plan 1: Worker Lifecycle and Dead Code Cleanup Summary

**Lifted useBackgroundRemoval to persistent BottomBar parent, deleted CropToolbar/PrivacyBadge orphans, removed toggleBackground dead store action**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-15T00:29:48Z
- **Completed:** 2026-03-15T00:32:03Z
- **Tasks:** 2
- **Files modified:** 6 (2 deleted, 4 modified)

## Accomplishments
- Background removal worker now survives tab switches (hook lives in persistent BottomBar)
- BackgroundControls refactored to receive bgRemoval state via props instead of calling hook directly
- Deleted 2 orphaned component files (CropToolbar.tsx, PrivacyBadge.tsx)
- Removed toggleBackground dead store action from interface and implementation
- All test references to dead code cleaned up

## Task Commits

Each task was committed atomically:

1. **Task 1: Lift useBackgroundRemoval to BottomBar and refactor BackgroundControls to props** - `c91a87c` (feat)
2. **Task 2: Remove dead code -- CropToolbar, PrivacyBadge, toggleBackground, and update tests** - `a2072b7` (chore)

## Files Created/Modified
- `src/components/BottomBar.tsx` - Added useBackgroundRemoval import/call, threaded bgRemoval prop through PanelContent
- `src/components/BackgroundControls.tsx` - Changed to accept bgRemoval prop, removed direct hook call
- `src/store/editorStore.ts` - Removed toggleBackground from interface and implementation
- `src/components/CropToolbar.tsx` - DELETED (orphaned, zero importers)
- `src/components/PrivacyBadge.tsx` - DELETED (orphaned, only imported in tests)
- `src/__tests__/components.test.tsx` - Removed PrivacyBadge import and describe block
- `src/__tests__/editorStore.test.ts` - Removed toggleBackground test
- `src/__tests__/backgroundRemoval.test.ts` - Updated test description string

## Decisions Made
- useBackgroundRemoval lifted to BottomBar and threaded via props through PanelContent to BackgroundControls (hook-in-persistent-parent pattern)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Codebase is clean with no dead code or orphaned files
- Background removal worker lifecycle is stable across tab switches
- All 177 tests pass, TypeScript compiles clean

---
*Phase: 09-worker-lifecycle-dead-code-cleanup*
*Completed: 2026-03-14*
