---
phase: 7
slug: pan-and-zoom
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x + @testing-library/react 16.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | PZ-08 | unit | `npx vitest run src/__tests__/panZoom.test.ts -t "store"` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | PZ-01, PZ-02, PZ-03 | unit | `npx vitest run src/__tests__/panZoom.test.ts -t "zoom"` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 1 | PZ-04, PZ-05 | unit | `npx vitest run src/__tests__/panZoom.test.ts -t "pan"` | ❌ W0 | ⬜ pending |
| 07-01-04 | 01 | 1 | PZ-06 | unit | `npx vitest run src/__tests__/panZoom.test.ts -t "reset"` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 1 | PZ-07 | unit | `npx vitest run src/__tests__/panZoom.test.ts -t "zoom controls"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/panZoom.test.ts` — stubs for PZ-01 through PZ-08
- [ ] `src/utils/zoom.ts` — pure zoom math functions (cursor-centered zoom, clamp, fit-to-view) for testability

*Existing test infrastructure (Vitest, testing-library) already installed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Grab/grabbing cursor change | PZ-04 | CSS cursor visual | Hover over canvas when zoomed in — should show grab cursor, grabbing while dragging |
| Touch pinch zoom | PZ-01 | Requires touch device | Two-finger pinch on canvas on mobile device |
| Glassmorphism zoom controls | PZ-07 | Visual styling | Verify floating controls have frosted glass effect matching bottom bar |
| Crop + pan coexistence | N/A | Interaction complexity | Enter crop mode, zoom in, verify drag near handles adjusts crop, drag elsewhere pans |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
